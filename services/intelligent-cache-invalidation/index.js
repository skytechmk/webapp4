import { multiLevelCache } from '../multi-level-cache/index.js';
import { logger } from '../../server/services/loggerService.js';
import { serviceDiscovery } from '../service-discovery/index.js';

class IntelligentCacheInvalidation {
    constructor() {
        this.invalidationStrategies = {
            immediate: {
                description: 'Invalidate immediately',
                priority: 1,
                conditions: ['data_critical', 'security_issue']
            },
            lazy: {
                description: 'Mark for lazy invalidation',
                priority: 3,
                conditions: ['low_usage', 'old_data']
            },
            selective: {
                description: 'Invalidate based on conditions',
                priority: 2,
                conditions: ['conditional', 'size_pressure']
            },
            cascading: {
                description: 'Invalidate with dependencies',
                priority: 1,
                conditions: ['dependency_change', 'schema_change']
            }
        };

        this.invalidationQueue = [];
        this.activeInvalidations = new Set();
        this.maxConcurrentInvalidations = 3;

        this.stats = {
            totalInvalidations: 0,
            immediateInvalidations: 0,
            lazyInvalidations: 0,
            selectiveInvalidations: 0,
            cascadingInvalidations: 0,
            errors: 0,
            bytesFreed: 0
        };

        this.usageTracking = new Map(); // Track cache usage for intelligent decisions
    }

    // Start invalidation service
    start() {
        // Process invalidation queue periodically
        this.invalidationInterval = setInterval(() => {
            this.processInvalidationQueue();
        }, 30000); // Every 30 seconds

        logger.info('Intelligent cache invalidation service started');
    }

    // Stop invalidation service
    stop() {
        if (this.invalidationInterval) {
            clearInterval(this.invalidationInterval);
            this.invalidationInterval = null;
        }

        logger.info('Intelligent cache invalidation service stopped');
    }

