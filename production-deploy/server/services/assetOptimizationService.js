import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { Queue } from 'bull';
import { redisCache } from '../utils/redis_cache.js';
import { uploadToS3, getS3Object } from './storage.js';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ASSET_OPTIMIZATION_QUEUE = 'assetOptimization';
const MAX_CONCURRENT_JOBS = 4;
const TEMP_DIR = path.join(__dirname, '../../server/uploads/optimized');
const CACHE_DIR = path.join(__dirname, '../../server/uploads/cache');

// Ensure directories exist
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Asset optimization queue
const assetOptimizationQueue = new Queue(ASSET_OPTIMIZATION_QUEUE, {
    redis: config.REDIS_URL || 'redis://localhost:6379',
    limiter: {
        max: MAX_CONCURRENT_JOBS,
        duration: 1000
    },
    settings: {
        lockDuration: 60000, // 1 minute lock
        stalledInterval: 120000, // 2 minute stalled check
        maxStalledCount: 2
    }
});

// Supported formats and their configurations
const FORMAT_CONFIGS = {
    webp: {
        quality: 80,
        effort: 4,
        alphaQuality: 100,
        lossless: false
    },
    avif: {
        quality: 70,
        effort: 4,
        chromaSubsampling: '4:2:0'
    },
    jpeg: {
        quality: 85,
        progressive: true,
        optimizeScans: true
    },
    png: {
        quality: 80,
        compressionLevel: 6,
        adaptiveFiltering: true
    }
};

// Responsive image breakpoints
const RESPONSIVE_BREAKPOINTS = [
    { width: 400, suffix: '_sm' },   // Small devices
    { width: 800, suffix: '_md' },   // Medium devices
    { width: 1200, suffix: '_lg' },  // Large devices
    { width: 1920, suffix: '_xl' }   // Extra large devices
];

// Network conditions for adaptive loading
const NETWORK_CONDITIONS = {
    slow: { maxSize: 500000 },    // 500KB for slow networks
    medium: { maxSize: 2000000 },  // 2MB for medium networks
    fast: { maxSize: 5000000 }     // 5MB for fast networks
};

class AssetOptimizationService {
    constructor() {
        this.setupQueueProcessors();
        this.setupCacheCleanup();
    }

    setupQueueProcessors() {
        // Process asset optimization jobs
        assetOptimizationQueue.process('optimizeAsset', async (job) => {
            return this.processOptimizationJob(job.data);
        });

        // Process responsive image generation
        assetOptimizationQueue.process('generateResponsive', async (job) => {
            return this.processResponsiveJob(job.data);
        });

        // Process format conversion
        assetOptimizationQueue.process('convertFormat', async (job) => {
            return this.processConversionJob(job.data);
        });

        // Handle failed jobs
        assetOptimizationQueue.on('failed', (job, err) => {
            console.error(`Asset optimization job ${job.id} failed:`, err);
        });

        // Handle completed jobs
        assetOptimizationQueue.on('completed', (job) => {
            console.log(`Asset optimization job ${job.id} completed`);
        });
    }

