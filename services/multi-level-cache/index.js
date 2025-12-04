import { redisService } from '../../server/services/redisService.js';
import { logger } from '../../server/services/loggerService.js';
import { advancedCache } from '../advanced-cache/index.js';

class MultiLevelCache {
    constructor() {
        this.cacheLevels = {
            // Level 1: In-memory cache (fastest, smallest)
            memory: {
                cache: new Map(),
                maxSize: 1000, // Max items
                ttl: 60, // 60 seconds
                hitRate: 0,
                missRate: 0
            },

            // Level 2: Redis cache (medium speed, larger)
            redis: {
                prefix: 'mlc:',
                ttlMultiplier: 2, // 2x memory cache TTL
                hitRate: 0,
                missRate: 0
            },

            // Level 3: Distributed cache (slower, largest)
            distributed: {
                prefix: 'dist:',
                ttlMultiplier: 4, // 4x memory cache TTL
                hitRate: 0,
                missRate: 0
            }
        };

        this.cacheHierarchy = ['memory', 'redis', 'distributed'];
        this.stats = {
            totalRequests: 0,
            totalHits: 0,
            totalMisses: 0,
            lastUpdated: new Date().toISOString()
        };
    }

    // Multi-level get with fallback
    async get(key, pattern = 'default') {
        this.stats.totalRequests++;

        // Try each cache level in order
        for (const level of this.cacheHierarchy) {
            try {
                const result = await this.getFromLevel(level, key, pattern);

                if (result !== null) {
                    this.stats.totalHits++;
                    this.cacheLevels[level].hitRate++;

                    // If we got a hit from a lower level, warm the higher levels
                    if (level !== 'memory') {
                        await this.warmHigherLevels(level, key, result, pattern);
                    }

                    return result;
                } else {
                    this.cacheLevels[level].missRate++;
                }

            } catch (error) {
                logger.error(`Cache level ${level} get error:`, { error: error.message, key });
                this.cacheLevels[level].missRate++;
            }
        }

        this.stats.totalMisses++;
        return null;
    }

    // Get from specific cache level
    async getFromLevel(level, key, pattern) {
        const levelConfig = this.cacheLevels[level];

        switch (level) {
            case 'memory':
                return this.getFromMemoryCache(key, pattern);

            case 'redis':
                return await this.getFromRedisCache(key, pattern);

            case 'distributed':
                return await this.getFromDistributedCache(key, pattern);

            default:
                return null;
        }
    }

    // Get from memory cache
    getFromMemoryCache(key, pattern) {
        const cacheKey = `${pattern}:${key}`;
        const cached = this.cacheLevels.memory.cache.get(cacheKey);

        if (cached && cached.expires > Date.now()) {
            return cached.value;
        }

        return null;
    }

    // Get from Redis cache
    async getFromRedisCache(key, pattern) {
        const cacheKey = `${this.cacheLevels.redis.prefix}${pattern}:${key}`;
        return await redisService.get(cacheKey);
    }

    // Get from distributed cache
    async getFromDistributedCache(key, pattern) {
        const cacheKey = `${this.cacheLevels.distributed.prefix}${pattern}:${key}`;

        // In a real distributed environment, this would connect to the cluster
        // For now, use Redis as fallback
        return await redisService.get(cacheKey);
    }

    // Multi-level set with write-through
    async set(key, value, pattern = 'default', ttl = null) {
        const results = [];

        // Set in all cache levels
        for (const level of this.cacheHierarchy) {
            try {
                const success = await this.setInLevel(level, key, value, pattern, ttl);
                results.push({ level, success });

            } catch (error) {
                logger.error(`Cache level ${level} set error:`, { error: error.message, key });
                results.push({ level, success: false, error: error.message });
            }
        }

        return results;
    }

    // Set in specific cache level
    async setInLevel(level, key, value, pattern, ttl) {
        const levelConfig = this.cacheLevels[level];

        switch (level) {
            case 'memory':
                return this.setInMemoryCache(key, value, pattern, ttl);

            case 'redis':
                return await this.setInRedisCache(key, value, pattern, ttl);

            case 'distributed':
                return await this.setInDistributedCache(key, value, pattern, ttl);

            default:
                return false;
        }
    }

