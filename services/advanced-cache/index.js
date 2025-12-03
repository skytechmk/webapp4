import { redisService } from '../../server/services/redisService.js';
import { logger } from '../../server/services/loggerService.js';
import { serviceDiscovery } from '../service-discovery/index.js';

class AdvancedCache {
    constructor() {
        this.cachePatterns = {
            // Cache patterns with TTLs and invalidation rules
            user: {
                prefix: 'user:',
                ttl: 300, // 5 minutes
                invalidation: {
                    events: ['user_updated', 'user_deleted'],
                    dependencies: ['user:*']
                }
            },
            event: {
                prefix: 'event:',
                ttl: 600, // 10 minutes
                invalidation: {
                    events: ['event_updated', 'event_deleted', 'media_uploaded'],
                    dependencies: ['event:*', 'media:*']
                }
            },
            media: {
                prefix: 'media:',
                ttl: 1800, // 30 minutes
                invalidation: {
                    events: ['media_processed', 'media_deleted'],
                    dependencies: ['media:*']
                }
            },
            api_response: {
                prefix: 'api:',
                ttl: 300, // 5 minutes
                invalidation: {
                    events: ['data_changed'],
                    dependencies: ['api:*']
                }
            }
        };

        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0
        };

        this.setupCacheInvalidation();
    }

    // Intelligent caching with pattern-based TTL
    async get(key, pattern = 'default') {
        try {
            const cacheConfig = this.cachePatterns[pattern] || this.cachePatterns.default;
            const fullKey = `${cacheConfig.prefix}${key}`;

            const startTime = Date.now();
            const value = await redisService.get(fullKey);
            const duration = Date.now() - startTime;

            if (value) {
                this.cacheStats.hits++;
                logger.debug('Cache hit', { key: fullKey, duration, pattern });
                return value;
            }

            this.cacheStats.misses++;
            logger.debug('Cache miss', { key: fullKey, pattern });
            return null;

        } catch (error) {
            logger.error('Cache get error:', { error: error.message, key });
            return null;
        }
    }

    // Set with intelligent TTL based on pattern
    async set(key, value, pattern = 'default', customTtl = null) {
        try {
            const cacheConfig = this.cachePatterns[pattern] || this.cachePatterns.default;
            const fullKey = `${cacheConfig.prefix}${key}`;
            const ttl = customTtl !== null ? customTtl : cacheConfig.ttl;

            const startTime = Date.now();
            const success = await redisService.set(fullKey, value, ttl);
            const duration = Date.now() - startTime;

            if (success) {
                this.cacheStats.sets++;
                logger.debug('Cache set', { key: fullKey, ttl, duration, pattern });
            }

            return success;

        } catch (error) {
            logger.error('Cache set error:', { error: error.message, key });
            return false;
        }
    }

    // Delete with dependency tracking
    async delete(key, pattern = 'default') {
        try {
            const cacheConfig = this.cachePatterns[pattern] || this.cachePatterns.default;
            const fullKey = `${cacheConfig.prefix}${key}`;

            const startTime = Date.now();
            const success = await redisService.del(fullKey);
            const duration = Date.now() - startTime;

            if (success) {
                this.cacheStats.deletes++;
                logger.debug('Cache delete', { key: fullKey, duration, pattern });
            }

            return success;

        } catch (error) {
            logger.error('Cache delete error:', { error: error.message, key });
            return false;
        }
    }

    // Intelligent invalidation based on events
    async invalidateByEvent(eventType, data) {
        try {
            // Find all patterns that should be invalidated by this event
            const patternsToInvalidate = Object.keys(this.cachePatterns).filter(pattern => {
                return this.cachePatterns[pattern].invalidation?.events?.includes(eventType);
            });

            if (patternsToInvalidate.length === 0) {
                logger.debug('No cache patterns to invalidate for event', { eventType });
                return;
            }

            logger.info('Invalidating cache by event', { eventType, patterns: patternsToInvalidate });

            // Invalidate each pattern
            for (const pattern of patternsToInvalidate) {
                await this.invalidatePattern(pattern, data);
            }

        } catch (error) {
            logger.error('Cache invalidation by event error:', { error: error.message, eventType });
        }
    }

    // Invalidate entire pattern
    async invalidatePattern(pattern, data) {
        try {
            const cacheConfig = this.cachePatterns[pattern];
            if (!cacheConfig) {
                return;
            }

            // Get all keys for this pattern
            const patternKey = `${cacheConfig.prefix}*`;
            const keys = await redisService.keys(patternKey);

            if (keys.length === 0) {
                logger.debug('No keys found for pattern invalidation', { pattern });
                return;
            }

            logger.info('Invalidating cache pattern', { pattern, keyCount: keys.length });

            // Delete all keys
            for (const key of keys) {
                await redisService.del(key);
                this.cacheStats.deletes++;
            }

            // Also invalidate dependencies
            if (cacheConfig.invalidation?.dependencies) {
                for (const dependencyPattern of cacheConfig.invalidation.dependencies) {
                    const dependencyKeys = await redisService.keys(dependencyPattern);
                    for (const depKey of dependencyKeys) {
                        await redisService.del(depKey);
                        this.cacheStats.deletes++;
                    }
                }
            }

        } catch (error) {
            logger.error('Pattern invalidation error:', { error: error.message, pattern });
        }
    }

    // Cache warming for critical data
    async warmCache(criticalKeys) {
        try {
            if (!Array.isArray(criticalKeys) || criticalKeys.length === 0) {
                logger.warn('No critical keys provided for cache warming');
                return;
            }

            logger.info('Starting cache warming', { keyCount: criticalKeys.length });

            // Warm each key
            for (const { key, pattern, dataFetcher } of criticalKeys) {
                try {
                    // Check if already cached
                    const cached = await this.get(key, pattern);
                    if (cached) {
                        logger.debug('Cache warming: key already cached', { key });
                        continue;
                    }

                    // Fetch data
                    const data = await dataFetcher();

                    // Cache with extended TTL for warmed data
                    await this.set(key, data, pattern, 3600); // 1 hour for warmed data

                    logger.info('Cache warmed', { key, pattern });

                } catch (error) {
                    logger.error('Cache warming error for key:', { error: error.message, key });
                }
            }

        } catch (error) {
            logger.error('Cache warming error:', { error: error.message });
        }
    }

    // Cache preloading based on usage patterns
    async preloadCache(usagePatterns) {
        try {
            logger.info('Starting cache preloading based on usage patterns');

            // Analyze usage patterns and preload likely needed data
            for (const { pattern, keys, priority } of usagePatterns) {
                try {
                    // Preload high priority items first
                    if (priority === 'high') {
                        for (const key of keys) {
                            // This would be implemented based on actual usage analysis
                            logger.debug('Preloading high priority cache', { pattern, key });
                        }
                    }
                } catch (error) {
                    logger.error('Cache preloading error:', { error: error.message, pattern });
                }
            }

        } catch (error) {
            logger.error('Cache preloading error:', { error: error.message });
        }
    }

    // Intelligent TTL management
    async adjustTTL(key, pattern, adjustmentFactor = 1.0) {
        try {
            const cacheConfig = this.cachePatterns[pattern];
            if (!cacheConfig) {
                return false;
            }

            const fullKey = `${cacheConfig.prefix}${key}`;
            const currentTtl = await redisService.ttl(fullKey);

            if (currentTtl === -2) {
                logger.debug('Key not found for TTL adjustment', { key: fullKey });
                return false;
            }

            const newTtl = Math.max(60, Math.min(86400, Math.round(cacheConfig.ttl * adjustmentFactor)));
            const success = await redisService.expire(fullKey, newTtl);

            if (success) {
                logger.debug('TTL adjusted', { key: fullKey, oldTtl: currentTtl, newTtl });
            }

            return success;

        } catch (error) {
            logger.error('TTL adjustment error:', { error: error.message, key });
            return false;
        }
    }

    // Cache statistics monitoring
    getCacheStats() {
        return {
            ...this.cacheStats,
            hitRate: this.cacheStats.hits + this.cacheStats.misses > 0
                ? this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)
                : 0,
            lastUpdated: new Date().toISOString()
        };
    }

    // Reset cache statistics
    resetCacheStats() {
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0
        };
    }

    // Setup cache invalidation listeners
    setupCacheInvalidation() {
        // Listen for service events that should trigger cache invalidation
        serviceDiscovery.on('service_event', (event) => {
            this.handleServiceEventForCache(event);
        });
    }

    // Handle service events for cache invalidation
    async handleServiceEventForCache(event) {
        try {
            logger.debug('Handling service event for cache', { eventType: event.type });

            // Map service events to cache invalidation
            const eventMappings = {
                'user_created': () => this.invalidatePattern('user'),
                'user_updated': () => this.invalidatePattern('user'),
                'user_deleted': () => this.invalidatePattern('user'),
                'event_created': () => this.invalidatePattern('event'),
                'event_updated': () => this.invalidatePattern('event'),
                'event_deleted': () => this.invalidatePattern('event'),
                'media_uploaded': () => this.invalidatePattern('media'),
                'media_processed': () => this.invalidatePattern('media'),
                'media_deleted': () => this.invalidatePattern('media'),
                'data_changed': () => this.invalidatePattern('api_response')
            };

            const handler = eventMappings[event.type];
            if (handler) {
                await handler();
            }

        } catch (error) {
            logger.error('Service event cache handling error:', { error: error.message, event });
        }
    }

    // Cache consistency verification
    async verifyCacheConsistency(key, pattern, expectedValue) {
        try {
            const cachedValue = await this.get(key, pattern);

            if (JSON.stringify(cachedValue) === JSON.stringify(expectedValue)) {
                return { consistent: true };
            }

            return {
                consistent: false,
                cachedValue,
                expectedValue
            };

        } catch (error) {
            logger.error('Cache consistency verification error:', { error: error.message, key });
            return { consistent: false, error: error.message };
        }
    }

    // Distributed cache operations (for cluster support)
    async distributedGet(key, pattern = 'default') {
        // In a distributed environment, this would coordinate across nodes
        // For now, use regular get
        return this.get(key, pattern);
    }

    async distributedSet(key, value, pattern = 'default', ttl = null) {
        // In a distributed environment, this would coordinate across nodes
        // For now, use regular set
        return this.set(key, value, pattern, ttl);
    }

    // Cache performance monitoring
    async getPerformanceMetrics() {
        try {
            const stats = this.getCacheStats();

            // Get Redis performance metrics
            const redisStats = await redisService.getStats();

            return {
                cacheStats: stats,
                redisStats,
                overallHealth: redisStats.connected ? 'healthy' : 'degraded',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Cache performance monitoring error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export const advancedCache = new AdvancedCache();
export default advancedCache;