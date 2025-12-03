import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../../server/config/env.js';
import { redisService } from '../../server/services/redisService.js';
import { logger } from '../../server/services/loggerService.js';
import { getS3Object, uploadToS3 } from '../../server/services/storage.js';

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
                    ...metadata
                };

                // Cache the media item
                await redisService.set(`media:${mediaItem.id}`, mediaItem, 3600);

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

                // If not in cache, get from database (mock implementation)
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

                // If not in cache, get from database (mock implementation)
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
                // In a real implementation, this would call S3 delete
                logger.info('Deleting media from S3 (mock)', { s3Key: media.s3Key });

                // Delete from database (mock implementation)
                await this.deleteMediaFromDatabase(mediaId);

                // Invalidate cache
                await redisService.del(`media:${mediaId}`);

                res.json({
                    success: true,
                    message: 'Media deleted successfully'
                });

            } catch (error) {
                logger.error('Delete media error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }

    // Database methods (mock implementations)
    async getMediaFromDatabase(mediaId) {
        // Mock data
        return {
            id: mediaId,
            eventId: 'event-123',
            fileName: 'photo.jpg',
            fileType: 'image/jpeg',
            fileSize: 1024,
            s3Key: 'events/event-123/photo.jpg',
            url: '/api/proxy-media?key=events%2Fevent-123%2Fphoto.jpg',
            uploadedAt: new Date().toISOString(),
            status: 'uploaded'
        };
    }

    async getMediaByEventFromDatabase(eventId) {
        // Mock data
        return [
            {
                id: `media-${Date.now()}`,
                eventId,
                fileName: 'photo1.jpg',
                fileType: 'image/jpeg',
                fileSize: 1024,
                s3Key: `events/${eventId}/photo1.jpg`,
                url: `/api/proxy-media?key=${encodeURIComponent(`events/${eventId}/photo1.jpg`)}`,
                uploadedAt: new Date().toISOString(),
                status: 'uploaded'
            },
            {
                id: `media-${Date.now() + 1}`,
                eventId,
                fileName: 'photo2.jpg',
                fileType: 'image/jpeg',
                fileSize: 2048,
                s3Key: `events/${eventId}/photo2.jpg`,
                url: `/api/proxy-media?key=${encodeURIComponent(`events/${eventId}/photo2.jpg`)}`,
                uploadedAt: new Date().toISOString(),
                status: 'uploaded'
            }
        ];
    }

    async deleteMediaFromDatabase(mediaId) {
        // Mock implementation
        logger.info('Media deleted from database (mock)', { mediaId });
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