import { redisService } from '../../server/services/redisService.js';
import { logger } from '../../server/services/loggerService.js';
import { multiLevelCache } from '../multi-level-cache/index.js';

class CacheStampedeProtection {
    constructor() {
        this.lockPrefix = 'stampede:lock:';
        this.lockTtl = 10; // 10 seconds default lock TTL
        this.maxRetries = 3;
        this.retryDelay = 100; // 100ms between retries

        this.stats = {
            totalRequests: 0,
            stampedesPrevented: 0,
            locksAcquired: 0,
            retries: 0,
            errors: 0
        };
    }

    // Main stampede protection method
    async protect(key, pattern, dataFetcher, options = {}) {
        this.stats.totalRequests++;

        const {
            ttl = null,
            lockTtl = this.lockTtl,
            maxRetries = this.maxRetries,
            retryDelay = this.retryDelay
        } = options;

        const cacheKey = `stampede:${pattern}:${key}`;
        const lockKey = `${this.lockPrefix}${pattern}:${key}`;

        try {
            // First try to get from cache
            const cachedValue = await multiLevelCache.get(key, pattern);
            if (cachedValue !== null) {
                logger.debug('Stampede protection: cache hit', { key, pattern });
                return { data: cachedValue, source: 'cache', stampedePrevented: false };
            }

            // Try to acquire lock
            const lockAcquired = await this.acquireLock(lockKey, lockTtl);

            if (lockAcquired) {
                this.stats.locksAcquired++;
                logger.debug('Stampede protection: lock acquired', { key, pattern });

                try {
                    // We have the lock - fetch and cache the data
                    const data = await dataFetcher();

                    // Cache the result with multi-level caching
                    await multiLevelCache.set(key, data, pattern, ttl);

                    // Also set in stale cache for fallback
                    if (ttl) {
                        await multiLevelCache.setStaleCache(key, data, pattern, ttl * 2);
                    }

                    return { data, source: 'fetched', stampedePrevented: true };

                } finally {
                    // Always release the lock
                    await this.releaseLock(lockKey);
                    logger.debug('Stampede protection: lock released', { key, pattern });
                }
            } else {
                // Lock not acquired - this indicates a potential stampede
                this.stats.stampedesPrevented++;
                logger.debug('Stampede protection: prevented potential stampede', { key, pattern });

                // Wait and retry with exponential backoff
                return this.retryWithBackoff(key, pattern, dataFetcher, {
                    ttl,
                    lockTtl,
                    maxRetries,
                    retryDelay,
                    currentRetry: 0
                });
            }

        } catch (error) {
            this.stats.errors++;
            logger.error('Stampede protection error:', { error: error.message, key, pattern });
            throw error;
        }
    }

    // Acquire lock with Redis SET NX
    async acquireLock(lockKey, lockTtl) {
        try {
            return await redisService.set(lockKey, 'locked', lockTtl, 'NX');
        } catch (error) {
            logger.error('Lock acquisition error:', { error: error.message, lockKey });
            return false;
        }
    }

    // Release lock
    async releaseLock(lockKey) {
        try {
            await redisService.del(lockKey);
        } catch (error) {
            logger.error('Lock release error:', { error: error.message, lockKey });
        }
    }

    // Retry with exponential backoff
    async retryWithBackoff(key, pattern, dataFetcher, options) {
        const {
            ttl,
            lockTtl,
            maxRetries,
            retryDelay,
            currentRetry
        } = options;

        if (currentRetry >= maxRetries) {
            logger.warn('Stampede protection: max retries reached', {
                key,
                pattern,
                retries: currentRetry
            });
            throw new Error('Max stampede protection retries reached');
        }

        // Exponential backoff
        const delay = retryDelay * Math.pow(2, currentRetry);
        await new Promise(resolve => setTimeout(resolve, delay));

        this.stats.retries++;
        logger.debug('Stampede protection: retry attempt', {
            key,
            pattern,
            attempt: currentRetry + 1,
            delay
        });

        // Try again
        return this.protect(key, pattern, dataFetcher, {
            ttl,
            lockTtl,
            maxRetries,
            retryDelay,
            currentRetry: currentRetry + 1
        });
    }

    // Advanced stampede protection with early refresh
    async protectWithEarlyRefresh(key, pattern, dataFetcher, options = {}) {
        const {
            ttl = null,
            refreshThreshold = 0.8, // Refresh when 80% of TTL has passed
            ...protectOptions
        } = options;

        try {
            // Get current cached data
            const cachedValue = await multiLevelCache.get(key, pattern);

            if (cachedValue !== null) {
                // Check if we should refresh early
                const shouldRefreshEarly = await this.shouldRefreshEarly(key, pattern, ttl, refreshThreshold);

                if (shouldRefreshEarly) {
                    logger.debug('Stampede protection: early refresh triggered', { key, pattern });

                    // Start background refresh
                    this.startBackgroundRefresh(key, pattern, dataFetcher, ttl, protectOptions);
                }

                return { data: cachedValue, source: 'cache', earlyRefresh: shouldRefreshEarly };
            }

            // No cache - use standard protection
            return this.protect(key, pattern, dataFetcher, protectOptions);

        } catch (error) {
            logger.error('Early refresh stampede protection error:', { error: error.message, key, pattern });
            throw error;
        }
    }

    // Check if early refresh should be triggered
    async shouldRefreshEarly(key, pattern, ttl, refreshThreshold) {
        try {
            // Get TTL from cache
            const cacheTtl = await this.getCacheTtl(key, pattern);

            if (cacheTtl === -2) {
                return false; // Key doesn't exist
            }

            if (cacheTtl === -1) {
                return false; // Key has no TTL
            }

            // Calculate if we're past the refresh threshold
            const effectiveTtl = ttl || (await this.getPatternTtl(pattern));
            const thresholdTime = effectiveTtl * refreshThreshold;

            return cacheTtl <= thresholdTime;

        } catch (error) {
            logger.error('Early refresh check error:', { error: error.message, key, pattern });
            return false;
        }
    }

