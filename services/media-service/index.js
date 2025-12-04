import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../../server/config/env.js';
import { redisService } from '../../server/services/redisService.js';
import { logger } from '../../server/services/loggerService.js';
import { db } from '../../server/config/db.js';
import { uploadToS3, deleteFromS3 } from '../../server/services/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MediaService {
    constructor() {
        this.app = express();
        this.uploadDir = path.join(__dirname, 'uploads');
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Ensure upload directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }

        // Security headers
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                service: 'media',
                timestamp: new Date().toISOString()
            });
        });

        // File upload endpoint
        this.app.post('/upload', multer({ dest: this.uploadDir }).single('file'), async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'No file uploaded' });
                }

                const { eventId, metadata = {} } = req.body;

                if (!eventId) {
                    return res.status(400).json({ error: 'Event ID required' });
                }

                // Process the file
                const filePath = req.file.path;
                const fileBuffer = fs.readFileSync(filePath);
                const fileName = `${Date.now()}-${req.file.originalname}`;

                // Upload to S3 (or other storage)
                const s3Key = `events/${eventId}/${fileName}`;
                await uploadToS3(s3Key, fileBuffer, req.file.mimetype);

                // Clean up local file
                fs.unlinkSync(filePath);

                // Create media record
                const mediaItem = {
                    id: `media-${Date.now()}`,
                    eventId,
                    fileName: req.file.originalname,
                    fileType: req.file.mimetype,
                    fileSize: req.file.size,
                    s3Key,
                    url: `/api/proxy-media?key=${encodeURIComponent(s3Key)}`,
                    uploadedAt: new Date().toISOString(),
                    status: 'uploaded',
                    uploaderName: metadata.uploaderName || 'Anonymous',
                    uploaderId: metadata.uploaderId || 'anonymous',
                    caption: metadata.caption || '',
                    privacy: metadata.privacy || 'public',
                    isWatermarked: metadata.isWatermarked || false,
                    watermarkText: metadata.watermarkText || '',
                    likes: 0,
                    isProcessing: false
                };

                // Save to database
                await this.saveMedia(mediaItem);

                // Cache the media item
                await redisService.set(`media:${mediaItem.id}`, mediaItem, 3600);

                // Update event media count
                await this.incrementEventMediaCount(eventId);

                res.json({
                    success: true,
                    media: mediaItem
                });

            } catch (error) {
                logger.error('File upload error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get media by ID
        this.app.get('/:mediaId', async (req, res) => {
            try {
                const { mediaId } = req.params;

                // Try to get from cache first
                const cachedMedia = await redisService.get(`media:${mediaId}`);
                if (cachedMedia) {
                    return res.json({
                        success: true,
                        media: cachedMedia
                    });
                }

                // If not in cache, get from database
                const media = await this.getMediaFromDatabase(mediaId);
                if (!media) {
                    return res.status(404).json({ error: 'Media not found' });
                }

                // Cache the result
                await redisService.set(`media:${mediaId}`, media, 3600);

                res.json({
                    success: true,
                    media
                });

            } catch (error) {
                logger.error('Get media error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get media by event ID
        this.app.get('/event/:eventId', async (req, res) => {
            try {
                const { eventId } = req.params;

                // Try to get from cache first
                const cacheKey = `event_media:${eventId}`;
                const cachedMedia = await redisService.get(cacheKey);
                if (cachedMedia) {
                    return res.json({
                        success: true,
                        media: cachedMedia
                    });
                }

                // If not in cache, get from database
                const media = await this.getMediaByEventFromDatabase(eventId);

                // Cache the result
                await redisService.set(cacheKey, media, 300);

                res.json({
                    success: true,
                    media
                });

            } catch (error) {
                logger.error('Get event media error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Delete media
        this.app.delete('/:mediaId', async (req, res) => {
            try {
                const { mediaId } = req.params;

                // Get media item first
                const media = await this.getMediaFromDatabase(mediaId);
                if (!media) {
                    return res.status(404).json({ error: 'Media not found' });
                }

                // Delete from S3
                try {
                    if (media.url) await deleteFromS3(media.url);
                    if (media.previewUrl) await deleteFromS3(media.previewUrl);
                } catch (e) {
                    logger.error('Failed to delete media from S3:', { error: e.message });
                }

                // Delete from database
                await this.deleteMediaFromDatabase(mediaId);

                // Invalidate cache
                await redisService.del(`media:${mediaId}`);

                // Update event media count
                await this.decrementEventMediaCount(media.eventId);

                res.json({
                    success: true,
                    message: 'Media deleted successfully'
                });

            } catch (error) {
                logger.error('Delete media error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Bulk delete media
        this.app.post('/bulk-delete', async (req, res) => {
            try {
                const { mediaIds } = req.body;

                if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
                    return res.status(400).json({ error: "No media IDs provided" });
                }

                let deletedCount = 0;

                // Process each media item
                for (const mediaId of mediaIds) {
                    try {
                        // Get media item
                        const media = await this.getMediaFromDatabase(mediaId);
                        if (!media) continue;

                        // Delete from S3
                        try {
                            if (media.url) await deleteFromS3(media.url);
                            if (media.previewUrl) await deleteFromS3(media.previewUrl);
                        } catch (e) {
                            logger.error('Failed to delete media from S3:', { error: e.message });
                        }

                        // Delete from database
                        await this.deleteMediaFromDatabase(mediaId);

                        // Invalidate cache
                        await redisService.del(`media:${mediaId}`);

                        // Update event media count
                        await this.decrementEventMediaCount(media.eventId);

                        deletedCount++;
                    } catch (error) {
                        logger.error(`Failed to delete media ${mediaId}:`, { error: error.message });
                    }
                }

                res.json({
                    success: true,
                    deletedCount
                });

            } catch (error) {
                logger.error('Bulk delete media error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Like media
        this.app.put('/:mediaId/like', async (req, res) => {
            try {
                const { mediaId } = req.params;

                // Increment like count
                await this.incrementMediaLikes(mediaId);

                // Invalidate cache
                await redisService.del(`media:${mediaId}`);

                res.json({
                    success: true,
                    message: 'Media liked successfully'
                });

            } catch (error) {
                logger.error('Like media error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }

    // Database methods
    async saveMedia(media) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO media (id, eventId, fileName, fileType, fileSize, s3Key, url, uploadedAt, status, uploaderName, uploaderId, caption, privacy, isWatermarked, watermarkText, likes, isProcessing) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    media.id,
                    media.eventId,
                    media.fileName,
                    media.fileType,
                    media.fileSize,
                    media.s3Key,
                    media.url,
                    media.uploadedAt,
                    media.status,
                    media.uploaderName,
                    media.uploaderId,
                    media.caption,
                    media.privacy,
                    media.isWatermarked ? 1 : 0,
                    media.watermarkText,
                    media.likes,
                    media.isProcessing ? 1 : 0
                ],
                function (err) {
                    if (err) {
                        logger.error('Database error in saveMedia:', { error: err.message });
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    async getMediaFromDatabase(mediaId) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM media WHERE id = ?', [mediaId], (err, row) => {
                if (err) {
                    logger.error('Database error in getMediaFromDatabase:', { error: err.message });
                    return reject(err);
                }
                resolve(row);
            });
        });
    }

    async getMediaByEventFromDatabase(eventId) {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM media WHERE eventId = ? ORDER BY uploadedAt DESC', [eventId], (err, rows) => {
                if (err) {
                    logger.error('Database error in getMediaByEventFromDatabase:', { error: err.message });
                    return reject(err);
                }
                resolve(rows || []);
            });
        });
    }

    async deleteMediaFromDatabase(mediaId) {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM media WHERE id = ?', [mediaId], function (err) {
                if (err) {
                    logger.error('Database error in deleteMediaFromDatabase:', { error: err.message });
                    return reject(err);
                }
                resolve();
            });
        });
    }

    async incrementMediaLikes(mediaId) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE media SET likes = likes + 1 WHERE id = ?',
                [mediaId],
                function (err) {
                    if (err) {
                        logger.error('Database error in incrementMediaLikes:', { error: err.message });
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    async incrementEventMediaCount(eventId) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE events SET mediaCount = mediaCount + 1 WHERE id = ?',
                [eventId],
                function (err) {
                    if (err) {
                        logger.error('Database error in incrementEventMediaCount:', { error: err.message });
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    async decrementEventMediaCount(eventId) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE events SET mediaCount = mediaCount - 1 WHERE id = ? AND mediaCount > 0',
                [eventId],
                function (err) {
                    if (err) {
                        logger.error('Database error in decrementEventMediaCount:', { error: err.message });
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    // Start the service
    start(port = 3003) {
        return new Promise((resolve) => {
            this.app.listen(port, () => {
                logger.info(`Media Service running on port ${port}`);
                resolve();
            });
        });
    }
}

export const mediaService = new MediaService();
export default mediaService;