    setupCacheCleanup() {
        // Clean up old cache files every 6 hours
        setInterval(() => {
            this.cleanupOldFiles(TEMP_DIR, 21600000); // 6 hours
            this.cleanupOldFiles(CACHE_DIR, 21600000); // 6 hours
        }, 21600000);
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
                    console.log(`🧹 Cleaned up old asset file: ${filePath}`);
                }
            });
        } catch (error) {
            console.error('Asset cleanup error:', error);
        }
    }

    // Main asset optimization function
    async optimizeAsset(assetId, originalPath, options = {}) {
        try {
            const jobId = uuidv4();
            const jobData = {
                assetId,
                originalPath,
                options: {
                    formats: options.formats || ['webp', 'avif'],
                    responsive: options.responsive !== false,
                    quality: options.quality || 'high',
                    ...options
                },
                jobId
            };

            await assetOptimizationQueue.add('optimizeAsset', jobData, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            });

            return {
                success: true,
                jobId,
                assetId,
                status: 'queued'
            };
        } catch (error) {
            console.error('Failed to queue asset optimization:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Process optimization job
    async processOptimizationJob({ assetId, originalPath, options }) {
        try {
            console.log(`🎨 Starting optimization for asset ${assetId}`);

            const results = {
                original: { path: originalPath, size: fs.statSync(originalPath).size },
                optimized: []
            };

            // Get original file info
            const originalStats = fs.statSync(originalPath);
            const fileExt = path.extname(originalPath).toLowerCase();
            const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(fileExt);

            if (!isImage) {
                console.log(`⚠️ Skipping optimization for non-image asset: ${originalPath}`);
                return { ...results, skipped: true };
            }

            // Process each target format
            for (const format of options.formats) {
                if (FORMAT_CONFIGS[format]) {
                    const optimizedResult = await this.optimizeForFormat(
                        assetId, originalPath, format, options
                    );
                    results.optimized.push(optimizedResult);
                }
            }

            // Generate responsive versions if requested
            if (options.responsive) {
                const responsiveResults = await this.generateResponsiveVersions(
                    assetId, originalPath, options
                );
                results.responsive = responsiveResults;
            }

            console.log(`✅ Completed optimization for ${assetId}`);
            return results;

        } catch (error) {
            console.error(`❌ Optimization failed for ${assetId}:`, error);
            throw error;
        }
    }

    // Optimize for specific format
    async optimizeForFormat(assetId, originalPath, format, options) {
        try {
            const formatConfig = FORMAT_CONFIGS[format];
            const outputPath = path.join(TEMP_DIR, `${assetId}_${format}${path.extname(originalPath)}`);

            // Read original image
            const image = sharp(originalPath);

            // Apply format-specific optimization
            let optimizedBuffer;
            switch (format) {
                case 'webp':
                    optimizedBuffer = await image
                        .webp({
                            quality: formatConfig.quality,
                            effort: formatConfig.effort,
                            alphaQuality: formatConfig.alphaQuality
                        })
                        .toBuffer();
                    break;

                case 'avif':
                    optimizedBuffer = await image
                        .avif({
                            quality: formatConfig.quality,
                            effort: formatConfig.effort,
                            chromaSubsampling: formatConfig.chromaSubsampling
                        })
                        .toBuffer();
                    break;

                case 'jpeg':
                    optimizedBuffer = await image
                        .jpeg({
                            quality: formatConfig.quality,
                            progressive: formatConfig.progressive,
                            optimizeScans: formatConfig.optimizeScans
                        })
                        .toBuffer();
                    break;

                case 'png':
                    optimizedBuffer = await image
                        .png({
                            quality: formatConfig.quality,
                            compressionLevel: formatConfig.compressionLevel,
                            adaptiveFiltering: formatConfig.adaptiveFiltering
                        })
                        .toBuffer();
                    break;

                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            // Write optimized file
            await fs.promises.writeFile(outputPath, optimizedBuffer);

            // Calculate savings
            const originalSize = fs.statSync(originalPath).size;
            const optimizedSize = optimizedBuffer.length;
            const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);

            console.log(`📉 Optimized ${format}: ${originalSize} → ${optimizedSize} bytes (${savings}% savings)`);

            return {
                format,
                path: outputPath,
                size: optimizedSize,
                originalSize,
                savings: parseFloat(savings),
                quality: options.quality
            };

        } catch (error) {
            console.error(`❌ Failed to optimize for ${format}:`, error);
            throw error;
        }
    }

    // Generate responsive versions
    async generateResponsiveVersions(assetId, originalPath, options) {
        try {
            const results = [];
            const image = sharp(originalPath);
            const { width: originalWidth } = await image.metadata();

            for (const breakpoint of RESPONSIVE_BREAKPOINTS) {
                // Skip if original is smaller than breakpoint
                if (originalWidth <= breakpoint.width) {
                    continue;
                }

                const outputPath = path.join(
                    TEMP_DIR,
                    `${assetId}${breakpoint.suffix}${path.extname(originalPath)}`
                );

                // Resize while maintaining aspect ratio
                const resizedBuffer = await image
                    .resize(breakpoint.width, null, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .toBuffer();

                await fs.promises.writeFile(outputPath, resizedBuffer);

                results.push({
                    breakpoint: breakpoint.width,
                    suffix: breakpoint.suffix,
                    path: outputPath,
                    size: resizedBuffer.length,
                    width: breakpoint.width
                });

                console.log(`📐 Generated responsive version: ${breakpoint.width}w`);
            }

            return results;

        } catch (error) {
            console.error('❌ Failed to generate responsive versions:', error);
            throw error;
        }
    }

    // Convert asset format
    async convertFormat(assetId, originalPath, targetFormat, quality = 'medium') {
        try {
            const jobData = {
                assetId,
                originalPath,
                targetFormat,
                quality,
                jobId: uuidv4()
            };

            await assetOptimizationQueue.add('convertFormat', jobData, {
                attempts: 2,
                backoff: {
                    type: 'fixed',
                    delay: 1000
                }
            });

            return {
                success: true,
                jobId: jobData.jobId,
                assetId,
                targetFormat,
                status: 'queued'
            };
        } catch (error) {
            console.error('Failed to queue format conversion:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Process conversion job
    async processConversionJob({ assetId, originalPath, targetFormat, quality }) {
        try {
            console.log(`🔄 Converting ${assetId} to ${targetFormat} (${quality} quality)`);

            const formatConfig = FORMAT_CONFIGS[targetFormat];
            if (!formatConfig) {
                throw new Error(`Unsupported target format: ${targetFormat}`);
            }

            // Adjust quality based on requested level
            const qualityLevels = {
                low: 0.7,
                medium: 0.8,
                high: 0.9,
                maximum: 1.0
            };

            const qualityFactor = qualityLevels[quality] || qualityLevels.medium;
            const adjustedQuality = Math.round(formatConfig.quality * qualityFactor);

            const image = sharp(originalPath);
            let convertedBuffer;

            switch (targetFormat) {
                case 'webp':
                    convertedBuffer = await image
                        .webp({ quality: adjustedQuality })
                        .toBuffer();
                    break;

                case 'avif':
                    convertedBuffer = await image
                        .avif({ quality: adjustedQuality })
                        .toBuffer();
                    break;

                case 'jpeg':
                    convertedBuffer = await image
                        .jpeg({ quality: adjustedQuality, progressive: true })
                        .toBuffer();
                    break;

                case 'png':
                    convertedBuffer = await image
                        .png({ quality: adjustedQuality, compressionLevel: 6 })
                        .toBuffer();
                    break;

                default:
                    throw new Error(`Unsupported conversion format: ${targetFormat}`);
            }

            const outputPath = path.join(TEMP_DIR, `${assetId}_converted_${targetFormat}.${targetFormat}`);
            await fs.promises.writeFile(outputPath, convertedBuffer);

            console.log(`✅ Converted ${assetId} to ${targetFormat} (${convertedBuffer.length} bytes)`);

            return {
                success: true,
                assetId,
                targetFormat,
                outputPath,
                size: convertedBuffer.length,
                originalSize: fs.statSync(originalPath).size
            };

        } catch (error) {
            console.error(`❌ Conversion failed for ${assetId}:`, error);
            throw error;
        }
    }

    // Generate srcset for responsive images
    async generateSrcset(assetId, originalPath, baseUrl) {
        try {
            const image = sharp(originalPath);
            const { width: originalWidth, height: originalHeight } = await image.metadata();

            const srcset = [];
            const sizes = [];

            // Add original size
            srcset.push(`${baseUrl} 1x`);
            sizes.push(`${originalWidth}w`);

            // Add responsive versions if they exist
            for (const breakpoint of RESPONSIVE_BREAKPOINTS) {
                const responsivePath = path.join(
                    TEMP_DIR,
                    `${assetId}${breakpoint.suffix}${path.extname(originalPath)}`
                );

                if (fs.existsSync(responsivePath)) {
                    const url = `${baseUrl.replace(path.extname(baseUrl), '')}${breakpoint.suffix}${path.extname(baseUrl)}`;
                    srcset.push(`${url} ${breakpoint.width}w`);
                    sizes.push(`${breakpoint.width}w`);
                }
            }

            return {
                srcset: srcset.join(', '),
                sizes: sizes.join(', '),
                originalWidth,
                originalHeight
            };

        } catch (error) {
            console.error('Failed to generate srcset:', error);
            return {
                srcset: `${baseUrl} 1x`,
                sizes: '100vw',
                originalWidth: 0,
                originalHeight: 0
            };
        }
    }

    // Network-aware asset loading strategy
    getNetworkAwareAsset(assetId, networkCondition = 'medium', availableFormats = ['webp', 'avif', 'jpeg']) {
        try {
            const condition = NETWORK_CONDITIONS[networkCondition] || NETWORK_CONDITIONS.medium;

            // Prioritize formats based on network condition
            let preferredFormats;
            if (networkCondition === 'slow') {
                preferredFormats = ['webp', 'avif']; // Best compression
            } else if (networkCondition === 'fast') {
                preferredFormats = ['avif', 'webp', 'jpeg']; // Best quality
            } else {
                preferredFormats = ['webp', 'avif', 'jpeg']; // Balanced
            }

            // Find the best available format that meets size constraints
            for (const format of preferredFormats) {
                if (availableFormats.includes(format)) {
                    // In a real implementation, we'd check the actual file size
                    // For now, we'll just return the preferred format
                    return {
                        format,
                        maxSize: condition.maxSize,
                        strategy: networkCondition
                    };
                }
            }

            // Fallback to original
            return {
                format: 'original',
                maxSize: condition.maxSize,
                strategy: networkCondition
            };

        } catch (error) {
            console.error('Network-aware asset selection error:', error);
            return {
                format: 'original',
                maxSize: NETWORK_CONDITIONS.medium.maxSize,
                strategy: 'medium'
            };
        }
    }

    // Cache optimized assets
    async cacheOptimizedAsset(assetId, format, optimizedPath, ttl = 86400) {
        try {
            const cacheKey = `asset_cache:${assetId}:${format}`;
            const cachePath = path.join(CACHE_DIR, `${assetId}_${format}${path.extname(optimizedPath)}`);

            // Copy to cache directory
            await fs.promises.copyFile(optimizedPath, cachePath);

            // Store cache metadata
            const cacheData = {
                assetId,
                format,
                path: cachePath,
                size: fs.statSync(cachePath).size,
                cachedAt: Date.now(),
                ttl
            };

            await redisCache.set(cacheKey, cacheData, ttl);
            console.log(`💾 Cached optimized asset ${assetId} (${format})`);

            return cacheData;

        } catch (error) {
            console.error('Failed to cache optimized asset:', error);
            return null;
        }
    }

    // Get cached asset
    async getCachedAsset(assetId, format) {
        try {
            const cacheKey = `asset_cache:${assetId}:${format}`;
            const cacheData = await redisCache.get(cacheKey);

            if (cacheData && fs.existsSync(cacheData.path)) {
                console.log(`✅ Cache hit for ${assetId} (${format})`);
                return cacheData;
            }

            return null;

        } catch (error) {
            console.error('Failed to get cached asset:', error);
            return null;
        }
    }

    // Upload optimized assets to CDN/storage
    async uploadOptimizedAssets(assetId, basePath, results) {
        try {
            const uploadResults = [];

            // Upload original
            const originalUpload = await this.uploadAsset(
                `${basePath}/${assetId}${path.extname(results.original.path)}`,
                results.original.path
            );
            uploadResults.push(originalUpload);

            // Upload optimized versions
            for (const optimized of results.optimized) {
                const upload = await this.uploadAsset(
                    `${basePath}/${assetId}_${optimized.format}${path.extname(optimized.path)}`,
                    optimized.path
                );
                uploadResults.push(upload);
            }

            // Upload responsive versions
            if (results.responsive) {
                for (const responsive of results.responsive) {
                    const upload = await this.uploadAsset(
                        `${basePath}/${assetId}${responsive.suffix}${path.extname(responsive.path)}`,
                        responsive.path
                    );
                    uploadResults.push(upload);
                }
            }

            return uploadResults;

        } catch (error) {
            console.error('Failed to upload optimized assets:', error);
            throw error;
        }
    }

    // Upload single asset
    async uploadAsset(destinationPath, sourcePath) {
        try {
            const fileContent = fs.readFileSync(sourcePath);
            const mimeType = mime.lookup(sourcePath) || 'application/octet-stream';

            const uploadResult = await uploadToS3(fileContent, destinationPath, mimeType);
            console.log(`☁️ Uploaded ${destinationPath} to storage`);

            return {
                success: true,
                path: destinationPath,
                size: fileContent.length,
                uploadedAt: Date.now()
            };

        } catch (error) {
            console.error(`❌ Failed to upload ${destinationPath}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get queue statistics
    async getQueueStats() {
        try {
            const counts = await assetOptimizationQueue.getJobCounts();
            const isPaused = await assetOptimizationQueue.isPaused();

            return {
                waiting: counts.waiting,
                active: counts.active,
                completed: counts.completed,
                failed: counts.failed,
                delayed: counts.delayed,
                isPaused,
                queueName: assetOptimizationQueue.name
            };
        } catch (error) {
            console.error('Failed to get queue stats:', error);
            return {
                error: error.message,
                queueName: assetOptimizationQueue.name
            };
        }
    }

    // Clean up all temp files for an asset
    async cleanupAssetFiles(assetId) {
        try {
            const files = fs.readdirSync(TEMP_DIR);
            const assetFiles = files.filter(file => file.startsWith(assetId));

            for (const file of assetFiles) {
                const filePath = path.join(TEMP_DIR, file);
                fs.unlinkSync(filePath);
                console.log(`🧹 Cleaned up temp file: ${filePath}`);
            }

            return { success: true, cleanedFiles: assetFiles.length };

        } catch (error) {
            console.error('Failed to cleanup asset files:', error);
            return { success: false, error: error.message };
        }
    }
}

// Singleton instance
const assetOptimizationService = new AssetOptimizationService();

export {
    assetOptimizationService,
    assetOptimizationQueue,
    FORMAT_CONFIGS,
    RESPONSIVE_BREAKPOINTS,
    NETWORK_CONDITIONS
};