    // Get cache TTL
    async getCacheTtl(key, pattern) {
        try {
            // Check memory cache
            const memoryCacheKey = `${pattern}:${key}`;
            const memoryCached = multiLevelCache.cacheLevels.memory.cache.get(memoryCacheKey);

            if (memoryCached) {
                const remainingTtl = Math.max(0, memoryCached.expires - Date.now()) / 1000;
                return Math.round(remainingTtl);
            }

            // Check Redis cache
            const redisCacheKey = `${multiLevelCache.cacheLevels.redis.prefix}${pattern}:${key}`;
            return await redisService.ttl(redisCacheKey);

        } catch (error) {
            logger.error('Cache TTL check error:', { error: error.message, key, pattern });
            return -2; // Error indicator
        }
    }

    // Get pattern TTL
    async getPatternTtl(pattern) {
        const cacheConfig = multiLevelCache.cacheLevels.redis.cachePatterns?.[pattern];
        return cacheConfig?.ttl || 300; // Default 5 minutes
    }

    // Start background refresh
    async startBackgroundRefresh(key, pattern, dataFetcher, ttl, protectOptions) {
        // Run in background without blocking the current request
        setImmediate(async () => {
            try {
                logger.debug('Starting background refresh', { key, pattern });

                // Use stampede protection for the refresh
                const result = await this.protect(key, pattern, dataFetcher, protectOptions);

                if (result.source === 'fetched') {
                    logger.info('Background refresh completed', { key, pattern });
                }

            } catch (error) {
                logger.error('Background refresh error:', { error: error.message, key, pattern });
            }
        });
    }

    // Distributed stampede protection for cluster environments
    async protectDistributed(key, pattern, dataFetcher, options = {}) {
        const {
            ttl = null,
            clusterLockTtl = 15, // Longer TTL for distributed locks
            ...protectOptions
        } = options;

        const lockKey = `${this.lockPrefix}dist:${pattern}:${key}`;

        try {
            // Try to acquire distributed lock
            const lockAcquired = await this.acquireDistributedLock(lockKey, clusterLockTtl);

            if (lockAcquired) {
                logger.debug('Distributed stampede protection: lock acquired', { key, pattern });

                try {
                    // Standard protection with the distributed lock
                    return await this.protect(key, pattern, dataFetcher, {
                        ...protectOptions,
                        lockTtl: clusterLockTtl
                    });

                } finally {
                    await this.releaseDistributedLock(lockKey);
                }
            } else {
                // Fall back to local stampede protection
                logger.debug('Distributed stampede protection: using local fallback', { key, pattern });
                return this.protect(key, pattern, dataFetcher, protectOptions);
            }

        } catch (error) {
            logger.error('Distributed stampede protection error:', { error: error.message, key, pattern });
            throw error;
        }
    }

    // Acquire distributed lock
    async acquireDistributedLock(lockKey, lockTtl) {
        try {
            // In a real distributed environment, this would use a distributed lock service
            // For now, use Redis with longer TTL
            return await redisService.set(lockKey, 'distributed_locked', lockTtl, 'NX');
        } catch (error) {
            logger.error('Distributed lock acquisition error:', { error: error.message, lockKey });
            return false;
        }
    }

    // Release distributed lock
    async releaseDistributedLock(lockKey) {
        try {
            await redisService.del(lockKey);
        } catch (error) {
            logger.error('Distributed lock release error:', { error: error.message, lockKey });
        }
    }

    // Get stampede protection statistics
    getStatistics() {
        const totalRequests = this.stats.totalRequests;
        const preventionRate = totalRequests > 0
            ? this.stats.stampedesPrevented / totalRequests
            : 0;

        return {
            ...this.stats,
            preventionRate,
            efficiency: this.calculateEfficiency(),
            lastUpdated: new Date().toISOString()
        };
    }

    // Calculate protection efficiency
    calculateEfficiency() {
        const totalOperations = this.stats.totalRequests + this.stats.retries;
        if (totalOperations === 0) return 0;

        const successRate = (this.stats.totalRequests - this.stats.errors) / this.stats.totalRequests;
        const retryEfficiency = this.stats.retries > 0
            ? this.stats.stampedesPrevented / this.stats.retries
            : 1;

        return (successRate * 0.7 + retryEfficiency * 0.3); // Weighted average
    }

    // Reset statistics
    resetStatistics() {
        this.stats = {
            totalRequests: 0,
            stampedesPrevented: 0,
            locksAcquired: 0,
            retries: 0,
            errors: 0
        };
    }

    // Monitor active stampede situations
    async monitorActiveStampedes() {
        try {
            // Find all active locks
            const lockKeys = await redisService.keys(`${this.lockPrefix}*`);
            const activeStampedes = [];

            for (const lockKey of lockKeys) {
                const lockValue = await redisService.get(lockKey);
                if (lockValue) {
                    // Extract key info from lock key
                    const match = lockKey.match(/stampede:lock:([^:]+):([^:]+)/);
                    if (match) {
                        const [, pattern, key] = match;
                        activeStampedes.push({
                            key,
                            pattern,
                            lockKey,
                            lockValue,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }

            return {
                count: activeStampedes.length,
                stampedes: activeStampedes,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Active stampede monitoring error:', { error: error.message });
            return {
                count: 0,
                stampedes: [],
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export const cacheStampedeProtection = new CacheStampedeProtection();
export default cacheStampedeProtection;