import pako from 'pako';
import { logger } from '../../server/services/loggerService.js';
import { advancedCache } from '../advanced-cache/index.js';

class MessageOptimization {
    constructor() {
        this.batchingConfig = {
            maxBatchSize: 10, // Maximum messages per batch
            maxBatchDelay: 100, // Maximum delay in ms before sending batch
            maxMessageSize: 1024, // Maximum size in bytes before compression
            compressionThreshold: 512 // Size threshold for compression
        };

        this.batchQueues = {};
        this.batchTimers = {};
        this.stats = {
            messagesProcessed: 0,
            messagesBatched: 0,
            messagesCompressed: 0,
            bytesSaved: 0,
            batchesSent: 0
        };
    }

    // Process message with optimization
    async processMessage(message, options = {}) {
        try {
            const startTime = Date.now();

            // Apply message optimization
            const optimizedMessage = await this.optimizeMessage(message, options);

            const duration = Date.now() - startTime;
            this.stats.messagesProcessed++;

            logger.debug('Message processed', {
                originalSize: JSON.stringify(message).length,
                optimizedSize: JSON.stringify(optimizedMessage).length,
                duration,
                compressed: optimizedMessage.compressed || false,
                batched: optimizedMessage.batched || false
            });

            return optimizedMessage;

        } catch (error) {
            logger.error('Message processing error:', { error: error.message });
            return message; // Return original on error
        }
    }

    // Optimize message
    async optimizeMessage(message, options) {
        try {
            // Check if message should be batched
            if (options.batchKey && this.shouldBatch(options)) {
                return this.addToBatch(message, options);
            }

            // Check if message should be compressed
            if (this.shouldCompress(message)) {
                return this.compressMessage(message);
            }

            // Return original if no optimization needed
            return message;

        } catch (error) {
            logger.error('Message optimization error:', { error: error.message });
            return message;
        }
    }

    // Check if message should be batched
    shouldBatch(options) {
        return options.batchKey &&
            !options.immediate &&
            this.batchingConfig.maxBatchSize > 1;
    }

    // Add message to batch
    addToBatch(message, options) {
        try {
            const { batchKey } = options;

            // Initialize batch queue if not exists
            if (!this.batchQueues[batchKey]) {
                this.batchQueues[batchKey] = [];
            }

            // Add message to batch
            this.batchQueues[batchKey].push(message);
            this.stats.messagesBatched++;

            logger.debug('Message added to batch', {
                batchKey,
                queueLength: this.batchQueues[batchKey].length
            });

            // Set up batch timer if not exists
            if (!this.batchTimers[batchKey]) {
                this.setupBatchTimer(batchKey);
            }

            // Return batch info
            return {
                batched: true,
                batchKey,
                queuePosition: this.batchQueues[batchKey].length,
                messageId: message.id || Date.now()
            };

        } catch (error) {
            logger.error('Batch addition error:', { error: error.message, batchKey });
            return message; // Return original on error
        }
    }

    // Set up batch timer
    setupBatchTimer(batchKey) {
        this.batchTimers[batchKey] = setTimeout(async () => {
            await this.sendBatch(batchKey);
        }, this.batchingConfig.maxBatchDelay);
    }

    // Send batch
    async sendBatch(batchKey) {
        try {
            if (!this.batchQueues[batchKey] || this.batchQueues[batchKey].length === 0) {
                return;
            }

            const batch = this.batchQueues[batchKey];
            const batchSize = batch.length;

            // Clear queue and timer
            delete this.batchQueues[batchKey];
            if (this.batchTimers[batchKey]) {
                clearTimeout(this.batchTimers[batchKey]);
                delete this.batchTimers[batchKey];
            }

            // Process batch
            const processedBatch = await this.processBatch(batch);
            this.stats.batchesSent++;

            logger.info('Batch sent', {
                batchKey,
                batchSize,
                compressed: processedBatch.compressed || false
            });

            return processedBatch;

        } catch (error) {
            logger.error('Batch sending error:', { error: error.message, batchKey });
            // Messages remain in queue for retry
        }
    }

    // Process batch
    async processBatch(batch) {
        try {
            // Check if batch should be compressed
            const batchSize = JSON.stringify(batch).length;
            if (batchSize > this.batchingConfig.compressionThreshold) {
                return this.compressBatch(batch);
            }

            // Return uncompressed batch
            return {
                batch,
                compressed: false,
                size: batchSize,
                count: batch.length
            };

        } catch (error) {
            logger.error('Batch processing error:', { error: error.message });
            return {
                batch,
                compressed: false,
                error: error.message
            };
        }
    }

