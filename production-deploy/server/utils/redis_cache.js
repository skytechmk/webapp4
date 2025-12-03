import { createClient } from 'redis';
import { config } from '../config/env.js';
import { dbPool } from '../config/db_pool.js';

// Redis cache configuration
const REDIS_URL = config.REDIS_URL || 'redis://localhost:6379';
const CACHE_PREFIX = 'snapify:cache:';
const DEFAULT_TTL = 300; // 5 minutes default cache TTL
const MAX_CACHE_SIZE = 10000; // Maximum number of keys to prevent memory issues

// Cache categories with different TTLs
const CACHE_TTLS = {
    QUERY: 300, // 5 minutes for regular queries
    USER_DATA: 600, // 10 minutes for user data
    EVENT_DATA: 900, // 15 minutes for event data
    MEDIA_DATA: 1200, // 20 minutes for media data
    CONFIG: 3600 // 1 hour for configuration data
};

class RedisCache {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0
        };
        this.initialize();
    }

    async initialize() {
        try {
            this.client = createClient({
                url: REDIS_URL,
                socket: {
                    reconnectStrategy: (retries) => {
                        // Exponential backoff for reconnection
                        return Math.min(retries * 100, 5000);
                    }
                }
            });

            this.client.on('error', (err) => {
                console.error('Redis client error:', err);
                this.cacheStats.errors++;
            });

            this.client.on('connect', () => {
                console.log('✓ Connected to Redis cache');
                this.isConnected = true;
            });

            this.client.on('reconnecting', () => {
                console.log('Redis reconnecting...');
            });

            this.client.on('ready', () => {
                console.log('Redis client ready');
                this.isConnected = true;
            });

            await this.client.connect();
            console.log('Redis cache initialized successfully');

            // Set up periodic cache maintenance
            this.setupCacheMaintenance();

        } catch (error) {
            console.error('Failed to initialize Redis cache:', error);
            this.cacheStats.errors++;
        }
    }

    setupCacheMaintenance() {
        // Clean up expired keys and monitor cache size every hour
        setInterval(async () => {
            try {
                if (!this.isConnected) return;

                const keyCount = await this.client.dbSize();
                console.log(`Cache maintenance: ${keyCount} keys in cache`);

                // If cache is getting too large, clean up some keys
                if (keyCount > MAX_CACHE_SIZE * 0.9) {
                    console.log('Cache approaching size limit, cleaning up...');
                    // Clean up 10% of keys (oldest first)
                    const keysToClean = Math.floor(keyCount * 0.1);
                    await this.cleanupOldKeys(keysToClean);
                }
            } catch (error) {
                console.error('Cache maintenance error:', error);
            }
        }, 3600000); // 1 hour
    }

    async cleanupOldKeys(count) {
        try {
            // Get all keys and sort by creation time (approximate)
            const keys = await this.client.keys(`${CACHE_PREFIX}*`);
            if (keys.length === 0) return;

            // Sort keys by TTL (approximate age)
            const keysWithTtl = await Promise.all(
                keys.map(async key => {
                    const ttl = await this.client.ttl(key);
                    return { key, ttl };
                })
            );

            // Sort by TTL (smallest TTL = oldest)
            keysWithTtl.sort((a, b) => a.ttl - b.ttl);

            // Delete the oldest keys
            const keysToDelete = keysWithTtl.slice(0, Math.min(count, keys.length));
            if (keysToDelete.length > 0) {
                await this.client.del(keysToDelete.map(k => k.key));
                console.log(`Cleaned up ${keysToDelete.length} old cache keys`);
                this.cacheStats.deletes += keysToDelete.length;
            }
        } catch (error) {
            console.error('Error cleaning up old keys:', error);
        }
    }

    getCacheKey(category, ...parts) {
        return `${CACHE_PREFIX}${category}:${parts.join(':')}`;
    }

    async get(category, ...keyParts) {
        if (!this.isConnected || !this.client) {
            this.cacheStats.misses++;
            return null;
        }

        try {
            const cacheKey = this.getCacheKey(category, ...keyParts);
            const cachedData = await this.client.get(cacheKey);

            if (cachedData) {
                this.cacheStats.hits++;
                console.log(`✓ Cache hit for ${category}:${keyParts.join(':')}`);
                return JSON.parse(cachedData);
            } else {
                this.cacheStats.misses++;
                return null;
            }
        } catch (error) {
            console.error(`Cache get error for ${category}:`, error);
            this.cacheStats.errors++;
            this.cacheStats.misses++;
            return null;
        }
    }

    async set(category, value, ttl = null) {
        if (!this.isConnected || !this.client) {
            this.cacheStats.errors++;
            return false;
        }

        try {
            const cacheKey = this.getCacheKey(category, ...Array.isArray(category) ? category : [category]);
            const actualTtl = ttl || CACHE_TTLS[category.toUpperCase()] || DEFAULT_TTL;

            await this.client.setEx(cacheKey, actualTtl, JSON.stringify(value));
            this.cacheStats.sets++;
            console.log(`✓ Cached ${category} with TTL ${actualTtl}s`);
            return true;
        } catch (error) {
            console.error(`Cache set error for ${category}:`, error);
            this.cacheStats.errors++;
            return false;
        }
    }

    async delete(category, ...keyParts) {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            const cacheKey = this.getCacheKey(category, ...keyParts);
            const result = await this.client.del(cacheKey);
            if (result > 0) {
                this.cacheStats.deletes++;
                console.log(`✓ Deleted cache for ${category}:${keyParts.join(':')}`);
            }
            return result > 0;
        } catch (error) {
            console.error(`Cache delete error for ${category}:`, error);
            this.cacheStats.errors++;
            return false;
        }
    }

    async invalidateCategory(category) {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            const pattern = `${CACHE_PREFIX}${category}:*`;
            const keys = await this.client.keys(pattern);

            if (keys.length > 0) {
                await this.client.del(keys);
                this.cacheStats.deletes += keys.length;
                console.log(`✓ Invalidated ${keys.length} keys for category ${category}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Cache invalidate error for ${category}:`, error);
            this.cacheStats.errors++;
            return false;
        }
    }

    async getWithFallback(category, key, fallbackFn, ttl = null) {
        // Try to get from cache first
        const cachedData = await this.get(category, key);
        if (cachedData !== null) {
            return cachedData;
        }

        // If not in cache, execute fallback function
        try {
            const result = await fallbackFn();
            if (result !== null && result !== undefined) {
                // Cache the result for future requests
                await this.set(category, result, ttl);
            }
            return result;
        } catch (error) {
            console.error(`Fallback function error for ${category}:${key}:`, error);
            throw error;
        }
    }

    async getQueryWithCache(sql, params = [], ttl = CACHE_TTLS.QUERY) {
        // Create a stable cache key from the query
        const queryKey = this.createQueryCacheKey(sql, params);
        const cacheKey = this.getCacheKey('query', queryKey);

        // Try to get from cache first
        const cachedData = await this.get('query', queryKey);
        if (cachedData !== null) {
            return cachedData;
        }

        // If not in cache, execute the query
        try {
            const result = await dbPool.executeQuery(sql, params);
            if (result && result.length > 0) {
                // Cache the result for future requests
                await this.set('query', result, ttl);
            }
            return result;
        } catch (error) {
            console.error(`Cached query execution error:`, error);
            throw error;
        }
    }

    createQueryCacheKey(sql, params) {
        // Create a stable hash from the query and parameters
        const normalizedSql = sql.trim().toLowerCase();
        const paramString = JSON.stringify(params);
        return `${Buffer.from(normalizedSql).toString('base64')}:${Buffer.from(paramString).toString('base64')}`;
    }

    getCacheStats() {
        const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
            ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100
            : 0;

        return {
            ...this.cacheStats,
            hitRate: hitRate.toFixed(2) + '%',
            totalOperations: this.cacheStats.hits + this.cacheStats.misses + this.cacheStats.sets
        };
    }

    async clearAllCache() {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            const keys = await this.client.keys(`${CACHE_PREFIX}*`);
            if (keys.length > 0) {
                await this.client.del(keys);
                console.log(`✓ Cleared all cache (${keys.length} keys)`);
                this.cacheStats.deletes += keys.length;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error clearing all cache:', error);
            this.cacheStats.errors++;
            return false;
        }
    }

    async healthCheck() {
        try {
            if (!this.client) {
                return { status: 'disconnected', message: 'Client not initialized' };
            }

            const ping = await this.client.ping();
            return {
                status: 'healthy',
                message: 'Redis cache is operational',
                ping: ping,
                stats: this.getCacheStats()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: error.message,
                stats: this.getCacheStats()
            };
        }
    }
}

// Singleton instance
const redisCache = new RedisCache();

export { redisCache, CACHE_TTLS };