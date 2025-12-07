// Regenerate missing thumbnails for an event by re-creating them from the originals in S3/MinIO.
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../server/config/db.js';
import { s3Client, uploadToS3 } from '../server/services/storage.js';

const pipe = promisify(pipeline);

const eventId = process.argv[2];
if (!eventId) {
    console.error('Usage: node scripts/regenerate_missing_thumbs.js <eventId>');
    process.exit(1);
}

const tmpDir = '/tmp/snapify-thumb-rebuild';
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
}

const objectExists = async (key) => {
    try {
        await s3Client.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET_NAME || 'snapify-media', Key: key }));
        return true;
    } catch (err) {
        if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return false;
        throw err;
    }
};

const downloadObject = async (key, destPath) => {
    const { Body } = await s3Client.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME || 'snapify-media', Key: key }));
    await pipe(Body, fs.createWriteStream(destPath));
};

const getMediaRows = () => new Promise((resolve, reject) => {
    db.all("SELECT id, url, previewUrl, type FROM media WHERE eventId = ?", [eventId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
    });
});

const regenerate = async () => {
    const rows = await getMediaRows();
    console.log(`Checking ${rows.length} media items for event ${eventId}...`);

    let fixed = 0;
    for (const row of rows) {
        const { id, url, previewUrl, type } = row;
        const hasPreview = await objectExists(previewUrl);
        if (hasPreview) continue;

        console.warn(`Thumbnail missing for ${id}, regenerating...`);

        const ext = path.extname(url) || '.jpg';
        const originalPath = path.join(tmpDir, `orig_${id}${ext}`);
        const thumbPath = path.join(tmpDir, `thumb_${id}.jpg`);

        try {
            await downloadObject(url, originalPath);

            if (type === 'video') {
                console.warn(`Skipping ${id}: video thumbnails not supported by this script.`);
                continue;
            }

            await sharp(originalPath)
                .rotate()
                .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80, progressive: true })
                .toFile(thumbPath);

            await uploadToS3(thumbPath, previewUrl, 'image/jpeg', true);
            fixed++;
            console.log(`✔ Regenerated thumbnail for ${id}`);
        } catch (err) {
            console.error(`Failed to regenerate thumbnail for ${id}:`, err.message);
        } finally {
            [originalPath, thumbPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
        }
    }

    console.log(`Done. Regenerated ${fixed} thumbnails.`);
    process.exit(0);
};

regenerate().catch(err => {
    console.error('Unexpected error while regenerating thumbnails:', err);
    process.exit(1);
});
