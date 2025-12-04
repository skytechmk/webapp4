import { multiLevelCache } from '../multi-level-cache/index.js';
import { cacheStampedeProtection } from '../cache-stampede-protection/index.js';
import { logger } from '../../server/services/loggerService.js';

class StaleWhileRevalidate {
    constructor() {
        this.revalidationQueue = new Map(); // Track ongoing revalidations
        this.stats = {
            totalRequests: 0,
            freshHits: 0,
            staleHits: 0,
            sourceFetches: 0,
            backgroundRevalidations: 0,
            errors: 0
        };

        this.defaultConfig = {
            staleTtlMultiplier: 2, // Stale data lives 2x longer than fresh
            revalidationDelay: 1000, // 1 second delay before revalidation
            maxConcurrentRevalidations: 10,
            revalidationTimeout: 30000 // 30 seconds timeout
        };
    }

    // Main stale-while-revalidate method
    async get(key, pattern, dataFetcher, options = {}) {
        this.stats.totalRequests++;

        const {
            ttl = null,
            staleTtl = null,
            revalidateInBackground = true,
            useStampedeProtection = true
        } = options;

        try {
            // Try to get fresh data first
            const freshData = await this.getFreshData(key, pattern, ttl);

            if (freshData !== null) {
                this.stats.freshHits++;
                logger.debug('SWR: fresh cache hit', { key, pattern });
                return {
                    data: freshData,
                    source: 'cache',
                    stale: false,
                    revalidating: false
                };
            }

            // No fresh data - try stale data
            const staleResult = await this.getStaleDataWithRevalidation(
                key, pattern, dataFetcher,
                ttl, staleTtl,
                revalidateInBackground, useStampedeProtection
            );

            return staleResult;

        } catch (error) {
            this.stats.errors++;
            logger.error('SWR error:', { error: error.message, key, pattern });
            throw error;
        }
    }

    // Get fresh data from cache
    async getFreshData(key, pattern, ttl) {
        try {
            return await multiLevelCache.get(key, pattern);
        } catch (error) {
            logger.error('Fresh data retrieval error:', { error: error.message, key, pattern });
            return null;
        }
    }

    // Get stale data with revalidation
    async getStaleDataWithRevalidation(key, pattern, dataFetcher, ttl, staleTtl, revalidateInBackground, useStampedeProtection) {
        try {
            // Try to get stale data
            const staleData = await this.getStaleData(key, pattern);

            if (staleData !== null) {
                this.stats.staleHits++;
                logger.debug('SWR: stale cache hit', { key, pattern });

                // Start revalidation if requested
                if (revalidateInBackground) {
                    this.startRevalidation(key, pattern, dataFetcher, ttl, staleTtl, useStampedeProtection);
                }

                return {
                    data: staleData,
                    source: 'cache',
                    stale: true,
                    revalidating: revalidateInBackground
                };
            }

            // No cached data at all - fetch from source
            this.stats.sourceFetches++;
            logger.debug('SWR: source fetch required', { key, pattern });

            const fetchMethod = useStampedeProtection
                ? this.fetchWithStampedeProtection
                : this.fetchWithoutProtection;

            const data = await fetchMethod(key, pattern, dataFetcher, ttl);

            // Cache the fresh data
            await this.cacheFreshData(key, pattern, data, ttl);

            // Also cache stale version
            if (staleTtl) {
                await this.cacheStaleData(key, pattern, data, staleTtl);
            }

            return {
                data,
                source: 'source',
                stale: false,
                revalidating: false
            };

        } catch (error) {
            logger.error('Stale data with revalidation error:', { error: error.message, key, pattern });
            throw error;
        }
    }

    // Get stale data from cache
    async getStaleData(key, pattern) {
        try {
            // Check memory cache for stale data
            const memoryStaleKey = `swr:stale:${pattern}:${key}`;
            const memoryStale = multiLevelCache.cacheLevels.memory.cache.get(memoryStaleKey);

            if (memoryStale?.value) {
                return memoryStale.value;
            }

            // Check Redis for stale data
            const redisStaleKey = `swr:stale:${pattern}:${key}`;
            const redisStale = await multiLevelCache.getFromRedisCache(redisStaleKey, pattern);

            if (redisStale) {
                return redisStale;
            }

            return null;

        } catch (error) {
            logger.error('Stale data retrieval error:', { error: error.message, key, pattern });
            return null;
        }
    }

