import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { Queue } from 'bull';
import { redisCache } from '../utils/redis_cache.js';
import { dbPool } from '../config/db_pool.js';
import { uploadToS3 } from './storage.js';
import { getIo } from './socket.js';
import mime from 'mime-types';
import sharp from 'sharp';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_CONCURRENT_UPLOADS = 5;
const MAX_RETRIES = 3;
const TEMP_DIR = path.join(__dirname, '../../server/uploads/chunks');
const COMPLETED_DIR = path.join(__dirname, '../../server/uploads/completed');

// Ensure directories exist
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}
if (!fs.existsSync(COMPLETED_DIR)) {
    fs.mkdirSync(COMPLETED_DIR, { recursive: true });
}

// File processing queue using Bull
const fileProcessingQueue = new Queue('fileProcessing', {
    redis: config.REDIS_URL || 'redis://localhost:6379',
    limiter: {
        max: MAX_CONCURRENT_UPLOADS,
        duration: 1000
    },
    settings: {
        lockDuration: 30000, // 30 seconds lock
        stalledInterval: 60000, // 1 minute stalled check
        maxStalledCount: 3
    }
});

// Track upload sessions
const uploadSessions = new Map();

// File type detection with magic numbers and MIME types
const FILE_SIGNATURES = {
    // Images
    'image/jpeg': ['FFD8FF'],
    'image/png': ['89504E47'],
    'image/gif': ['47494638'],
    'image/webp': ['52494646'],
    'image/avif': ['66747970'],
    // Videos
    'video/mp4': ['66747970'],
    'video/webm': ['1A45DFA3'],
    'video/quicktime': ['6D6F6F76']
};

class ChunkedUploadService {
    constructor() {
        this.setupQueueProcessors();
        this.setupCleanup();
    }

    setupQueueProcessors() {
        // Process file uploads
        fileProcessingQueue.process('processUpload', async (job) => {
            const { uploadId, filePath, metadata } = job.data;
            return this.processUploadJob(uploadId, filePath, metadata);
        });

        // Process file conversions
        fileProcessingQueue.process('processConversion', async (job) => {
            const { uploadId, filePath, targetFormat, quality } = job.data;
            return this.processConversionJob(uploadId, filePath, targetFormat, quality);
        });

        // Handle failed jobs
        fileProcessingQueue.on('failed', (job, err) => {
            console.error(`Job ${job.id} failed:`, err);
            this.handleUploadFailure(job.data.uploadId, err);
        });

        // Handle completed jobs
        fileProcessingQueue.on('completed', (job) => {
            console.log(`Job ${job.id} completed successfully`);
            this.handleUploadSuccess(job.data.uploadId);
        });
    }

    setupCleanup() {
        // Clean up old temp files every hour
        setInterval(() => {
            this.cleanupOldFiles(TEMP_DIR, 3600000); // 1 hour
        }, 3600000);
    }