    // Invalidate cache intelligently
    async invalidate(key, pattern, reason, options = {}) {
        this.stats.totalInvalidations++;

        try {
            // Determine invalidation strategy
            const strategy = this.determineStrategy(key, pattern, reason, options);

            // Add to invalidation queue
            this.invalidationQueue.push({
                key,
                pattern,
                reason,
                strategy,
                options,
                timestamp: new Date().toISOString()
            });

            // Sort queue by priority
            this.invalidationQueue.sort((a, b) =>
                this.invalidationStrategies[a.strategy].priority -
                this.invalidationStrategies[b.strategy].priority
            );

            logger.debug('Added to invalidation queue', {
                key,
                pattern,
                strategy,
                reason
            });

            return {
                success: true,
                strategy,
                queued: true
            };

        } catch (error) {
            this.stats.errors++;
            logger.error('Intelligent invalidation error:', {
                error: error.message,
                key,
                pattern,
                reason
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Determine invalidation strategy
    determineStrategy(key, pattern, reason, options) {
        // Check for immediate invalidation conditions
        if (reason === 'data_updated' || reason === 'security_issue') {
            return 'immediate';
        }

        // Check for cascading invalidation
        if (reason === 'dependency_change' || reason === 'schema_change') {
            return 'cascading';
        }

        // Check usage statistics
        const usageStats = this.getUsageStatistics(key, pattern);
        if (usageStats.hitRate < 0.2) {
            return 'lazy'; // Low usage - lazy invalidation
        }

        // Default to selective for most cases
        return 'selective';
    }

    // Process invalidation queue
    async processInvalidationQueue() {
        if (this.activeInvalidations.size >= this.maxConcurrentInvalidations) {
            logger.debug('Max concurrent invalidations reached');
            return;
        }

        if (this.invalidationQueue.length === 0) {
            logger.debug('Invalidation queue is empty');
            return;
        }

        // Get next invalidation from queue
        const nextInvalidation = this.invalidationQueue.shift();
        const operationId = `${nextInvalidation.pattern}:${nextInvalidation.key}:${Date.now()}`;

        this.activeInvalidations.add(operationId);

        try {
            // Execute invalidation with selected strategy
            const result = await this.executeInvalidationStrategy(nextInvalidation);

            // Update statistics
            this.updateStatistics(nextInvalidation.strategy, result);

            logger.info('Completed invalidation', {
                key: nextInvalidation.key,
                pattern: nextInvalidation.pattern,
                strategy: nextInvalidation.strategy,
                success: result.success,
                bytesFreed: result.bytesFreed
            });

        } catch (error) {
            this.stats.errors++;
            logger.error('Invalidation execution error:', {
                error: error.message,
                key: nextInvalidation.key,
                pattern: nextInvalidation.pattern,
                strategy: nextInvalidation.strategy
            });

        } finally {
            this.activeInvalidations.delete(operationId);
        }
    }

    // Execute invalidation strategy
    async executeInvalidationStrategy(invalidation) {
        const { key, pattern, strategy, reason, options } = invalidation;

        try {
            switch (strategy) {
                case 'immediate':
                    return this.executeImmediateInvalidation(key, pattern, reason);

                case 'lazy':
                    return this.executeLazyInvalidation(key, pattern, reason);

                case 'selective':
                    return this.executeSelectiveInvalidation(key, pattern, reason, options);

                case 'cascading':
                    return this.executeCascadingInvalidation(key, pattern, reason);

                default:
                    return this.executeImmediateInvalidation(key, pattern, reason);
            }

        } catch (error) {
            logger.error('Strategy execution error:', {
                error: error.message,
                strategy,
                key,
                pattern
            });
            throw error;
        }
    }

    // Execute immediate invalidation
    async executeImmediateInvalidation(key, pattern, reason) {
        try {
            // Get cache size before invalidation
            const sizeBefore = await this.getCacheSize(key, pattern);

            // Invalidate from all cache levels
            const result = await multiLevelCache.delete(key, pattern);

            // Calculate bytes freed
            const bytesFreed = sizeBefore > 0 ? sizeBefore : 0;

            return {
                success: true,
                bytesFreed,
                immediate: true
            };

        } catch (error) {
            logger.error('Immediate invalidation error:', {
                error: error.message,
                key,
                pattern
            });
            return {
                success: false,
                error: error.message,
                bytesFreed: 0
            };
        }
    }

    // Execute lazy invalidation
    async executeLazyInvalidation(key, pattern, reason) {
        try {
            // Mark for lazy invalidation in Redis
            const lazyKey = `lazy_invalidate:${pattern}:${key}`;
            const success = await multiLevelCache.setInRedisCache(
                lazyKey,
                {
                    key,
                    pattern,
                    reason,
                    markedAt: new Date().toISOString(),
                    strategy: 'lazy'
                },
                'lazy_invalidate',
                300 // 5 minutes TTL
            );

            return {
                success,
                lazy: true,
                bytesFreed: 0 // No immediate bytes freed
            };

        } catch (error) {
            logger.error('Lazy invalidation error:', {
                error: error.message,
                key,
                pattern
            });
            return {
                success: false,
                error: error.message,
                bytesFreed: 0
            };
        }
    }

    // Execute selective invalidation
    async executeSelectiveInvalidation(key, pattern, reason, options) {
        try {
            // Check if we should actually invalidate
            const shouldInvalidate = await this.checkSelectiveConditions(key, pattern, reason, options);

            if (shouldInvalidate) {
                // Perform immediate invalidation
                return this.executeImmediateInvalidation(key, pattern, reason);
            } else {
                // Don't invalidate
                return {
                    success: true,
                    bytesFreed: 0,
                    selective: true,
                    invalidated: false
                };
            }

        } catch (error) {
            logger.error('Selective invalidation error:', {
                error: error.message,
                key,
                pattern
            });
            return {
                success: false,
                error: error.message,
                bytesFreed: 0
            };
        }
    }

    // Check selective invalidation conditions
    async checkSelectiveConditions(key, pattern, reason, options) {
        // Get usage statistics
        const usageStats = this.getUsageStatistics(key, pattern);

        // Simple decision logic
        if (reason === 'low_usage' && usageStats.hitRate < 0.1) {
            return true; // Invalidate low-usage items
        }

        if (reason === 'size_pressure' && usageStats.size > 10000) {
            return true; // Invalidate large items under memory pressure
        }

        // Default to not invalidating for selective strategy
        return false;
    }

    // Execute cascading invalidation
    async executeCascadingInvalidation(key, pattern, reason) {
        try {
            // Get dependencies for this cache item
            const dependencies = await this.getCacheDependencies(key, pattern);

            // Calculate total size before invalidation
            let totalSizeBefore = 0;

            // Invalidate main item
            const mainResult = await this.executeImmediateInvalidation(key, pattern, reason);
            totalSizeBefore += mainResult.bytesFreed;

            // Invalidate dependencies
            let dependencyBytesFreed = 0;

            for (const depKey of dependencies) {
                const depResult = await this.executeImmediateInvalidation(depKey, pattern, `dependency_of_${reason}`);
                dependencyBytesFreed += depResult.bytesFreed;
            }

            return {
                success: true,
                bytesFreed: totalSizeBefore + dependencyBytesFreed,
                cascading: true,
                mainBytesFreed: mainResult.bytesFreed,
                dependencyBytesFreed
            };

        } catch (error) {
            logger.error('Cascading invalidation error:', {
                error: error.message,
                key,
                pattern
            });
            return {
                success: false,
                error: error.message,
                bytesFreed: 0
            };
        }
    }

    // Get cache dependencies
    async getCacheDependencies(key, pattern) {
        // Mock implementation - would analyze cache relationships
        const cacheConfig = multiLevelCache.cacheLevels.redis.cachePatterns?.[pattern];

        if (cacheConfig?.invalidation?.dependencies) {
            // Simple dependency resolution
            const patternKey = `${cacheConfig.prefix}*`;
            const keys = await multiLevelCache.getKeysByPattern(patternKey);

            return keys.filter(k => k !== key).slice(0, 5); // Limit to 5 dependencies
        }

        return [];
    }

    // Get cache size
    async getCacheSize(key, pattern) {
        try {
            // Check memory cache size
            const memoryCacheKey = `${pattern}:${key}`;
            const memoryCached = multiLevelCache.cacheLevels.memory.cache.get(memoryCacheKey);

            if (memoryCached) {
                return JSON.stringify(memoryCached.value).length;
            }

            // Check Redis cache size
            const redisCacheKey = `${multiLevelCache.cacheLevels.redis.prefix}${pattern}:${key}`;
            const redisCached = await multiLevelCache.getFromRedisCache(redisCacheKey, pattern);

            if (redisCached) {
                return JSON.stringify(redisCached).length;
            }

            return 0;

        } catch (error) {
            logger.error('Cache size calculation error:', {
                error: error.message,
                key,
                pattern
            });
            return 0;
        }
    }

    // Get usage statistics for cache item
    getUsageStatistics(key, pattern) {
        const cacheKey = `${pattern}:${key}`;
        const cachedStats = this.usageTracking.get(cacheKey);

        if (cachedStats) {
            return cachedStats;
        }

        // Default statistics for unknown items
        return {
            hitRate: 0.5,
            accessCount: 10,
            lastAccessed: new Date().toISOString(),
            size: 1024,
            dependencies: []
        };
    }

    // Track cache usage
    trackUsage(key, pattern, hit = true) {
        const cacheKey = `${pattern}:${key}`;
        const existingStats = this.usageTracking.get(cacheKey) || {
            hits: 0,
            misses: 0,
            lastAccessed: null
        };

        if (hit) {
            existingStats.hits++;
        } else {
            existingStats.misses++;
        }

        existingStats.lastAccessed = new Date().toISOString();
        existingStats.hitRate = existingStats.hits / (existingStats.hits + existingStats.misses);

        this.usageTracking.set(cacheKey, existingStats);
    }

    // Update statistics
    updateStatistics(strategy, result) {
        this.stats[`${strategy}Invalidations`]++;

        if (result.bytesFreed) {
            this.stats.bytesFreed += result.bytesFreed;
        }
    }

    // Process lazy invalidations
    async processLazyInvalidations() {
        try {
            // Find all lazy invalidation markers
            const lazyKeys = await multiLevelCache.getKeysByPattern('lazy_invalidate:*');

            logger.info('Processing lazy invalidations', {
                count: lazyKeys.length
            });

            let processedCount = 0;
            let bytesFreed = 0;

            for (const lazyKey of lazyKeys) {
                try {
                    // Get the invalidation marker
                    const marker = await multiLevelCache.getFromRedisCache(lazyKey, 'lazy_invalidate');

                    if (marker) {
                        // Perform the actual invalidation
                        const result = await this.executeImmediateInvalidation(
                            marker.key,
                            marker.pattern,
                            marker.reason
                        );

                        if (result.success) {
                            processedCount++;
                            bytesFreed += result.bytesFreed;

                            // Remove the marker
                            await multiLevelCache.deleteFromRedisCache(lazyKey, 'lazy_invalidate');
                        }
                    }

                } catch (error) {
                    logger.error('Lazy invalidation processing error:', {
                        error: error.message,
                        lazyKey
                    });
                }
            }

            return {
                success: true,
                processedCount,
                bytesFreed,
                totalLazyInvalidations: lazyKeys.length
            };

        } catch (error) {
            logger.error('Lazy invalidations processing error:', {
                error: error.message
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Intelligent invalidation based on service events
    async invalidateByServiceEvent(event) {
        try {
            // Map service events to invalidation reasons
            const eventMappings = {
                'user_updated': { reason: 'data_updated', pattern: 'user' },
                'user_deleted': { reason: 'data_updated', pattern: 'user' },
                'event_updated': { reason: 'data_updated', pattern: 'event' },
                'event_deleted': { reason: 'data_updated', pattern: 'event' },
                'media_uploaded': { reason: 'dependency_change', pattern: 'media' },
                'media_deleted': { reason: 'data_updated', pattern: 'media' },
                'schema_changed': { reason: 'schema_change', pattern: 'api_response' }
            };

            const mapping = eventMappings[event.type];
            if (!mapping) {
                logger.debug('No invalidation mapping for event', { eventType: event.type });
                return { success: false, reason: 'no_mapping' };
            }

            // Invalidate with appropriate reason
            const result = await this.invalidate(event.data?.id || 'all', mapping.pattern, mapping.reason);

            return {
                success: result.success,
                strategy: result.strategy,
                eventType: event.type
            };

        } catch (error) {
            logger.error('Service event invalidation error:', {
                error: error.message,
                event
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get invalidation statistics
    getStatistics() {
        const totalInvalidations = this.stats.totalInvalidations;
        const successRate = totalInvalidations > 0
            ? (this.stats.totalInvalidations - this.stats.errors) / this.stats.totalInvalidations
            : 0;

        return {
            ...this.stats,
            successRate,
            queueSize: this.invalidationQueue.length,
            activeInvalidations: this.activeInvalidations.size,
            efficiency: this.calculateEfficiency(),
            lastUpdated: new Date().toISOString()
        };
    }

    // Calculate invalidation efficiency
    calculateEfficiency() {
        const totalOperations = this.stats.totalInvalidations;
        if (totalOperations === 0) return 0;

        // Simple efficiency metric
        const immediateRatio = this.stats.immediateInvalidations / totalOperations;
        const lazyRatio = this.stats.lazyInvalidations / totalOperations;

        // Higher immediate ratio = more aggressive (good for data consistency)
        // Higher lazy ratio = more conservative (good for performance)
        return (immediateRatio * 0.6 + (1 - lazyRatio) * 0.4);
    }

    // Reset statistics
    resetStatistics() {
        this.stats = {
            totalInvalidations: 0,
            immediateInvalidations: 0,
            lazyInvalidations: 0,
            selectiveInvalidations: 0,
            cascadingInvalidations: 0,
            errors: 0,
            bytesFreed: 0
        };
    }

    // Get queue status
    getQueueStatus() {
        return {
            queueSize: this.invalidationQueue.length,
            activeInvalidations: this.activeInvalidations.size,
            nextInvalidations: this.invalidationQueue.slice(0, 5).map(item => ({
                key: item.key,
                pattern: item.pattern,
                strategy: item.strategy,
                reason: item.reason,
                priority: this.invalidationStrategies[item.strategy]?.priority
            })),
            timestamp: new Date().toISOString()
        };
    }

    // Emergency cache invalidation
    async emergencyInvalidateAll(reason = 'emergency_purge') {
        try {
            logger.info('Starting emergency cache invalidation', { reason });

            // Get all cache keys
            const allKeys = await this.getAllCacheKeys();

            let totalBytesFreed = 0;
            let keysInvalidated = 0;

            // Invalidate in batches to avoid overwhelming the system
            const batchSize = 50;
            for (let i = 0; i < allKeys.length; i += batchSize) {
                const batch = allKeys.slice(i, i + batchSize);

                for (const key of batch) {
                    try {
                        // Extract pattern from key (simple heuristic)
                        const pattern = this.extractPatternFromKey(key);

                        const result = await this.executeImmediateInvalidation(
                            key.replace(`${pattern}:`, ''), // Remove pattern prefix
                            pattern,
                            reason
                        );

                        if (result.success) {
                            keysInvalidated++;
                            totalBytesFreed += result.bytesFreed;
                        }

                    } catch (error) {
                        logger.error('Emergency invalidation error:', {
                            error: error.message,
                            key
                        });
                    }
                }

                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            this.stats.totalInvalidations += keysInvalidated;
            this.stats.immediateInvalidations += keysInvalidated;
            this.stats.bytesFreed += totalBytesFreed;

            return {
                success: true,
                keysInvalidated,
                totalBytesFreed,
                reason
            };

        } catch (error) {
            logger.error('Emergency invalidation error:', {
                error: error.message,
                reason
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get all cache keys
    async getAllCacheKeys() {
        try {
            // Get keys from all patterns
            const allKeys = [];

            // This would be more comprehensive in a real implementation
            const patterns = ['user:', 'event:', 'media:', 'api:'];
            for (const pattern of patterns) {
                const patternKeys = await multiLevelCache.getKeysByPattern(`${pattern}*`);
                allKeys.push(...patternKeys);
            }

            return allKeys;

        } catch (error) {
            logger.error('Get all cache keys error:', {
                error: error.message
            });
            return [];
        }
    }

    // Extract pattern from key
    extractPatternFromKey(key) {
        const patternMatch = key.match(/^([^:]+):/);
        return patternMatch ? patternMatch[1] : 'default';
    }

    // Intelligent invalidation with dependency analysis
    async invalidateWithDependencyAnalysis(key, pattern, reason) {
        try {
            // Get dependency graph
            const dependencyGraph = await this.buildDependencyGraph(key, pattern);

            // Analyze impact
            const impactAnalysis = this.analyzeInvalidationImpact(dependencyGraph);

            logger.info('Dependency analysis for invalidation', {
                key,
                pattern,
                dependencies: dependencyGraph.dependencies.length,
                impact: impactAnalysis.impactLevel
            });

            // Execute cascading invalidation if high impact
            if (impactAnalysis.impactLevel === 'high') {
                return this.executeCascadingInvalidation(key, pattern, reason);
            } else {
                return this.executeImmediateInvalidation(key, pattern, reason);
            }

        } catch (error) {
            logger.error('Dependency analysis invalidation error:', {
                error: error.message,
                key,
                pattern
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Build dependency graph
    async buildDependencyGraph(key, pattern) {
        // Mock implementation
        return {
            key,
            pattern,
            dependencies: [
                `${pattern}:related_${key}`,
                `${pattern}:dependent_${key}`
            ],
            dependents: [
                `other_pattern:depends_on_${key}`
            ]
        };
    }

    // Analyze invalidation impact
    analyzeInvalidationImpact(graph) {
        // Simple impact analysis
        if (graph.dependencies.length > 3 || graph.dependents.length > 2) {
            return { impactLevel: 'high', description: 'High impact invalidation' };
        } else if (graph.dependencies.length > 0 || graph.dependents.length > 0) {
            return { impactLevel: 'medium', description: 'Medium impact invalidation' };
        } else {
            return { impactLevel: 'low', description: 'Low impact invalidation' };
        }
    }
}

export const intelligentCacheInvalidation = new IntelligentCacheInvalidation();
export default intelligentCacheInvalidation;