/**
 * Database Migration Configuration
 * Configuration settings for database migration and optimization
 */

export const DATABASE_MIGRATION_CONFIG = {
    // Database sharding configuration
    sharding: {
        enabled: true,
        shardCount: 4,
        shardKey: 'userId',
        shardStrategy: 'hash',
        shardFiles: [
            'server/snapify_shard_0.db',
            'server/snapify_shard_1.db',
            'server/snapify_shard_2.db',
            'server/snapify_shard_3.db'
        ]
    },

    // Read replicas configuration
    readReplicas: {
        enabled: true,
        replicaCount: 2,
        readWriteSplitRatio: 0.7,
        replicaFiles: [
            'server/snapify_replica_0.db',
            'server/snapify_replica_1.db'
        ],
        syncInterval: 60000, // 1 minute
        healthCheckInterval: 30000 // 30 seconds
    },

    // Enhanced caching configuration
    caching: {
        enabled: true,
        cacheLevels: ['memory', 'redis', 'database'],
        cacheTTLs: {
            userData: 3600, // 1 hour
            eventData: 1800, // 30 minutes
            mediaData: 2400, // 40 minutes
            queryResults: 900, // 15 minutes
            systemConfig: 86400 // 24 hours
        },
        cacheInvalidation: {
            userUpdate: ['user:*', 'event:user:*'],
            eventUpdate: ['event:*', 'media:event:*'],
            mediaUpdate: ['media:*', 'event:media:*'],
            systemUpdate: ['config:*', 'system:*']
        },
        memoryCache: {
            maxSize: 1000, // Maximum entries in memory cache
            cleanupInterval: 300000 // 5 minutes
        },
        redisCache: {
            prefix: 'snapify:',
            maxKeys: 10000,
            cleanupInterval: 3600000 // 1 hour
        }
    },

    // Query optimization configuration
    queryOptimization: {
        enabled: true,
        slowQueryThreshold: 100, // ms
        queryCacheSize: 500,
        monitoringInterval: 60000, // 1 minute
        explainAnalyze: true,
        indexAnalysisInterval: 86400000 // 24 hours
    },

    // Data archiving configuration
    archiving: {
        enabled: true,
        archiveThresholdDays: 365, // 1 year
        archiveDatabase: 'server/snapify_archive.db',
        archiveTables: ['events', 'media', 'comments', 'guestbook'],
        archiveBatchSize: 1000,
        archiveInterval: 86400000, // 24 hours
        archiveRetentionDays: 3650 // 10 years
    },

    // Performance monitoring configuration
    monitoring: {
        enabled: true,
        performanceMetricsInterval: 300000, // 5 minutes
        queryLogging: true,
        slowQueryLogging: true,
        cacheStatsInterval: 300000, // 5 minutes
        systemHealthInterval: 60000 // 1 minute
    },

    // Migration settings
    migration: {
        autoRun: false, // Set to true to run migration on startup
        backupBeforeMigration: true,
        migrationTimeout: 3600000, // 1 hour
        rollbackOnFailure: true,
        validationQueries: [
            'SELECT COUNT(*) FROM users',
            'SELECT COUNT(*) FROM events',
            'SELECT COUNT(*) FROM media'
        ]
    },

    // Backward compatibility settings
    backwardCompatibility: {
        enabled: true,
        legacyQuerySupport: true,
        schemaMigration: true,
        dataValidation: true,
        fallbackToMaster: true
    }
};

// Export configuration
export default DATABASE_MIGRATION_CONFIG;