    async cleanupOldFiles(directory, maxAge) {
        try {
            const files = fs.readdirSync(directory);
            const now = Date.now();

            files.forEach(file => {
                const filePath = path.join(directory, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up old file: ${filePath}`);
                }
            });
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    // Start a new chunked upload session
    async startUploadSession(fileName, fileSize, fileType, metadata) {
        const uploadId = uuidv4();
        const session = {
            uploadId,
            fileName,
            fileSize,
            fileType: this.detectFileType(fileName, fileType),
            receivedBytes: 0,
            chunks: [],
            metadata: {
                eventId: metadata.eventId,
                uploaderId: metadata.uploaderId,
                uploaderName: metadata.uploaderName,
                caption: metadata.caption,
                ...metadata
            },
            startedAt: Date.now(),
            lastActivity: Date.now(),
            status: 'initiated'
        };

        uploadSessions.set(uploadId, session);
        console.log(`✓ Started upload session ${uploadId} for ${fileName} (${fileSize} bytes)`);

        return { uploadId, status: 'initiated' };
    }

    // Upload a chunk
    async uploadChunk(uploadId, chunkIndex, chunkData, totalChunks) {
        if (!uploadSessions.has(uploadId)) {
            throw new Error('Upload session not found');
        }

        const session = uploadSessions.get(uploadId);

        // Validate chunk
        if (chunkIndex < 0 || chunkIndex >= totalChunks) {
            throw new Error('Invalid chunk index');
        }

        if (session.receivedBytes + chunkData.length > session.fileSize) {
            throw new Error('Chunk exceeds expected file size');
        }

        // Write chunk to temp file
        const chunkFilePath = path.join(TEMP_DIR, `${uploadId}_${chunkIndex}`);
        await fs.promises.writeFile(chunkFilePath, chunkData);

        // Update session
        session.receivedBytes += chunkData.length;
        session.chunks.push(chunkIndex);
        session.lastActivity = Date.now();

        // Check if all chunks are received
        const allChunksReceived = session.chunks.length === totalChunks;

        if (allChunksReceived) {
            session.status = 'chunks_received';
            console.log(`✓ All chunks received for ${uploadId}, ready for assembly`);
        } else {
            console.log(`✓ Chunk ${chunkIndex}/${totalChunks} received for ${uploadId} (${session.receivedBytes}/${session.fileSize} bytes)`);
        }

        return {
            uploadId,
            chunkIndex,
            totalChunks,
            receivedBytes: session.receivedBytes,
            fileSize: session.fileSize,
            status: allChunksReceived ? 'ready_for_assembly' : 'chunk_received',
            progress: Math.round((session.receivedBytes / session.fileSize) * 100)
        };
    }

    // Assemble chunks into final file
    async assembleFile(uploadId) {
        if (!uploadSessions.has(uploadId)) {
            throw new Error('Upload session not found');
        }

        const session = uploadSessions.get(uploadId);
        if (session.status !== 'chunks_received') {
            throw new Error('Not all chunks received yet');
        }

        // Sort chunks by index
        const chunkFiles = session.chunks
            .sort((a, b) => a - b)
            .map(index => path.join(TEMP_DIR, `${uploadId}_${index}`));

        const finalFilePath = path.join(COMPLETED_DIR, `${uploadId}_${session.fileName}`);
        const writeStream = fs.createWriteStream(finalFilePath);

        session.status = 'assembling';
        console.log(`🧩 Assembling ${chunkFiles.length} chunks for ${uploadId}`);

        // Stream chunks to final file
        for (const chunkFile of chunkFiles) {
            const readStream = fs.createReadStream(chunkFile);
            await new Promise((resolve, reject) => {
                readStream.pipe(writeStream, { end: false });
                readStream.on('end', () => {
                    fs.unlinkSync(chunkFile); // Clean up chunk file
                    resolve();
                });
                readStream.on('error', reject);
            });
        }

        writeStream.end();
        await new Promise((resolve) => writeStream.on('finish', resolve));

        // Verify file integrity
        const stats = fs.statSync(finalFilePath);
        if (stats.size !== session.fileSize) {
            throw new Error(`File size mismatch: expected ${session.fileSize}, got ${stats.size}`);
        }

        session.assembledFilePath = finalFilePath;
        session.status = 'assembled';
        console.log(`✓ File assembled successfully: ${finalFilePath} (${stats.size} bytes)`);

        return {
            uploadId,
            filePath: finalFilePath,
            fileSize: stats.size,
            fileType: session.fileType,
            status: 'assembled'
        };
    }

    // Process the assembled file
    async processUploadJob(uploadId, filePath, metadata) {
        try {
            const session = uploadSessions.get(uploadId);
            if (!session) {
                throw new Error('Upload session not found');
            }

            session.status = 'processing';
            console.log(`🔧 Processing upload ${uploadId}`);

            // Detect file type if not already detected
            const detectedType = this.detectFileType(filePath) || session.fileType;
            const isImage = detectedType.startsWith('image/');
            const isVideo = detectedType.startsWith('video/');

            // Generate unique IDs
            const fileId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const eventId = metadata.eventId;
            const s3Key = `events/${eventId}/${fileId}${path.extname(session.fileName)}`;
            const previewKey = isVideo
                ? `events/${eventId}/preview_${fileId}.mp4`
                : `events/${eventId}/thumb_${fileId}.jpg`;

            // Process based on file type
            if (isImage) {
                await this.processImage(filePath, s3Key, previewKey, uploadId, metadata);
            } else if (isVideo) {
                await this.processVideo(filePath, s3Key, previewKey, uploadId, metadata);
            } else {
                // For other file types, just upload as-is
                await uploadToS3(filePath, s3Key, detectedType);
            }

            // Save to database
            const mediaData = {
                id: fileId,
                eventId: metadata.eventId,
                type: isImage ? 'image' : isVideo ? 'video' : 'other',
                url: s3Key,
                previewUrl: previewKey,
                caption: metadata.caption || '',
                uploadedAt: new Date().toISOString(),
                uploaderName: metadata.uploaderName,
                uploaderId: metadata.uploaderId,
                isWatermarked: metadata.isWatermarked || false,
                watermarkText: metadata.watermarkText || '',
                likes: 0,
                privacy: metadata.privacy || 'public'
            };

            await this.saveMediaToDatabase(mediaData);

            // Clean up
            this.cleanupUploadSession(uploadId);

            return {
                success: true,
                uploadId,
                mediaId: fileId,
                status: 'completed'
            };

        } catch (error) {
            console.error(`❌ Processing failed for ${uploadId}:`, error);
            throw error;
        }
    }

    async processImage(filePath, s3Key, previewKey, uploadId, metadata) {
        const session = uploadSessions.get(uploadId);
        session.status = 'processing_image';

        // Process with Sharp for optimization
        const image = sharp(filePath);

        // Get metadata for processing decisions
        const { width, height, format } = await image.metadata();

        // Optimize based on format
        let processedBuffer;
        if (format === 'jpeg' || format === 'jpg') {
            processedBuffer = await image
                .jpeg({ quality: 85, progressive: true })
                .toBuffer();
        } else if (format === 'png') {
            processedBuffer = await image
                .png({ quality: 80, compressionLevel: 6 })
                .toBuffer();
        } else {
            // Convert to WebP for better compression
            processedBuffer = await image
                .webp({ quality: 80 })
                .toBuffer();
        }

        // Generate thumbnail
        const thumbnailBuffer = await image
            .resize(400, 400, { fit: 'inside' })
            .jpeg({ quality: 75 })
            .toBuffer();

        // Upload in parallel
        await Promise.all([
            uploadToS3(Buffer.from(processedBuffer), s3Key, `image/${format}`),
            uploadToS3(thumbnailBuffer, previewKey, 'image/jpeg')
        ]);

        // Update progress
        this.notifyProgress(uploadId, 'processing', 75);
    }

    async processVideo(filePath, s3Key, previewKey, uploadId, metadata) {
        const session = uploadSessions.get(uploadId);
        session.status = 'processing_video';

        // For videos, we'll upload the original and generate a preview
        // This is a simplified version - in production you'd use FFmpeg

        // Upload original video
        await uploadToS3(filePath, s3Key, session.fileType);

        // Generate a simple preview (first frame as thumbnail)
        // In a real implementation, you'd extract a frame using FFmpeg
        const thumbnailBuffer = await sharp({
            create: {
                width: 400,
                height: 300,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 1 }
            }
        })
            .png()
            .toBuffer();

        await uploadToS3(thumbnailBuffer, previewKey, 'image/png');

        // Update progress
        this.notifyProgress(uploadId, 'processing', 75);
    }

    async saveMediaToDatabase(mediaData) {
        const query = `
            INSERT INTO media
            (id, eventId, type, url, previewUrl, caption, uploadedAt, uploaderName, uploaderId, isWatermarked, watermarkText, likes, privacy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            mediaData.id,
            mediaData.eventId,
            mediaData.type,
            mediaData.url,
            mediaData.previewUrl,
            mediaData.caption,
            mediaData.uploadedAt,
            mediaData.uploaderName,
            mediaData.uploaderId,
            mediaData.isWatermarked ? 1 : 0,
            mediaData.watermarkText,
            mediaData.likes,
            mediaData.privacy
        ];

        await dbPool.executeRun(query, params);
        console.log(`✓ Saved media ${mediaData.id} to database`);
    }

    // Convert file to different format (e.g., WebP, AVIF)
    async processConversionJob(uploadId, filePath, targetFormat, quality = 80) {
        try {
            const session = uploadSessions.get(uploadId);
            if (!session) {
                throw new Error('Upload session not found');
            }

            session.status = `converting_to_${targetFormat}`;

            const image = sharp(filePath);
            let convertedBuffer;

            if (targetFormat === 'webp') {
                convertedBuffer = await image.webp({ quality }).toBuffer();
            } else if (targetFormat === 'avif') {
                convertedBuffer = await image.avif({ quality }).toBuffer();
            } else {
                throw new Error(`Unsupported target format: ${targetFormat}`);
            }

            // Generate output path
            const outputPath = path.join(COMPLETED_DIR, `${uploadId}_${targetFormat}.${targetFormat}`);
            await fs.promises.writeFile(outputPath, convertedBuffer);

            return {
                success: true,
                uploadId,
                outputPath,
                format: targetFormat,
                size: convertedBuffer.length
            };

        } catch (error) {
            console.error(`❌ Conversion failed for ${uploadId}:`, error);
            throw error;
        }
    }

    // Intelligent file type detection
    detectFileType(filePathOrName, declaredType = null) {
        try {
            // If we have a file path, read the magic numbers
            if (fs.existsSync(filePathOrName)) {
                const buffer = Buffer.alloc(8);
                const fd = fs.openSync(filePathOrName, 'r');
                fs.readSync(fd, buffer, 0, 8, 0);
                fs.closeSync(fd);

                const hexSignature = buffer.toString('hex').toUpperCase();

                // Check against known signatures
                for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
                    if (signatures.some(sig => hexSignature.startsWith(sig))) {
                        console.log(`🔍 Detected file type via signature: ${mimeType}`);
                        return mimeType;
                    }
                }
            }

            // Fallback to extension-based detection
            const ext = path.extname(filePathOrName).toLowerCase().substring(1);
            const mimeType = mime.lookup(ext);

            if (mimeType) {
                console.log(`🔍 Detected file type via extension: ${mimeType}`);
                return mimeType;
            }

            // Fallback to declared type if provided
            if (declaredType) {
                console.log(`🔍 Using declared file type: ${declaredType}`);
                return declaredType;
            }

            // Default fallback
            console.warn(`⚠️ Could not detect file type for ${filePathOrName}, defaulting to application/octet-stream`);
            return 'application/octet-stream';

        } catch (error) {
            console.error('File type detection error:', error);
            return declaredType || 'application/octet-stream';
        }
    }

    // Get upload status
    getUploadStatus(uploadId) {
        const session = uploadSessions.get(uploadId);
        if (!session) {
            return {
                uploadId,
                status: 'not_found',
                progress: 0,
                error: 'Upload session not found'
            };
        }

        return {
            uploadId,
            status: session.status,
            progress: session.fileSize > 0
                ? Math.round((session.receivedBytes / session.fileSize) * 100)
                : 0,
            receivedBytes: session.receivedBytes,
            fileSize: session.fileSize,
            fileName: session.fileName,
            fileType: session.fileType,
            chunksReceived: session.chunks.length,
            lastActivity: session.lastActivity,
            startedAt: session.startedAt
        };
    }

    // Cancel upload
    cancelUpload(uploadId) {
        const session = uploadSessions.get(uploadId);
        if (!session) {
            return { success: false, error: 'Upload session not found' };
        }

        // Clean up any temp files
        session.chunks.forEach(chunkIndex => {
            const chunkFilePath = path.join(TEMP_DIR, `${uploadId}_${chunkIndex}`);
            if (fs.existsSync(chunkFilePath)) {
                fs.unlinkSync(chunkFilePath);
            }
        });

        // Remove session
        uploadSessions.delete(uploadId);

        return { success: true, uploadId };
    }

    // Clean up upload session
    cleanupUploadSession(uploadId) {
        const session = uploadSessions.get(uploadId);
        if (!session) return;

        // Clean up temp files
        if (session.chunks) {
            session.chunks.forEach(chunkIndex => {
                const chunkFilePath = path.join(TEMP_DIR, `${uploadId}_${chunkIndex}`);
                if (fs.existsSync(chunkFilePath)) {
                    fs.unlinkSync(chunkFilePath);
                }
            });
        }

        // Clean up assembled file if it exists
        if (session.assembledFilePath && fs.existsSync(session.assembledFilePath)) {
            fs.unlinkSync(session.assembledFilePath);
        }

        // Remove session
        uploadSessions.delete(uploadId);
        console.log(`🧹 Cleaned up upload session ${uploadId}`);
    }

    // Notify progress via Socket.IO
    notifyProgress(uploadId, status, progress, error = null) {
        const session = uploadSessions.get(uploadId);
        if (!session || !session.metadata?.eventId) return;

        const io = getIo();
        if (io) {
            io.to(session.metadata.eventId).emit('upload_progress', {
                uploadId,
                status,
                progress,
                error,
                fileName: session.fileName,
                fileSize: session.fileSize
            });
        }
    }

    // Handle upload failure
    handleUploadFailure(uploadId, error) {
        const session = uploadSessions.get(uploadId);
        if (session) {
            session.status = 'failed';
            session.error = error.message;
            this.notifyProgress(uploadId, 'failed', 0, error.message);
        }
    }

    // Handle upload success
    handleUploadSuccess(uploadId) {
        const session = uploadSessions.get(uploadId);
        if (session) {
            session.status = 'completed';
            this.notifyProgress(uploadId, 'completed', 100);
        }
    }

    // Queue file for background processing
    async queueFileProcessing(uploadId, filePath, metadata) {
        try {
            await fileProcessingQueue.add('processUpload', {
                uploadId,
                filePath,
                metadata
            }, {
                attempts: MAX_RETRIES,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            });

            return { success: true, uploadId, status: 'queued' };
        } catch (error) {
            console.error('Failed to queue file processing:', error);
            return { success: false, error: error.message };
        }
    }

    // Queue file conversion
    async queueFileConversion(uploadId, filePath, targetFormat, quality = 80) {
        try {
            await fileProcessingQueue.add('processConversion', {
                uploadId,
                filePath,
                targetFormat,
                quality
            }, {
                attempts: MAX_RETRIES,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            });

            return { success: true, uploadId, format: targetFormat, status: 'queued' };
        } catch (error) {
            console.error('Failed to queue file conversion:', error);
            return { success: false, error: error.message };
        }
    }

    // Get queue statistics
    async getQueueStats() {
        try {
            const counts = await fileProcessingQueue.getJobCounts();
            const isPaused = await fileProcessingQueue.isPaused();

            return {
                waiting: counts.waiting,
                active: counts.active,
                completed: counts.completed,
                failed: counts.failed,
                delayed: counts.delayed,
                isPaused,
                queueName: fileProcessingQueue.name
            };
        } catch (error) {
            console.error('Failed to get queue stats:', error);
            return {
                error: error.message,
                queueName: fileProcessingQueue.name
            };
        }
    }
}

// Singleton instance
const chunkedUploadService = new ChunkedUploadService();

export {
    chunkedUploadService,
    fileProcessingQueue,
    CHUNK_SIZE,
    MAX_CONCURRENT_UPLOADS
};