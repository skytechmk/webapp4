/**
 * Database Migration Test Suite
 * Comprehensive testing for database migration and optimization features
 */

import { databaseMigrationManager } from './database_migration_strategy.js';
import { db } from '../config/db.js';
import { redisService } from '../services/redisService.js';
import { config } from '../config/env.js';

// Test Configuration
const TEST_CONFIG = {
    testUsers: [
        { id: 'test-user-1', name: 'Test User 1', email: 'test1@example.com' },
        { id: 'test-user-2', name: 'Test User 2', email: 'test2@example.com' },
        { id: 'test-user-3', name: 'Test User 3', email: 'test3@example.com' }
    ],
    testEvents: [
        { id: 'test-event-1', title: 'Test Event 1', hostId: 'test-user-1', date: '2023-01-01' },
        { id: 'test-event-2', title: 'Test Event 2', hostId: 'test-user-2', date: '2023-02-01' }
    ],
    testMedia: [
        { id: 'test-media-1', eventId: 'test-event-1', type: 'image', url: 'test1.jpg' },
        { id: 'test-media-2', eventId: 'test-event-2', type: 'video', url: 'test2.mp4' }
    ]
};

class DatabaseMigrationTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            startTime: new Date(),
            endTime: null,
            tests: []
        };

        this.migrationManager = databaseMigrationManager;
    }

    async runAllTests() {
        console.log('🧪 Starting Database Migration Test Suite...');

        try {
            // Setup test data
            await this.setupTestData();

            // Run individual tests
            await this.testShardingFunctionality();
            await this.testReadReplicas();
            await this.testEnhancedCaching();
            await this.testQueryOptimization();
            await this.testDataArchiving();
            await this.testPerformanceMonitoring();
            await this.testCacheInvalidation();
            await this.testMigrationProcess();

            // Cleanup test data
            await this.cleanupTestData();

            this.testResults.endTime = new Date();
            this.printTestSummary();

            return this.testResults.failed === 0;

        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.testResults.failed++;
            this.testResults.tests.push({
                name: 'Test Suite Execution',
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            this.testResults.endTime = new Date();
            this.printTestSummary();

            return false;
        }
    }

    async setupTestData() {
        console.log('📦 Setting up test data...');

        try {
            // Insert test users
            for (const user of TEST_CONFIG.testUsers) {
                await new Promise((resolve) => {
                    db.run(
                        'INSERT OR REPLACE INTO users (id, name, email, role, tier) VALUES (?, ?, ?, ?, ?)',
                        [user.id, user.name, user.email, 'USER', 'FREE'],
                        resolve
                    );
                });
            }

            // Insert test events
            for (const event of TEST_CONFIG.testEvents) {
                await new Promise((resolve) => {
                    db.run(
                        'INSERT OR REPLACE INTO events (id, title, hostId, date, createdAt) VALUES (?, ?, ?, ?, ?)',
                        [event.id, event.title, event.hostId, event.date, event.date],
                        resolve
                    );
                });
            }

            // Insert test media
            for (const media of TEST_CONFIG.testMedia) {
                await new Promise((resolve) => {
                    db.run(
                        'INSERT OR REPLACE INTO media (id, eventId, type, url, uploadedAt) VALUES (?, ?, ?, ?, ?)',
                        [media.id, media.eventId, media.type, media.url, '2023-01-01'],
                        resolve
                    );
                });
            }

            console.log('✅ Test data setup complete');

        } catch (error) {
            console.error('❌ Test data setup failed:', error);
            throw error;
        }
    }

    async cleanupTestData() {
        console.log('🧹 Cleaning up test data...');

        try {
            // Delete test users
            const userIds = TEST_CONFIG.testUsers.map(u => u.id);
            await new Promise((resolve) => {
                db.run(
                    `DELETE FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`,
                    userIds,
                    resolve
                );
            });

            // Delete test events
            const eventIds = TEST_CONFIG.testEvents.map(e => e.id);
            await new Promise((resolve) => {
                db.run(
                    `DELETE FROM events WHERE id IN (${eventIds.map(() => '?').join(',')})`,
                    eventIds,
                    resolve
                );
            });

            // Delete test media
            const mediaIds = TEST_CONFIG.testMedia.map(m => m.id);
            await new Promise((resolve) => {
                db.run(
                    `DELETE FROM media WHERE id IN (${mediaIds.map(() => '?').join(',')})`,
                    mediaIds,
                    resolve
                );
            });

            console.log('✅ Test data cleanup complete');

        } catch (error) {
            console.error('❌ Test data cleanup failed:', error);
            // Don't throw, cleanup is best-effort
        }
    }

    async testShardingFunctionality() {
        const testName = 'Database Sharding Functionality';
        this.testResults.total++;

        try {
            console.log(`🧪 Testing ${testName}...`);

            // Test shard selection for different users
            const testUserId = TEST_CONFIG.testUsers[0].id;
            const shardInfo = this.migrationManager.shardingManager.getShardForUser(testUserId);

            if (!shardInfo || !shardInfo.connection) {
                throw new Error('Shard selection failed');
            }

            // Test data retrieval through shard
            const userData = await this.migrationManager.getUserData(testUserId);

            if (!userData || userData.id !== testUserId) {
                throw new Error('User data retrieval through shard failed');
            }

            console.log(`✅ ${testName} passed - User ${testUserId} mapped to shard with data`);

            this.testResults.passed++;
            this.testResults.tests.push({
                name: testName,
                status: 'PASSED',
                timestamp: new Date().toISOString()
            });

            return true;

        } catch (error) {
            console.error(`❌ ${testName} failed:`, error.message);

            this.testResults.failed++;
            this.testResults.tests.push({
                name: testName,
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            return false;
        }
    }

    async testReadReplicas() {
        const testName = 'Read Replicas Functionality';
        this.testResults.total++;

        try {
            console.log(`🧪 Testing ${testName}...`);

            // Test read replica selection
            const replicaInfo = this.migrationManager.readReplicaManager.getReadReplica();

            if (!replicaInfo || !replicaInfo.connection) {
                throw new Error('Read replica selection failed');
            }

            // Test data retrieval through replica
            const eventId = TEST_CONFIG.testEvents[0].id;
            const eventData = await this.migrationManager.getEventData(eventId);

            if (!eventData || eventData.id !== eventId) {
                throw new Error('Event data retrieval through replica failed');
            }

            console.log(`✅ ${testName} passed - Event ${eventId} retrieved from ${replicaInfo.isReplica ? 'replica' : 'master'}`);

            this.testResults.passed++;
            this.testResults.tests.push({
                name: testName,
                status: 'PASSED',
                timestamp: new Date().toISOString()
            });

            return true;

        } catch (error) {
            console.error(`❌ ${testName} failed:`, error.message);

            this.testResults.failed++;
            this.testResults.tests.push({
                name: testName,
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            return false;
        }
    }

    async testEnhancedCaching() {
        const testName = 'Enhanced Multi-Level Caching';
        this.testResults.total++;

        try {
            console.log(`🧪 Testing ${testName}...`);

            // Clear cache first
            await redisService.flushAll();

            // Test cache miss (should hit database)
            const cacheKey = 'test_cache_key';
            const testData = { test: 'data', timestamp: Date.now() };

            const fallbackFn = async () => {
                return testData;
            };

            // First call - should miss cache and hit database
            const firstResult = await this.migrationManager.cacheManager.getWithMultiLevelCache(
                cacheKey, fallbackFn, 60
            );

            if (!firstResult || firstResult.test !== testData.test) {
                throw new Error('Cache miss and fallback failed');
            }

            // Second call - should hit cache
            const secondResult = await this.migrationManager.cacheManager.getWithMultiLevelCache(
                cacheKey, fallbackFn, 60
            );

            if (!secondResult || secondResult.test !== testData.test) {
                throw new Error('Cache hit failed');
            }

            // Verify cache statistics were updated
            const cacheStats = this.migrationManager.cacheManager.cacheStats;
            if (cacheStats.totalRequests < 2) {
                throw new Error('Cache statistics not updated correctly');
            }

            console.log(`✅ ${testName} passed - Multi-level caching working correctly`);

            this.testResults.passed++;
            this.testResults.tests.push({
                name: testName,
                status: 'PASSED',
                timestamp: new Date().toISOString()
            });

            return true;

        } catch (error) {
            console.error(`❌ ${testName} failed:`, error.message);

            this.testResults.failed++;
            this.testResults.tests.push({
                name: testName,
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            return false;
        }
    }

    async testQueryOptimization() {
        const testName = 'Query Optimization and Indexing';
        this.testResults.total++;

        try {
            console.log(`🧪 Testing ${testName}...`);

            // Test index creation
            const indexesCreated = await this.migrationManager.queryOptimizer.createMissingIndexes();

            if (indexesCreated < 0) {
                throw new Error('Index creation failed');
            }

            // Test query execution
            const testQuery = 'SELECT * FROM users WHERE id = ?';
            const testUserId = TEST_CONFIG.testUsers[0].id;

            const result = await this.migrationManager.queryOptimizer.executeOptimizedQuery(
                testQuery, [testUserId]
            );

            if (!result || result.length === 0) {
                throw new Error('Query execution failed');
            }

            console.log(`✅ ${testName} passed - ${indexesCreated} indexes created, query executed successfully`);

            this.testResults.passed++;
            this.testResults.tests.push({
                name: testName,
                status: 'PASSED',
                timestamp: new Date().toISOString()
            });

            return true;

        } catch (error) {
            console.error(`❌ ${testName} failed:`, error.message);

            this.testResults.failed++;
            this.testResults.tests.push({
                name: testName,
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            return false;
        }
    }

    async testDataArchiving() {
        const testName = 'Data Archiving Strategy';
        this.testResults.total++;

        try {
            console.log(`🧪 Testing ${testName}...`);

            // Test archive database initialization
            if (!this.migrationManager.archivingManager.archiveDb) {
                throw new Error('Archive database not initialized');
            }

            // Test archive table creation (tables should exist)
            const archiveTables = await new Promise((resolve) => {
                this.migrationManager.archivingManager.archiveDb.all(
                    "SELECT name FROM sqlite_master WHERE type='table'",
                    (err, rows) => {
                        resolve(rows || []);
                    }
                );
            });

            const expectedTables = ['archived_events', 'archived_media', 'archived_comments'];
            const missingTables = expectedTables.filter(table =>
                !archiveTables.some(archTable => archTable.name === table)
            );

            if (missingTables.length > 0) {
                throw new Error(`Missing archive tables: ${missingTables.join(', ')}`);
            }

            console.log(`✅ ${testName} passed - Archive database and tables initialized correctly`);

            this.testResults.passed++;
            this.testResults.tests.push({
                name: testName,
                status: 'PASSED',
                timestamp: new Date().toISOString()
            });

            return true;

        } catch (error) {
            console.error(`❌ ${testName} failed:`, error.message);

            this.testResults.failed++;
            this.testResults.tests.push({
                name: testName,
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            return false;
        }
    }

    async testPerformanceMonitoring() {
        const testName = 'Performance Monitoring';
        this.testResults.total++;

        try {
            console.log(`🧪 Testing ${testName}...`);

            // Test that monitoring is enabled
            if (!config.DATABASE_MIGRATION.MONITORING_ENABLED) {
                throw new Error('Performance monitoring not enabled');
            }

            // Test that we can get performance metrics
            const migrationSummary = this.migrationManager.getMigrationSummary();

            if (!migrationSummary || !migrationSummary.status) {
                throw new Error('Migration summary not available');
            }

            console.log(`✅ ${testName} passed - Performance monitoring active, migration status: ${migrationSummary.status}`);

            this.testResults.passed++;
            this.testResults.tests.push({
                name: testName,
                status: 'PASSED',
                timestamp: new Date().toISOString()
            });

            return true;

        } catch (error) {
            console.error(`❌ ${testName} failed:`, error.message);

            this.testResults.failed++;
            this.testResults.tests.push({
                name: testName,
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            return false;
        }
    }

    async testCacheInvalidation() {
        const testName = 'Cache Invalidation';
        this.testResults.total++;

        try {
            console.log(`🧪 Testing ${testName}...`);

            // Clear cache first
            await redisService.flushAll();

            // Set a test cache entry
            const testKey = 'test_invalidation_key';
            const testValue = { data: 'test', timestamp: Date.now() };

            await redisService.set(testKey, testValue, 300);

            // Verify it's in cache
            const cachedValue = await redisService.get(testKey);
            if (!cachedValue || cachedValue.data !== testValue.data) {
                throw new Error('Cache set failed');
            }

            // Invalidate by pattern
            this.migrationManager.cacheManager.invalidateCacheByPattern('test_invalidation');

            // Verify it's been invalidated
            const cachedValueAfter = await redisService.get(testKey);
            if (cachedValueAfter) {
                throw new Error('Cache invalidation failed - value still exists');
            }

            console.log(`✅ ${testName} passed - Cache invalidation working correctly`);

            this.testResults.passed++;
            this.testResults.tests.push({
                name: testName,
                status: 'PASSED',
                timestamp: new Date().toISOString()
            });

            return true;

        } catch (error) {
            console.error(`❌ ${testName} failed:`, error.message);

            this.testResults.failed++;
            this.testResults.tests.push({
                name: testName,
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            return false;
        }
    }

    async testMigrationProcess() {
        const testName = 'Complete Migration Process';
        this.testResults.total++;

        try {
            console.log(`🧪 Testing ${testName}...`);

            // Run the migration process
            const migrationResult = await this.migrationManager.runCompleteMigration();

            if (!migrationResult) {
                throw new Error('Migration process failed');
            }

            // Verify migration summary
            const migrationSummary = this.migrationManager.getMigrationSummary();

            if (migrationSummary.failed > 0) {
                throw new Error(`Migration completed with ${migrationSummary.failed} errors`);
            }

            if (migrationSummary.completionPercentage < 100) {
                throw new Error(`Migration only ${migrationSummary.completionPercentage}% complete`);
            }

            console.log(`✅ ${testName} passed - Migration completed successfully in ${migrationSummary.durationSeconds}s`);

            this.testResults.passed++;
            this.testResults.tests.push({
                name: testName,
                status: 'PASSED',
                timestamp: new Date().toISOString()
            });

            return true;

        } catch (error) {
            console.error(`❌ ${testName} failed:`, error.message);

            this.testResults.failed++;
            this.testResults.tests.push({
                name: testName,
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            return false;
        }
    }

    printTestSummary() {
        const duration = (this.testResults.endTime - this.testResults.startTime) / 1000;
        const passRate = (this.testResults.passed / this.testResults.total) * 100;

        console.log('\n📊 Database Migration Test Suite Summary');
        console.log('=========================================');
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed} (${passRate.toFixed(1)}%)`);
        console.log(`Failed: ${this.testResults.failed}`);
        console.log(`Duration: ${duration.toFixed(2)} seconds`);
        console.log(`Status: ${this.testResults.failed === 0 ? '🎉 ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

        console.log('\n📋 Individual Test Results:');
        this.testResults.tests.forEach((test, index) => {
            const statusSymbol = test.status === 'PASSED' ? '✅' : '❌';
            console.log(`  ${index + 1}. ${statusSymbol} ${test.name} - ${test.status}`);
            if (test.error) {
                console.log(`     Error: ${test.error}`);
            }
        });

        console.log('\n📈 Performance Metrics:');
        const cacheStats = this.migrationManager.cacheManager.cacheStats;
        console.log(`  Cache Hit Rate: ${this.migrationManager.cacheManager.calculateHitRate()}`);
        console.log(`  Total Cache Requests: ${cacheStats.totalRequests}`);
        console.log(`  Memory Hits: ${cacheStats.memoryHits}`);
        console.log(`  Redis Hits: ${cacheStats.redisHits}`);
        console.log(`  Database Hits: ${cacheStats.databaseHits}`);
    }

    getTestResults() {
        return {
            ...this.testResults,
            durationSeconds: this.testResults.endTime
                ? ((this.testResults.endTime - this.testResults.startTime) / 1000).toFixed(2)
                : null
        };
    }
}

// Export tester instance
const databaseMigrationTester = new DatabaseMigrationTester();

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    databaseMigrationTester.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { databaseMigrationTester, DatabaseMigrationTester };
export default databaseMigrationTester;