    // Compress batch
    async compressBatch(batch) {
        try {
            const startTime = Date.now();
            const batchData = JSON.stringify(batch);

            // Compress using pako (deflate)
            const compressedData = pako.deflate(batchData, { level: 6 });
            const compressionRatio = batchData.length / compressedData.length;
            const bytesSaved = batchData.length - compressedData.length;

            this.stats.bytesSaved += bytesSaved;
            this.stats.messagesCompressed += batch.length;

            const duration = Date.now() - startTime;

            logger.info('Batch compressed', {
                originalSize: batchData.length,
                compressedSize: compressedData.length,
                compressionRatio: compressionRatio.toFixed(2),
                bytesSaved,
                duration
            });

            return {
                batch,
                compressed: true,
                compressedData: compressedData.toString('base64'),
                originalSize: batchData.length,
                compressedSize: compressedData.length,
                compressionRatio,
                bytesSaved,
                count: batch.length
            };

        } catch (error) {
            logger.error('Batch compression error:', { error: error.message });
            return {
                batch,
                compressed: false,
                error: error.message
            };
        }
    }

    // Decompress message
    async decompressMessage(compressedData) {
        try {
            if (!compressedData || !compressedData.compressedData) {
                return compressedData;
            }

            const startTime = Date.now();

            // Decompress using pako (inflate)
            const decompressedData = pako.inflate(compressedData.compressedData, { to: 'string' });
            const duration = Date.now() - startTime;

            logger.debug('Message decompressed', {
                compressedSize: compressedData.compressedSize,
                decompressedSize: decompressedData.length,
                duration
            });

            return JSON.parse(decompressedData);

        } catch (error) {
            logger.error('Message decompression error:', { error: error.message });
            return compressedData; // Return original on error
        }
    }

    // Check if message should be compressed
    shouldCompress(message) {
        try {
            const messageSize = JSON.stringify(message).length;
            return messageSize > this.batchingConfig.compressionThreshold;

        } catch (error) {
            logger.error('Compression check error:', { error: error.message });
            return false;
        }
    }

    // Compress single message
    async compressMessage(message) {
        try {
            const startTime = Date.now();
            const messageData = JSON.stringify(message);

            // Compress using pako (deflate)
            const compressedData = pako.deflate(messageData, { level: 6 });
            const compressionRatio = messageData.length / compressedData.length;
            const bytesSaved = messageData.length - compressedData.length;

            this.stats.bytesSaved += bytesSaved;
            this.stats.messagesCompressed++;

            const duration = Date.now() - startTime;

            logger.debug('Message compressed', {
                originalSize: messageData.length,
                compressedSize: compressedData.length,
                compressionRatio: compressionRatio.toFixed(2),
                bytesSaved,
                duration
            });

            return {
                ...message,
                compressed: true,
                compressedData: compressedData.toString('base64'),
                originalSize: messageData.length,
                compressedSize: compressedData.length,
                compressionRatio
            };

        } catch (error) {
            logger.error('Message compression error:', { error: error.message });
            return message; // Return original on error
        }
    }

    // Message prioritization
    prioritizeMessage(message) {
        try {
            // Simple prioritization based on message type
            const priorityMap = {
                'admin': 1,
                'critical': 2,
                'high': 3,
                'medium': 4,
                'low': 5
            };

            const priority = priorityMap[message.priority] || 4;
            return { ...message, priority };

        } catch (error) {
            logger.error('Message prioritization error:', { error: error.message });
            return { ...message, priority: 4 }; // Default priority
        }
    }

    // Bandwidth optimization
    optimizeBandwidth(message) {
        try {
            // Remove unnecessary data for bandwidth optimization
            const optimized = { ...message };

            // Remove debug data if present
            if (optimized.debug) {
                delete optimized.debug;
            }

            // Remove timestamps if they can be regenerated
            if (optimized.internalTimestamps) {
                delete optimized.internalTimestamps;
            }

            // Convert large numbers to shorter representations if possible
            if (optimized.largeNumbers) {
                optimized.largeNumbers = optimized.largeNumbers.map(n => n.toString(36));
            }

            return optimized;

        } catch (error) {
            logger.error('Bandwidth optimization error:', { error: error.message });
            return message;
        }
    }

    // Get optimization statistics
    getStats() {
        return {
            ...this.stats,
            hitRate: this.stats.messagesProcessed > 0
                ? this.stats.messagesBatched / this.stats.messagesProcessed
                : 0,
            compressionRate: this.stats.messagesProcessed > 0
                ? this.stats.messagesCompressed / this.stats.messagesProcessed
                : 0,
            timestamp: new Date().toISOString()
        };
    }