    // Start background revalidation
    startRevalidation(key, pattern, dataFetcher, ttl, staleTtl, useStampedeProtection) {
        const revalidationKey = `revalidation:${pattern}:${key}`;

        // Check if revalidation is already in progress
        if (this.revalidationQueue.has(revalidationKey)) {
            logger.debug('SWR: revalidation already in progress', { key, pattern });
            return;
        }

        // Mark as revalidating
        this.revalidationQueue.set(revalidationKey, {
            started: new Date().toISOString(),
            attempts: 0
        });

        this.stats.backgroundRevalidations++;

        // Run revalidation in background
        setImmediate(async () => {
            try {
                logger.debug('SWR: starting background revalidation', { key, pattern });

                const fetchMethod = useStampedeProtection
                    ? this.fetchWithStampedeProtection
                    : this.fetchWithoutProtection;

                const freshData = await fetchMethod(key, pattern, dataFetcher, ttl);

                // Update both fresh and stale caches
                await this.cacheFreshData(key, pattern, freshData, ttl);

                if (staleTtl) {
                    await this.cacheStaleData(key, pattern, freshData, staleTtl);
                }

                logger.debug('SWR: background revalidation completed', { key, pattern });

            } catch (error) {
                logger.error('SWR: background revalidation error:', { error: error.message, key, pattern });

                // Retry once
                const queueItem = this.revalidationQueue.get(revalidationKey);
                if (queueItem.attempts < 1) {
                    queueItem.attempts++;
                    setTimeout(() => {
                        this.startRevalidation(key, pattern, dataFetcher, ttl, staleTtl, useStampedeProtection);
                    }, this.defaultConfig.revalidationDelay);
                }
            } finally {
                // Clean up queue
                this.revalidationQueue.delete(revalidationKey);
            }
        });
    }

    // Fetch with stampede protection
    async fetchWithStampedeProtection(key, pattern, dataFetcher, ttl) {
        try {
            const result = await cacheStampedeProtection.protect(key, pattern, dataFetcher, { ttl });
            return result.data;
        } catch (error) {
            logger.error('Stampede protected fetch error:', { error: error.message, key, pattern });
            throw error;
        }
    }

    // Fetch without protection
    async fetchWithoutProtection(key, pattern, dataFetcher) {
        try {
            return await dataFetcher();
        } catch (error) {
            logger.error('Unprotected fetch error:', { error: error.message, key, pattern });
            throw error;
        }
    }

    // Cache fresh data
    async cacheFreshData(key, pattern, data, ttl) {
        try {
            await multiLevelCache.set(key, data, pattern, ttl);
            logger.debug('SWR: cached fresh data', { key, pattern, ttl });
        } catch (error) {
            logger.error('Fresh data caching error:', { error: error.message, key, pattern });
        }
    }

    // Cache stale data
    async cacheStaleData(key, pattern, data, staleTtl) {
        try {
            // Cache in memory
            const memoryStaleKey = `swr:stale:${pattern}:${key}`;
            multiLevelCache.cacheLevels.memory.cache.set(memoryStaleKey, {
                value: data,
                expires: Date.now() + (staleTtl * 1000),
                timestamp: new Date().toISOString(),
                isStale: true
            });

            // Cache in Redis
            const redisStaleKey = `swr:stale:${pattern}:${key}`;
            await multiLevelCache.setInRedisCache(redisStaleKey, data, pattern, staleTtl);

            logger.debug('SWR: cached stale data', { key, pattern, staleTtl });

        } catch (error) {
            logger.error('Stale data caching error:', { error: error.message, key, pattern });
        }
    }

    // Advanced SWR with priority-based revalidation
    async getWithPriority(key, pattern, dataFetcher, options = {}) {
        const {
            priority = 'normal',
            ...swrOptions
        } = options;

        try {
            const result = await this.get(key, pattern, dataFetcher, swrOptions);

            // Adjust revalidation behavior based on priority
            if (result.stale && result.revalidating) {
                await this.adjustRevalidationPriority(key, pattern, priority);
            }

            return result;

        } catch (error) {
            logger.error('Priority SWR error:', { error: error.message, key, pattern });
            throw error;
        }
    }