    // Set in memory cache
    setInMemoryCache(key, value, pattern, ttl) {
        const cacheKey = `${pattern}:${key}`;
        const effectiveTtl = ttl || this.cacheLevels.memory.ttl;
        const expires = Date.now() + (effectiveTtl * 1000);

        // Check if cache is full
        if (this.cacheLevels.memory.cache.size >= this.cacheLevels.memory.maxSize) {
            // Evict oldest item
            const oldestKey = this.cacheLevels.memory.cache.keys().next().value;
            this.cacheLevels.memory.cache.delete(oldestKey);
        }

        this.cacheLevels.memory.cache.set(cacheKey, {
            value,
            expires,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    // Set in Redis cache
    async setInRedisCache(key, value, pattern, ttl) {
        const cacheKey = `${this.cacheLevels.redis.prefix}${pattern}:${key}`;
        const effectiveTtl = ttl ? ttl * this.cacheLevels.redis.ttlMultiplier : pattern.ttl * this.cacheLevels.redis.ttlMultiplier;

        return await redisService.set(cacheKey, value, effectiveTtl);
    }

    // Set in distributed cache
    async setInDistributedCache(key, value, pattern, ttl) {
        const cacheKey = `${this.cacheLevels.distributed.prefix}${pattern}:${key}`;
        const effectiveTtl = ttl ? ttl * this.cacheLevels.distributed.ttlMultiplier : pattern.ttl * this.cacheLevels.distributed.ttlMultiplier;

        // In a real distributed environment, this would write to the cluster
        // For now, use Redis as fallback
        return await redisService.set(cacheKey, value, effectiveTtl);
    }

    // Warm higher cache levels after a lower-level hit
    async warmHigherLevels(sourceLevel, key, value, pattern) {
        const sourceIndex = this.cacheHierarchy.indexOf(sourceLevel);

        // Warm all levels above the source level
        for (let i = 0; i < sourceIndex; i++) {
            const targetLevel = this.cacheHierarchy[i];
            try {
                await this.setInLevel(targetLevel, key, value, pattern);
                logger.debug('Warmed higher cache level', {
                    sourceLevel,
                    targetLevel,
                    key,
                    pattern
                });

            } catch (error) {
                logger.error('Cache warming error:', {
                    error: error.message,
                    sourceLevel,
                    targetLevel,
                    key
                });
            }
        }
    }

    // Multi-level delete with cascade
    async delete(key, pattern = 'default') {
        const results = [];

        // Delete from all cache levels
        for (const level of this.cacheHierarchy) {
            try {
                const success = await this.deleteFromLevel(level, key, pattern);
                results.push({ level, success });

            } catch (error) {
                logger.error(`Cache level ${level} delete error:`, { error: error.message, key });
                results.push({ level, success: false, error: error.message });
            }
        }

        return results;
    }

    // Delete from specific cache level
    async deleteFromLevel(level, key, pattern) {
        const levelConfig = this.cacheLevels[level];

        switch (level) {
            case 'memory':
                return this.deleteFromMemoryCache(key, pattern);

            case 'redis':
                return await this.deleteFromRedisCache(key, pattern);

            case 'distributed':
                return await this.deleteFromDistributedCache(key, pattern);

            default:
                return false;
        }
    }

    // Delete from memory cache
    deleteFromMemoryCache(key, pattern) {
        const cacheKey = `${pattern}:${key}`;
        return this.cacheLevels.memory.cache.delete(cacheKey);
    }

    // Delete from Redis cache
    async deleteFromRedisCache(key, pattern) {
        const cacheKey = `${this.cacheLevels.redis.prefix}${pattern}:${key}`;
        return await redisService.del(cacheKey);
    }

    // Delete from distributed cache
    async deleteFromDistributedCache(key, pattern) {
        const cacheKey = `${this.cacheLevels.distributed.prefix}${pattern}:${key}`;

        // In a real distributed environment, this would delete from the cluster
        // For now, use Redis as fallback
        return await redisService.del(cacheKey);
    }

    // Cache stampede protection
    async getWithStampedeProtection(key, pattern, dataFetcher, ttl = null) {
        const cacheKey = `stampede:${pattern}:${key}`;
        const lockKey = `lock:${cacheKey}`;
        const lockTtl = 10; // 10 seconds lock

        try {
            // Try to get from cache first
            const cachedValue = await this.get(key, pattern);
            if (cachedValue !== null) {
                return cachedValue;
            }

            // Try to acquire lock
            const lockAcquired = await redisService.set(lockKey, 'locked', lockTtl, 'NX');
            if (lockAcquired) {
                // We got the lock - we're responsible for fetching and caching
                try {
                    logger.debug('Acquired stampede protection lock', { key, pattern });

                    // Fetch the data
                    const data = await dataFetcher();

                    // Cache the result
                    await this.set(key, data, pattern, ttl);

                    return data;

                } finally {
                    // Release the lock
                    await redisService.del(lockKey);
                    logger.debug('Released stampede protection lock', { key, pattern });
                }
            } else {
                // Lock not acquired - wait and retry
                logger.debug('Stampede protection: waiting for another process', { key, pattern });

                // Wait a short time and retry
                await new Promise(resolve => setTimeout(resolve, 100));
                return this.getWithStampedeProtection(key, pattern, dataFetcher, ttl);
            }

        } catch (error) {
            logger.error('Stampede protection error:', { error: error.message, key, pattern });
            throw error;
        }
    }

    // Stale-while-revalidate strategy
    async getWithStaleWhileRevalidate(key, pattern, dataFetcher, ttl = null, staleTtl = null) {
        const staleTtlSeconds = staleTtl || Math.round(ttl * 0.5); // Default to 50% of main TTL

        try {
            // Try to get fresh data from cache
            const freshData = await this.get(key, pattern);
            if (freshData !== null) {
                return { data: freshData, source: 'cache', stale: false };
            }

            // If not in cache, try to get stale data
            const staleData = await this.getStaleData(key, pattern);
            if (staleData !== null) {
                // Return stale data and start background revalidation
                this.startBackgroundRevalidation(key, pattern, dataFetcher, ttl, staleTtlSeconds);

                return { data: staleData, source: 'cache', stale: true };
            }

            // No cached data - fetch fresh
            const freshDataFromSource = await dataFetcher();
            await this.set(key, freshDataFromSource, pattern, ttl);

            return { data: freshDataFromSource, source: 'source', stale: false };

        } catch (error) {
            logger.error('Stale-while-revalidate error:', { error: error.message, key, pattern });
            throw error;
        }
    }

    // Get stale data (data that might be expired but still usable)
    async getStaleData(key, pattern) {
        try {
            // Check memory cache for stale data
            const memoryCacheKey = `${pattern}:${key}`;
            const memoryCached = this.cacheLevels.memory.cache.get(memoryCacheKey);

            if (memoryCached && memoryCached.value) {
                return memoryCached.value;
            }

            // Check Redis for stale data
            const redisCacheKey = `${this.cacheLevels.redis.prefix}${pattern}:${key}`;
            const redisCached = await redisService.get(redisCacheKey);

            if (redisCached) {
                return redisCached;
            }

            return null;

        } catch (error) {
            logger.error('Stale data retrieval error:', { error: error.message, key, pattern });
            return null;
        }
    }

    // Start background revalidation
    async startBackgroundRevalidation(key, pattern, dataFetcher, ttl, staleTtl) {
        // Run in background without blocking
        setImmediate(async () => {
            try {
                logger.debug('Starting background revalidation', { key, pattern });

                // Fetch fresh data
                const freshData = await dataFetcher();

                // Update cache with fresh data
                await this.set(key, freshData, pattern, ttl);

                // Also update stale cache with longer TTL
                await this.setStaleCache(key, freshData, pattern, staleTtl);

                logger.debug('Background revalidation completed', { key, pattern });

            } catch (error) {
                logger.error('Background revalidation error:', { error: error.message, key, pattern });
            }
        });
    }

    // Set stale cache with longer TTL
    async setStaleCache(key, value, pattern, staleTtl) {
        const staleCacheKey = `stale:${pattern}:${key}`;

        // Store in memory cache with stale TTL
        this.cacheLevels.memory.cache.set(staleCacheKey, {
            value,
            expires: Date.now() + (staleTtl * 1000),
            timestamp: new Date().toISOString(),
            isStale: true
        });

        // Also store in Redis with stale TTL
        const redisStaleKey = `${this.cacheLevels.redis.prefix}stale:${pattern}:${key}`;
        await redisService.set(redisStaleKey, value, staleTtl);
    }

    // Intelligent cache invalidation
    async invalidateIntelligently(key, pattern, invalidationReason) {
        try {
            logger.info('Intelligent cache invalidation', {
                key,
                pattern,
                reason: invalidationReason
            });

            // Get current cache statistics for this key
            const cacheStats = await this.getCacheStatistics(key, pattern);

            // Determine invalidation strategy based on usage
            const strategy = this.determineInvalidationStrategy(cacheStats, invalidationReason);

            // Execute the strategy
            await this.executeInvalidationStrategy(strategy, key, pattern);

            return { success: true, strategy };

        } catch (error) {
            logger.error('Intelligent invalidation error:', { error: error.message, key, pattern });
            return { success: false, error: error.message };
        }
    }

    // Get cache statistics for a key
    async getCacheStatistics(key, pattern) {
        return {
            accessCount: 10, // Would be tracked in real implementation
            lastAccessed: new Date().toISOString(),
            hitRate: 0.85, // 85% hit rate
            size: 1024, // Size in bytes
            dependencies: [] // Dependent keys
        };
    }

    // Determine invalidation strategy
    determineInvalidationStrategy(stats, reason) {
        // Simple strategy determination
        if (reason === 'data_updated') {
            return 'immediate_invalidation';
        } else if (reason === 'low_hit_rate' && stats.hitRate < 0.3) {
            return 'lazy_invalidation';
        } else if (reason === 'size_pressure' && stats.size > 10000) {
            return 'selective_invalidation';
        } else {
            return 'standard_invalidation';
        }
    }

    // Execute invalidation strategy
    async executeInvalidationStrategy(strategy, key, pattern) {
        switch (strategy) {
            case 'immediate_invalidation':
                await this.delete(key, pattern);
                break;

            case 'lazy_invalidation':
                // Mark for lazy invalidation
                await redisService.set(`lazy_invalidate:${pattern}:${key}`, 'marked', 300);
                break;

            case 'selective_invalidation':
                // Only invalidate if certain conditions are met
                const shouldInvalidate = await this.checkSelectiveConditions(key, pattern);
                if (shouldInvalidate) {
                    await this.delete(key, pattern);
                }
                break;

            case 'standard_invalidation':
            default:
                await this.delete(key, pattern);
                break;
        }
    }

    // Check selective invalidation conditions
    async checkSelectiveConditions(key, pattern) {
        // Simple condition check
        return true; // Always invalidate for now
    }

    // Cache warming for critical content
    async warmCriticalContent(criticalKeys) {
        try {
            logger.info('Starting critical content cache warming', {
                keyCount: criticalKeys.length
            });

            const results = [];

            for (const { key, pattern, dataFetcher, priority } of criticalKeys) {
                try {
                    // Check if already cached
                    const cached = await this.get(key, pattern);
                    if (cached !== null) {
                        logger.debug('Critical content already cached', { key, pattern });
                        results.push({ key, pattern, status: 'already_cached' });
                        continue;
                    }

                    // Fetch data with stampede protection
                    const data = await this.getWithStampedeProtection(
                        key,
                        pattern,
                        dataFetcher
                    );

                    // Cache with extended TTL for critical content
                    const criticalTtl = this.getCriticalContentTtl(priority);
                    await this.set(key, data, pattern, criticalTtl);

                    // Also set in stale cache for fallback
                    await this.setStaleCache(key, data, pattern, criticalTtl * 2);

                    logger.info('Warmed critical content', { key, pattern, priority });
                    results.push({ key, pattern, status: 'warmed', priority });

                } catch (error) {
                    logger.error('Critical content warming error:', {
                        error: error.message,
                        key,
                        pattern
                    });
                    results.push({ key, pattern, status: 'error', error: error.message });
                }
            }

            return results;

        } catch (error) {
            logger.error('Critical content warming error:', { error: error.message });
            return [];
        }
    }

    // Get TTL based on priority
    getCriticalContentTtl(priority) {
        switch (priority) {
            case 'critical': return 86400; // 24 hours
            case 'high': return 3600; // 1 hour
            case 'medium': return 1800; // 30 minutes
            case 'low': return 900; // 15 minutes
            default: return 3600; // 1 hour
        }
    }

    // Get cache performance metrics
    getPerformanceMetrics() {
        const totalRequests = this.stats.totalRequests;
        const hitRate = totalRequests > 0 ? this.stats.totalHits / totalRequests : 0;
        const missRate = totalRequests > 0 ? this.stats.totalMisses / totalRequests : 0;

        return {
            ...this.stats,
            hitRate,
            missRate,
            levelStats: Object.fromEntries(
                Object.entries(this.cacheLevels).map(([level, config]) => ({
                    [level]: {
                        hitRate: config.hitRate,
                        missRate: config.missRate,
                        efficiency: config.hitRate + config.missRate > 0
                            ? config.hitRate / (config.hitRate + config.missRate)
                            : 0
                    }
                }))
            ),
            lastUpdated: new Date().toISOString()
        };
    }

    // Reset statistics
    resetStatistics() {
        this.stats = {
            totalRequests: 0,
            totalHits: 0,
            totalMisses: 0,
            lastUpdated: new Date().toISOString()
        };

        for (const level of this.cacheHierarchy) {
            this.cacheLevels[level].hitRate = 0;
            this.cacheLevels[level].missRate = 0;
        }
    }
}

export const multiLevelCache = new MultiLevelCache();
export default multiLevelCache;