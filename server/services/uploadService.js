// Optimized File Upload Service with Streaming
// Implements background processing and progress tracking

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { spawn } from 'child_process';
import { db } from '../config/db.js';
import { uploadToS3, deleteFromS3 } from './storage.js';
import { getIo } from './socket.js';
import { cacheService } from './cacheService.js';
import { mediaService } from './mediaService.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../server/uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Upload queue for background processing
class UploadQueue {
    constructor(concurrency = 3) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }

    add(task) {
        this.queue.push(task);
        this.process();
    }

    process() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;

        const task = this.queue.shift();
        this.running++;

        task().finally(() => {
            this.running--;
            this.process();
        });
    }
}

const uploadQueue = new UploadQueue(3);

// Progress tracking
const uploadProgress = new Map();

export const getUploadProgress = (uploadId) => {
    return uploadProgress.get(uploadId) || { status: 'unknown', progress: 0 };
};

export const processFileUpload = async (file, metadata, userId = null) => {
    const uploadId = metadata.id;
    const eventId = metadata.eventId;
    const isVideo = metadata.type === 'video';


    // Initialize progress tracking
    uploadProgress.set(uploadId, { status: 'processing', progress: 0 });

    try {
        // Check storage limits for registered users
        if (userId) {
            await checkStorageLimits(userId, file.size);
        }

        // Generate file paths
        const ext = path.extname(file.originalname);
        const s3Key = `events/${eventId}/${uploadId}${ext}`;
        const previewKey = isVideo ? `events/${eventId}/preview_${uploadId}.mp4` : `events/${eventId}/thumb_${uploadId}.jpg`;

        // Insert initial record
        await insertMediaRecord(metadata, s3Key, previewKey, userId);

        // Notify clients upload started
        notifyUploadProgress(eventId, uploadId, 'started', 0);

        if (!isVideo) {
            // Process image
            await processImageUpload(file, s3Key, previewKey, eventId, uploadId);
        } else {
            // Process video
            await processVideoUpload(file, s3Key, previewKey, eventId, uploadId);
        }

        // Update storage usage
        if (userId) {
            await updateStorageUsage(userId, file.size);
        }

        // Invalidate caches
        await cacheService.invalidateEventMedia(eventId);
        await cacheService.invalidateUserEvents(userId);

        // Mark as completed
        uploadProgress.set(uploadId, { status: 'completed', progress: 100 });
        notifyUploadProgress(eventId, uploadId, 'completed', 100);

        // Emit media_uploaded event for real-time updates
        const io = getIo();
        if (io) {
            // Get the complete media item from database
            db.get("SELECT * FROM media WHERE id = ?", [uploadId], (err, mediaItem) => {
                if (!err && mediaItem) {
                    // Format the media item for client
                    const formattedItem = {
                        id: mediaItem.id,
                        eventId: mediaItem.eventId,
                        type: mediaItem.type,
                        url: mediaItem.url,
                        previewUrl: mediaItem.previewUrl,
                        caption: mediaItem.caption,
                        uploadedAt: mediaItem.uploadedAt,
                        uploaderName: mediaItem.uploaderName,
                        uploaderId: mediaItem.uploaderId,
                        likes: mediaItem.likes || 0,
                        privacy: mediaItem.privacy || 'public',
                        isWatermarked: !!mediaItem.isWatermarked,
                        watermarkText: mediaItem.watermarkText,
                        isProcessing: false
                    };

                    // Emit to clients in the event room
                    io.to(eventId).emit('media_uploaded', formattedItem);
                }
            });
        }

        return { success: true, uploadId, s3Key, previewKey };

    } catch (error) {

        // Mark as failed
        uploadProgress.set(uploadId, { status: 'failed', progress: 0, error: error.message });

        // Notify clients
        notifyUploadProgress(eventId, uploadId, 'failed', 0, error.message);

        // Cleanup
        await cleanupFailedUpload(uploadId);

        throw error;
    }
};

const checkStorageLimits = async (userId, fileSize) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT storageUsedMb, storageLimitMb FROM users WHERE id = ?", [userId], (err, user) => {
            if (err) return reject(err);
            if (!user) return reject(new Error('User not found'));

            const fileSizeMb = fileSize / (1024 * 1024);
            if (user.storageLimitMb !== -1 && (user.storageUsedMb + fileSizeMb > user.storageLimitMb)) {
                reject(new Error('Storage limit exceeded'));
            } else {
                resolve();
            }
        });
    });
};

const insertMediaRecord = async (metadata, s3Key, previewKey, userId) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO media (id, eventId, type, url, previewUrl, isProcessing, caption, uploadedAt, uploaderName, uploaderId, isWatermarked, watermarkText, likes, privacy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        stmt.run(
            metadata.id,
            metadata.eventId,
            metadata.type,
            s3Key,
            metadata.type === 'video' ? '' : previewKey,
            metadata.type === 'video' ? 1 : 0,
            metadata.caption,
            metadata.uploadedAt,
            metadata.uploaderName,
            userId,
            metadata.isWatermarked === 'true' ? 1 : 0,
            metadata.watermarkText,
            0,
            metadata.privacy || 'public',
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
        stmt.finalize();
    });
};

