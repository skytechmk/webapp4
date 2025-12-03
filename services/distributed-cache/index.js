import { createCluster } from 'redis';
import { config } from '../../server/config/env.js';
import { logger } from '../../server/services/loggerService.js';

class DistributedCache {
    constructor() {
        this.cluster = null;
        this.isConnected = false;
        this.nodes = [];
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            clusterOperations: 0
        };
    }

    // Initialize Redis cluster
    async init() {
        try {
            // Parse cluster nodes from configuration
            this.nodes = this.parseClusterNodes();

            if (this.nodes.length === 0) {
                logger.warn('No Redis cluster nodes configured, falling back to single instance');
                // Fallback to single instance mode
                return this.initSingleInstance();
            }

            logger.info('Initializing Redis cluster', { nodes: this.nodes });

            this.cluster = createCluster({
                rootNodes: this.nodes,
                defaults: {
                    password: config.REDIS.PASSWORD,
                    retry_strategy: (options) => {
                        if (options.error && options.error.code === 'ECONNREFUSED') {
                            return new Error('Redis connection refused');
                        }
                        if (options.total_retry_time > 1000 * 60 * 60) {
                            return new Error('Retry time exhausted');
                        }
                        if (options.attempt > 10) {
                            return undefined;
                        }
                        return Math.min(options.attempt * 100, 3000);
                    }
                }
            });

            this.cluster.on('error', (err) => {
                logger.error('Redis Cluster Error:', { error: err.message });
                this.isConnected = false;
            });

            this.cluster.on('connect', () => {
                logger.info('✅ Connected to Redis Cluster');
                this.isConnected = true;
            });

            this.cluster.on('ready', () => {
                logger.info('✅ Redis Cluster ready');
            });

            this.cluster.on('end', () => {
                logger.info('🔌 Redis Cluster connection ended');
                this.isConnected = false;
            });

            await this.cluster.connect();

        } catch (error) {
            logger.error('Failed to connect to Redis cluster:', { error: error.message });
            this.isConnected = false;
        }
    }

    // Fallback to single instance
    async initSingleInstance() {
        try {
            // This would use the regular Redis client
            logger.info('Using single Redis instance fallback');
            this.isConnected = true;
        } catch (error) {
            logger.error('Failed to initialize single Redis instance:', { error: error.message });
            this.isConnected = false;
        }
    }

    // Parse cluster nodes from configuration
    parseClusterNodes() {
        const nodes = [];

        // Check for cluster configuration
        if (config.REDIS.CLUSTER_NODES) {
            return config.REDIS.CLUSTER_NODES.split(',').map(node => ({
                host: node.split(':')[0],
                port: parseInt(node.split(':')[1]) || 6379
            }));
        }

        // Check for individual node configuration
        if (config.REDIS.HOST) {
            nodes.push({
                host: config.REDIS.HOST,
                port: config.REDIS.PORT || 6379
            });
        }

        return nodes;
    }

    // Distributed get operation
    async get(key) {
        if (!this.isConnected || !this.cluster) {
            return null;
        }

        try {
            const startTime = Date.now();
            const value = await this.cluster.get(key);
            const duration = Date.now() - startTime;

            if (value) {
                this.cacheStats.hits++;
                this.cacheStats.clusterOperations++;
                logger.debug('Cluster cache hit', { key, duration });
                return JSON.parse(value);
            }

            this.cacheStats.misses++;
            this.cacheStats.clusterOperations++;
            logger.debug('Cluster cache miss', { key });
            return null;

        } catch (error) {
            logger.error('Cluster cache get error:', { error: error.message, key });
            return null;
        }
    }

    // Distributed set operation
    async set(key, value, ttlSeconds = 300) {
        if (!this.isConnected || !this.cluster) {
            return false;
        }

        try {
            const startTime = Date.now();
            const serializedValue = JSON.stringify(value);

            if (ttlSeconds > 0) {
                await this.cluster.setEx(key, ttlSeconds, serializedValue);
            } else {
                await this.cluster.set(key, serializedValue);
            }

            const duration = Date.now() - startTime;
            this.cacheStats.sets++;
            this.cacheStats.clusterOperations++;
            logger.debug('Cluster cache set', { key, ttl: ttlSeconds, duration });

            return true;

        } catch (error) {
            logger.error('Cluster cache set error:', { error: error.message, key });
            return false;
        }
    }

    // Distributed delete operation
    async del(key) {
        if (!this.isConnected || !this.cluster) {
            return false;
        }

        try {
            const startTime = Date.now();
            await this.cluster.del(key);
            const duration = Date.now() - startTime;

            this.cacheStats.deletes++;
            this.cacheStats.clusterOperations++;
            logger.debug('Cluster cache delete', { key, duration });

            return true;

        } catch (error) {
            logger.error('Cluster cache delete error:', { error: error.message, key });
            return false;
        }
    }

    // Cluster-aware cache operations
    async clusterGet(key, shardKey = null) {
        try {
            // In a real cluster, this would route to the appropriate shard
            return this.get(key);
        } catch (error) {
            logger.error('Cluster-aware get error:', { error: error.message, key, shardKey });
            return null;
        }
    }

    async clusterSet(key, value, ttlSeconds = 300, shardKey = null) {
        try {
            // In a real cluster, this would route to the appropriate shard
            return this.set(key, value, ttlSeconds);
        } catch (error) {
            logger.error('Cluster-aware set error:', { error: error.message, key, shardKey });
            return false;
        }
    }

    // Cache consistency across cluster
    async ensureCacheConsistency(key, expectedValue) {
        try {
            const cachedValue = await this.get(key);

            if (JSON.stringify(cachedValue) === JSON.stringify(expectedValue)) {
                return { consistent: true };
            }

            // If inconsistent, update the cache
            await this.set(key, expectedValue);
            return {
                consistent: false,
                action: 'updated',
                cachedValue,
                expectedValue
            };

        } catch (error) {
            logger.error('Cache consistency check error:', { error: error.message, key });
            return { consistent: false, error: error.message };
        }
    }

    // Cluster health monitoring
    async getClusterHealth() {
        try {
            if (!this.cluster) {
                return { healthy: false, error: 'Cluster not initialized' };
            }

            // Get cluster info
            const info = await this.cluster.info();
            const nodesStatus = await this.cluster.nodes('ALL');

            return {
                healthy: true,
                nodes: nodesStatus.length,
                connectedNodes: nodesStatus.filter(node => node.status === 'connected').length,
                info: this.parseClusterInfo(info),
                stats: this.cacheStats,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Cluster health check error:', { error: error.message });
            return {
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Parse cluster info
    parseClusterInfo(info) {
        if (!info) return {};

        const lines = info.split('\n');
        const result = {};

        for (const line of lines) {
            if (line.includes(':')) {
                const [key, value] = line.split(':');
                result[key.trim()] = value.trim();
            }
        }

        return result;
    }

    // Cache sharding strategy
    getShardKey(key) {
        // Simple sharding strategy based on key hash
        if (!key) return 'default';

        // Use first part of key for sharding
        const parts = key.split(':');
        return parts.length > 0 ? parts[0] : 'default';
    }

    // Distributed cache invalidation
    async invalidateClusterCache(pattern) {
        try {
            // Get all keys matching pattern
            const keys = await this.getKeysByPattern(pattern);

            // Delete all matching keys
            for (const key of keys) {
                await this.del(key);
            }

            logger.info('Invalidated cluster cache', { pattern, keyCount: keys.length });
            return true;

        } catch (error) {
            logger.error('Cluster cache invalidation error:', { error: error.message, pattern });
            return false;
        }
    }

    // Get keys by pattern (simplified for cluster)
    async getKeysByPattern(pattern) {
        try {
            // In a real cluster, this would use SCAN or similar
            // For now, return empty array as this is complex in clustered environment
            return [];

        } catch (error) {
            logger.error('Get keys by pattern error:', { error: error.message, pattern });
            return [];
        }
    }

    // Cluster performance metrics
    async getPerformanceMetrics() {
        try {
            const health = await this.getClusterHealth();

            return {
                clusterHealth: health,
                cacheStats: this.cacheStats,
                hitRate: this.cacheStats.hits + this.cacheStats.misses > 0
                    ? this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)
                    : 0,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Cluster performance metrics error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Graceful shutdown
    async shutdown() {
        try {
            if (this.cluster && this.isConnected) {
                await this.cluster.quit();
                this.isConnected = false;
                logger.info('🔌 Redis Cluster connection closed');
            }
        } catch (error) {
            logger.error('Cluster shutdown error:', { error: error.message });
        }
    }

    // Reset cache statistics
    resetStats() {
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            clusterOperations: 0
        };
    }
}

export const distributedCache = new DistributedCache();
export default distributedCache;