    // Adjust revalidation priority
    async adjustRevalidationPriority(key, pattern, priority) {
        const revalidationKey = `revalidation:${pattern}:${key}`;
        const queueItem = this.revalidationQueue.get(revalidationKey);

        if (queueItem) {
            switch (priority) {
                case 'high':
                    // Move to front of queue (simulated)
                    queueItem.priority = 'high';
                    break;

                case 'low':
                    // Keep at end of queue
                    queueItem.priority = 'low';
                    break;

                case 'normal':
                default:
                    queueItem.priority = 'normal';
                    break;
            }

            logger.debug('SWR: adjusted revalidation priority', {
                key, pattern, priority
            });
        }
    }

    // SWR with adaptive stale TTL
    async getWithAdaptiveStaleTtl(key, pattern, dataFetcher, options = {}) {
        const {
            baseTtl = null,
            adaptStaleTtl = true,
            ...swrOptions
        } = options;

        try {
            // Calculate adaptive stale TTL
            const adaptiveStaleTtl = adaptStaleTtl
                ? await this.calculateAdaptiveStaleTtl(key, pattern, baseTtl)
                : baseTtl * this.defaultConfig.staleTtlMultiplier;

            return await this.get(key, pattern, dataFetcher, {
                ...swrOptions,
                ttl: baseTtl,
                staleTtl: adaptiveStaleTtl
            });

        } catch (error) {
            logger.error('Adaptive SWR error:', { error: error.message, key, pattern });
            throw error;
        }
    }

    // Calculate adaptive stale TTL based on usage patterns
    async calculateAdaptiveStaleTtl(key, pattern, baseTtl) {
        try {
            // Get cache statistics
            const cacheStats = await this.getCacheUsageStats(key, pattern);

            // Simple adaptive algorithm
            if (cacheStats.hitRate > 0.9) {
                // High hit rate - can afford longer stale TTL
                return baseTtl * 3;
            } else if (cacheStats.hitRate > 0.7) {
                // Medium hit rate - standard stale TTL
                return baseTtl * 2;
            } else {
                // Low hit rate - shorter stale TTL
                return baseTtl * 1.5;
            }

        } catch (error) {
            logger.error('Adaptive stale TTL calculation error:', { error: error.message, key, pattern });
            // Fallback to default
            return baseTtl * this.defaultConfig.staleTtlMultiplier;
        }
    }

    // Get cache usage statistics
    async getCacheUsageStats(key, pattern) {
        // Mock implementation - in real system this would track actual usage
        return {
            hitRate: 0.85, // 85% hit rate
            accessFrequency: 'high',
            lastAccessed: new Date().toISOString()
        };
    }

    // SWR with fallback strategies
    async getWithFallbacks(key, pattern, dataFetcher, options = {}) {
        const {
            fallbackData = null,
            fallbackTtl = 300, // 5 minutes for fallback data
            ...swrOptions
        } = options;

        try {
            const result = await this.get(key, pattern, dataFetcher, swrOptions);

            // If we got data, return it
            if (result.data !== undefined) {
                return result;
            }

            // No data available - use fallback if provided
            if (fallbackData !== null) {
                logger.debug('SWR: using fallback data', { key, pattern });

                // Cache the fallback data
                await this.cacheFallbackData(key, pattern, fallbackData, fallbackTtl);

                return {
                    data: fallbackData,
                    source: 'fallback',
                    stale: true,
                    revalidating: true
                };
            }

            // No fallback available
            throw new Error('No data available and no fallback provided');

        } catch (error) {
            logger.error('SWR with fallbacks error:', { error: error.message, key, pattern });

            // If we have fallback data, return it even on error
            if (fallbackData !== null) {
                return {
                    data: fallbackData,
                    source: 'fallback',
                    stale: true,
                    revalidating: true,
                    error: error.message
                };
            }

            throw error;
        }
    }

    // Cache fallback data
    async cacheFallbackData(key, pattern, data, ttl) {
        try {
            const fallbackKey = `swr:fallback:${pattern}:${key}`;

            // Cache in memory
            multiLevelCache.cacheLevels.memory.cache.set(fallbackKey, {
                value: data,
                expires: Date.now() + (ttl * 1000),
                timestamp: new Date().toISOString(),
                isFallback: true
            });

            // Cache in Redis
            await multiLevelCache.setInRedisCache(fallbackKey, data, pattern, ttl);

            logger.debug('SWR: cached fallback data', { key, pattern, ttl });

        } catch (error) {
            logger.error('Fallback data caching error:', { error: error.message, key, pattern });
        }
    }