const processImageUpload = async (file, s3Key, previewKey, eventId, uploadId) => {

    // Create thumbnail
    const previewPath = path.join(uploadDir, `thumb_${uploadId}.jpg`);
    let thumbnailCreated = false;
    let processedBuffer = null;
    let thumbnailBuffer = null;

    try {
        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Read the original file buffer
        const originalBuffer = fs.readFileSync(file.path);

        // Process main image using the GPU/Rust/Sharp pipeline
        try {
            processedBuffer = await mediaService.processImage(originalBuffer, {
                maxWidth: 1920,
                maxHeight: 1080,
                quality: 85,
                format: 'jpeg'
            });
        } catch (processError) {
            console.error(`Image processing failed for ${uploadId}:`, processError);
            throw new Error(`Image processing failed: ${processError.message}`);
        }

        // Create thumbnail using the same pipeline
        try {
            thumbnailBuffer = await mediaService.processImage(originalBuffer, {
                maxWidth: 400,
                maxHeight: 400,
                quality: 80,
                format: 'jpeg'
            });
            thumbnailCreated = true;
        } catch (thumbError) {
            console.warn(`Thumbnail creation failed for ${uploadId}, using fallback:`, thumbError);
            // Fallback: create simple thumbnail with Sharp
            try {
                thumbnailBuffer = await sharp(originalBuffer)
                    .rotate()
                    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toBuffer();
                thumbnailCreated = true;
            } catch (fallbackError) {
                console.error(`Thumbnail fallback also failed for ${uploadId}:`, fallbackError);
                throw new Error(`Thumbnail creation failed: ${fallbackError.message}`);
            }
        }

        // Write processed buffers to temp files for upload
        const processedPath = path.join(uploadDir, `processed_${uploadId}.jpg`);
        fs.writeFileSync(processedPath, processedBuffer);
        fs.writeFileSync(previewPath, thumbnailBuffer);

        // Upload both files in parallel (don't auto-delete, we'll handle cleanup)
        try {
            await Promise.all([
                uploadToS3(processedPath, s3Key, file.mimetype, false),
                uploadToS3(previewPath, previewKey, 'image/jpeg', false)
            ]);
        } catch (s3Error) {
            console.error(`❌ S3 upload failed for ${uploadId}:`, s3Error);
            throw new Error(`Storage upload failed: ${s3Error.message}`);
        }

        // Update progress
        notifyUploadProgress(eventId, uploadId, 'uploading', 75);

        // Emit media_processed event for real-time updates
        const io = getIo();
        if (io) {
            io.to(eventId).emit('media_processed', {
                id: uploadId,
                previewUrl: previewKey,
                url: s3Key
            });
        }

    } catch (error) {
        throw error;
    } finally {
        // Cleanup temp files - only delete if they exist
        try {
            if (thumbnailCreated && fs.existsSync(previewPath)) {
                fs.unlinkSync(previewPath);
            }
            if (processedBuffer && fs.existsSync(path.join(uploadDir, `processed_${uploadId}.jpg`))) {
                fs.unlinkSync(path.join(uploadDir, `processed_${uploadId}.jpg`));
            }
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        } catch (cleanupError) {
        }
    }
};

const processVideoUpload = async (file, s3Key, previewKey, eventId, uploadId) => {

    return new Promise((resolve, reject) => {
        const inputPath = file.path;
        const outputPath = path.join(uploadDir, `preview_${uploadId}.mp4`);

        // Update progress
        notifyUploadProgress(eventId, uploadId, 'processing', 25);


        const ffmpeg = spawn('ffmpeg', [
            '-i', inputPath,
            '-vf', 'scale=-2:720',
            '-c:v', 'libx264',
            '-crf', '23',
            '-preset', 'fast',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y',
            outputPath
        ]);

        // Capture ffmpeg stderr for debugging
        let stderr = '';
        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('close', async (code) => {
            try {
                if (code === 0) {

                    // Upload both files (don't auto-delete, we'll handle cleanup)
                    try {
                        await Promise.all([
                            uploadToS3(inputPath, s3Key, file.mimetype, false),
                            uploadToS3(outputPath, previewKey, 'video/mp4', false)
                        ]);
                    } catch (s3Error) {
                        throw new Error(`Storage upload failed: ${s3Error.message}`);
                    }

                    // Update database
                    db.run("UPDATE media SET isProcessing = 0, previewUrl = ? WHERE id = ?", [previewKey, uploadId]);

                    // Emit media_processed event for real-time updates
                    const io = getIo();
                    if (io) {
                        io.to(eventId).emit('media_processed', {
                            id: uploadId,
                            previewUrl: previewKey,
                            url: s3Key
                        });
                    }

                    // Notify completion
                    notifyUploadProgress(eventId, uploadId, 'completed', 100);

                    resolve();
                } else {
                    throw new Error(`FFmpeg failed with code ${code}`);
                }
            } catch (error) {
                reject(error);
            } finally {
                // Cleanup temp files
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            }
        });

        ffmpeg.on('error', (err) => {
            reject(err);
        });
    });
};

const updateStorageUsage = async (userId, fileSize) => {
    return new Promise((resolve, reject) => {
        const fileSizeMb = fileSize / (1024 * 1024);
        db.run("UPDATE users SET storageUsedMb = storageUsedMb + ? WHERE id = ?", [fileSizeMb, userId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const notifyUploadProgress = (eventId, uploadId, status, progress, error = null) => {
    const io = getIo();
    if (io) {
        io.to(eventId).emit('upload_progress', {
            uploadId,
            status,
            progress,
            error,
            timestamp: Date.now()
        });
    }
};

const cleanupFailedUpload = async (uploadId) => {
    return new Promise((resolve) => {
        db.run("DELETE FROM media WHERE id = ?", [uploadId], () => {
            uploadProgress.delete(uploadId);
            resolve();
        });
    });
};

// Queue-based upload processing
export const queueFileUpload = (file, metadata, userId = null) => {
    return new Promise((resolve, reject) => {
        uploadQueue.add(async () => {
            try {
                const result = await processFileUpload(file, metadata, userId);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    });
};

// Export for use in controllers
export { uploadQueue };