    // Reset statistics
    resetStats() {
        this.stats = {
            messagesProcessed: 0,
            messagesBatched: 0,
            messagesCompressed: 0,
            bytesSaved: 0,
            batchesSent: 0
        };
    }

    // Get current batching configuration
    getBatchingConfig() {
        return this.batchingConfig;
    }

    // Set batching configuration
    setBatchingConfig(config) {
        this.batchingConfig = { ...this.batchingConfig, ...config };
        logger.info('Batching configuration updated', { config: this.batchingConfig });
    }

    // Force send all batches
    async forceSendAllBatches() {
        try {
            const batchKeys = Object.keys(this.batchQueues);
            const results = [];

            for (const batchKey of batchKeys) {
                const result = await this.sendBatch(batchKey);
                results.push(result);
            }

            logger.info('All batches forced to send', { batchCount: batchKeys.length });
            return results;

        } catch (error) {
            logger.error('Force send batches error:', { error: error.message });
            return [];
        }
    }

    // Get batch queue status
    getBatchQueueStatus() {
        return Object.keys(this.batchQueues).reduce((acc, batchKey) => {
            acc[batchKey] = {
                queueLength: this.batchQueues[batchKey].length,
                timerActive: !!this.batchTimers[batchKey]
            };
            return acc;
        }, {});
    }

    // Message size analysis
    analyzeMessageSize(message) {
        try {
            const size = JSON.stringify(message).length;
            const analysis = {
                size,
                category: this.getSizeCategory(size),
                compressionCandidate: size > this.batchingConfig.compressionThreshold,
                batchingCandidate: true
            };

            return analysis;

        } catch (error) {
            logger.error('Message size analysis error:', { error: error.message });
            return {
                size: 0,
                error: error.message
            };
        }
    }

    // Get size category
    getSizeCategory(size) {
        if (size < 256) return 'tiny';
        if (size < 1024) return 'small';
        if (size < 4096) return 'medium';
        if (size < 16384) return 'large';
        return 'huge';
    }

    // Message optimization recommendations
    getOptimizationRecommendations(message) {
        try {
            const analysis = this.analyzeMessageSize(message);
            const recommendations = [];

            if (analysis.compressionCandidate) {
                recommendations.push({
                    type: 'compression',
                    priority: 'high',
                    message: `Message size (${analysis.size} bytes) exceeds compression threshold. Consider compressing.`,
                    action: 'Enable compression for this message type'
                });
            }

            if (analysis.size > this.batchingConfig.maxMessageSize) {
                recommendations.push({
                    type: 'size_reduction',
                    priority: 'critical',
                    message: `Message size (${analysis.size} bytes) exceeds maximum recommended size.`,
                    action: 'Reduce message size or split into multiple messages'
                });
            }

            return recommendations;

        } catch (error) {
            logger.error('Optimization recommendations error:', { error: error.message });
            return [];
        }
    }

    // Message batching recommendations
    getBatchingRecommendations() {
        try {
            const stats = this.getStats();
            const recommendations = [];

            if (stats.messagesProcessed > 0 && stats.hitRate < 0.3) {
                recommendations.push({
                    type: 'batching_usage',
                    priority: 'medium',
                    message: `Low batching usage (${(stats.hitRate * 100).toFixed(1)}%). Consider batching more messages.`,
                    action: 'Review message types that could be batched'
                });
            }

            if (this.stats.batchesSent > 0 && (this.stats.messagesBatched / this.stats.batchesSent) < 5) {
                recommendations.push({
                    type: 'batch_size',
                    priority: 'low',
                    message: 'Average batch size is small. Consider increasing batch size or delay.',
                    action: 'Adjust batching configuration'
                });
            }

            return recommendations;

        } catch (error) {
            logger.error('Batching recommendations error:', { error: error.message });
            return [];
        }
    }

    // Get optimization performance report
    async getPerformanceReport() {
        try {
            const stats = this.getStats();
            const batchStatus = this.getBatchQueueStatus();
            const recommendations = [
                ...this.getBatchingRecommendations(),
                ...this.getOptimizationRecommendations({ size: stats.bytesSaved / (stats.messagesCompressed || 1) })
            ];

            return {
                stats,
                batchStatus,
                recommendations,
                config: this.batchingConfig,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Performance report generation error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export const messageOptimization = new MessageOptimization();
export default messageOptimization;