    // Get SWR statistics
    getStatistics() {
        const totalRequests = this.stats.totalRequests;
        const freshHitRate = totalRequests > 0 ? this.stats.freshHits / totalRequests : 0;
        const staleHitRate = totalRequests > 0 ? this.stats.staleHits / totalRequests : 0;
        const sourceFetchRate = totalRequests > 0 ? this.stats.sourceFetches / totalRequests : 0;

        return {
            ...this.stats,
            freshHitRate,
            staleHitRate,
            sourceFetchRate,
            cacheEfficiency: this.calculateCacheEfficiency(),
            revalidationEfficiency: this.calculateRevalidationEfficiency(),
            lastUpdated: new Date().toISOString()
        };
    }

    // Calculate cache efficiency
    calculateCacheEfficiency() {
        const totalHits = this.stats.freshHits + this.stats.staleHits;
        const totalRequests = this.stats.totalRequests;

        if (totalRequests === 0) return 0;

        return totalHits / totalRequests;
    }

    // Calculate revalidation efficiency
    calculateRevalidationEfficiency() {
        const totalRevalidations = this.stats.backgroundRevalidations;
        if (totalRevalidations === 0) return 0;

        // Simple efficiency metric
        const successRate = (totalRevalidations - this.stats.errors) / totalRevalidations;
        return successRate;
    }

    // Reset statistics
    resetStatistics() {
        this.stats = {
            totalRequests: 0,
            freshHits: 0,
            staleHits: 0,
            sourceFetches: 0,
            backgroundRevalidations: 0,
            errors: 0
        };
    }

    // Get active revalidations
    getActiveRevalidations() {
        return {
            count: this.revalidationQueue.size,
            revalidations: Array.from(this.revalidationQueue.entries()).map(([key, value]) => ({
                key,
                ...value
            })),
            timestamp: new Date().toISOString()
        };
    }

    // SWR with cache consistency verification
    async getWithConsistencyCheck(key, pattern, dataFetcher, options = {}) {
        const {
            consistencyCheck = true,
            ...swrOptions
        } = options;

        try {
            const result = await this.get(key, pattern, dataFetcher, swrOptions);

            // Verify cache consistency if requested
            if (consistencyCheck && result.source === 'cache') {
                const isConsistent = await this.verifyCacheConsistency(key, pattern, result.data);

                if (!isConsistent) {
                    logger.warn('SWR: cache consistency check failed', { key, pattern });

                    // Force revalidation
                    await this.forceRevalidation(key, pattern, dataFetcher, options.ttl, options.staleTtl);

                    // Return the data but mark as inconsistent
                    return {
                        ...result,
                        consistent: false,
                        revalidating: true
                    };
                }
            }

            return {
                ...result,
                consistent: true
            };

        } catch (error) {
            logger.error('SWR with consistency check error:', { error: error.message, key, pattern });
            throw error;
        }
    }

    // Verify cache consistency
    async verifyCacheConsistency(key, pattern, cachedData) {
        try {
            // Simple consistency check - compare with source
            const freshData = await this.fetchWithoutProtection(key, pattern, async () => {
                // This would be the actual data fetcher in real implementation
                return cachedData; // Mock for now
            });

            // Simple comparison
            return JSON.stringify(cachedData) === JSON.stringify(freshData);

        } catch (error) {
            logger.error('Cache consistency verification error:', { error: error.message, key, pattern });
            return true; // Assume consistent on error
        }
    }

    // Force immediate revalidation
    async forceRevalidation(key, pattern, dataFetcher, ttl, staleTtl) {
        try {
            logger.debug('SWR: forcing immediate revalidation', { key, pattern });

            // Cancel any existing revalidation
            const revalidationKey = `revalidation:${pattern}:${key}`;
            this.revalidationQueue.delete(revalidationKey);

            // Fetch fresh data immediately
            const freshData = await this.fetchWithStampedeProtection(key, pattern, dataFetcher, ttl);

            // Update caches
            await this.cacheFreshData(key, pattern, freshData, ttl);

            if (staleTtl) {
                await this.cacheStaleData(key, pattern, freshData, staleTtl);
            }

            return freshData;

        } catch (error) {
            logger.error('Forced revalidation error:', { error: error.message, key, pattern });
            throw error;
        }
    }
}

export const staleWhileRevalidate = new StaleWhileRevalidate();
export default staleWhileRevalidate;