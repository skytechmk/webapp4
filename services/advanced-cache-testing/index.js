import { multiLevelCache } from '../multi-level-cache/index.js';
import { cacheStampedeProtection } from '../cache-stampede-protection/index.js';
import { staleWhileRevalidate } from '../stale-while-revalidate/index.js';
import { advancedCacheWarming } from '../advanced-cache-warming/index.js';
import { intelligentCacheInvalidation } from '../intelligent-cache-invalidation/index.js';
import { logger } from '../../server/services/loggerService.js';

class AdvancedCacheTesting {
    constructor() {
        this.testResults = {
            multiLevelCache: null,
            cacheStampedeProtection: null,
            staleWhileRevalidate: null,
            advancedCacheWarming: null,
            intelligentCacheInvalidation: null,
            overall: null
        };

        this.performanceMetrics = {
            multiLevelCache: {},
            cacheStampedeProtection: {},
            staleWhileRevalidate: {},
            advancedCacheWarming: {},
            intelligentCacheInvalidation: {}
        };
    }

    // Run all tests
    async runAllTests() {
        try {
            logger.info('Starting advanced cache testing suite');

            // Run individual component tests
            await this.testMultiLevelCache();
            await this.testCacheStampedeProtection();
            await this.testStaleWhileRevalidate();
            await this.testAdvancedCacheWarming();
            await this.testIntelligentCacheInvalidation();

            // Run integration tests
            await this.testIntegrationScenarios();

            // Calculate overall results
            this.calculateOverallResults();

            logger.info('Completed advanced cache testing suite');
            return this.testResults;

        } catch (error) {
            logger.error('Advanced cache testing error:', { error: error.message });
            this.testResults.overall = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            return this.testResults;
        }
    }

    // Test multi-level cache
    async testMultiLevelCache() {
        try {
            logger.info('Testing multi-level cache');

            const testKey = 'test_user';
            const testPattern = 'user';
            const testData = { id: testKey, name: 'Test User', role: 'user' };
            const testTtl = 60; // 60 seconds

            // Test 1: Basic set and get
            await multiLevelCache.set(testKey, testData, testPattern, testTtl);
            const retrievedData = await multiLevelCache.get(testKey, testPattern);

            const test1Passed = JSON.stringify(retrievedData) === JSON.stringify(testData);

            // Test 2: Multi-level caching verification
            const memoryData = multiLevelCache.getFromMemoryCache(testKey, testPattern);
            const redisData = await multiLevelCache.getFromRedisCache(testKey, testPattern);

            const test2Passed = memoryData !== null && redisData !== null;

            // Test 3: Cache stampede protection
            const stampedeResult = await multiLevelCache.getWithStampedeProtection(
                `${testKey}_stampede`,
                testPattern,
                async () => ({ ...testData, stampede: true }),
                testTtl
            );

            const test3Passed = stampedeResult !== null;

            // Test 4: Stale-while-revalidate
            const swrResult = await multiLevelCache.getWithStaleWhileRevalidate(
                `${testKey}_swr`,
                testPattern,
                async () => ({ ...testData, swr: true }),
                testTtl,
                testTtl * 2
            );

            const test4Passed = swrResult.data !== undefined;

            // Test 5: Performance metrics
            const stats = multiLevelCache.getPerformanceMetrics();
            const test5Passed = stats.hitRate >= 0 && stats.missRate >= 0;

            // Store results
            this.testResults.multiLevelCache = {
                success: test1Passed && test2Passed && test3Passed && test4Passed && test5Passed,
                tests: {
                    basicSetGet: test1Passed,
                    multiLevelVerification: test2Passed,
                    stampedeProtection: test3Passed,
                    staleWhileRevalidate: test4Passed,
                    performanceMetrics: test5Passed
                },
                timestamp: new Date().toISOString()
            };

            // Store performance metrics
            this.performanceMetrics.multiLevelCache = {
                hitRate: stats.hitRate,
                missRate: stats.missRate,
                efficiency: stats.levelStats.memory.efficiency || 0
            };

            logger.info('Multi-level cache test completed', {
                success: this.testResults.multiLevelCache.success
            });

            return this.testResults.multiLevelCache;

        } catch (error) {
            logger.error('Multi-level cache test error:', { error: error.message });
            this.testResults.multiLevelCache = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            return this.testResults.multiLevelCache;
        }
    }

    // Test cache stampede protection
    async testCacheStampedeProtection() {
        try {
            logger.info('Testing cache stampede protection');

            const testKey = 'stampede_test';
            const testPattern = 'user';
            const testData = { id: testKey, name: 'Stampede Test User' };
            const testTtl = 30; // 30 seconds

            // Test 1: Basic stampede protection
            const result1 = await cacheStampedeProtection.protect(
                testKey,
                testPattern,
                async () => testData,
                { ttl: testTtl }
            );

            const test1Passed = result1.data !== undefined && result1.source === 'fetched';

            // Test 2: Concurrent request simulation
            const concurrentPromises = Array(5).fill().map((_, i) =>
                cacheStampedeProtection.protect(
                    `${testKey}_concurrent_${i}`,
                    testPattern,
                    async () => ({ ...testData, concurrent: i }),
                    { ttl: testTtl, lockTtl: 5 }
                )
            );

            const concurrentResults = await Promise.all(concurrentPromises);
            const test2Passed = concurrentResults.every(r => r.data !== undefined);

            // Test 3: Early refresh
            const earlyRefreshResult = await cacheStampedeProtection.protectWithEarlyRefresh(
                `${testKey}_early`,
                testPattern,
                async () => ({ ...testData, early: true }),
                { ttl: testTtl, refreshThreshold: 0.9 }
            );

            const test3Passed = earlyRefreshResult.data !== undefined;

            // Test 4: Statistics
            const stats = cacheStampedeProtection.getStatistics();
            const test4Passed = stats.totalRequests >= 0 && stats.stampedesPrevented >= 0;

            // Store results
            this.testResults.cacheStampedeProtection = {
                success: test1Passed && test2Passed && test3Passed && test4Passed,
                tests: {
                    basicProtection: test1Passed,
                    concurrentRequests: test2Passed,
                    earlyRefresh: test3Passed,
                    statistics: test4Passed
                },
                timestamp: new Date().toISOString()
            };

            // Store performance metrics
            this.performanceMetrics.cacheStampedeProtection = {
                preventionRate: stats.preventionRate || 0,
                efficiency: stats.efficiency || 0,
                successRate: stats.totalRequests > 0
                    ? (stats.totalRequests - stats.errors) / stats.totalRequests
                    : 0
            };

            logger.info('Cache stampede protection test completed', {
                success: this.testResults.cacheStampedeProtection.success
            });

            return this.testResults.cacheStampedeProtection;

        } catch (error) {
            logger.error('Cache stampede protection test error:', { error: error.message });
            this.testResults.cacheStampedeProtection = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            return this.testResults.cacheStampedeProtection;
        }
    }

    // Test stale-while-revalidate
    async testStaleWhileRevalidate() {
        try {
            logger.info('Testing stale-while-revalidate');

            const testKey = 'swr_test';
            const testPattern = 'event';
            const testData = { id: testKey, title: 'SWR Test Event', views: 100 };
            const testTtl = 20; // 20 seconds

            // Test 1: Basic SWR
            const result1 = await staleWhileRevalidate.get(
                testKey,
                testPattern,
                async () => testData,
                { ttl: testTtl, staleTtl: testTtl * 2 }
            );

            const test1Passed = result1.data !== undefined;

            // Test 2: Stale data with revalidation
            // First, cache some data
            await multiLevelCache.set(`${testKey}_stale`, testData, testPattern, 1); // Short TTL

            const staleResult = await staleWhileRevalidate.get(
                `${testKey}_stale`,
                testPattern,
                async () => ({ ...testData, fresh: true }),
                { ttl: testTtl, staleTtl: testTtl * 2, revalidateInBackground: true }
            );

            const test2Passed = staleResult.data !== undefined;

            // Test 3: Priority-based SWR
            const priorityResult = await staleWhileRevalidate.getWithPriority(
                `${testKey}_priority`,
                testPattern,
                async () => ({ ...testData, priority: 'high' }),
                { ttl: testTtl, priority: 'high' }
            );

            const test3Passed = priorityResult.data !== undefined;

            // Test 4: Fallback SWR
            const fallbackResult = await staleWhileRevalidate.getWithFallbacks(
                `${testKey}_fallback`,
                testPattern,
                async () => { throw new Error('Source failed'); },
                { fallbackData: { ...testData, fallback: true }, ttl: testTtl }
            );

            const test4Passed = fallbackResult.data !== undefined && fallbackResult.source === 'fallback';

            // Test 5: Statistics
            const stats = staleWhileRevalidate.getStatistics();
            const test5Passed = stats.totalRequests >= 0 && stats.freshHitRate >= 0;

            // Store results
            this.testResults.staleWhileRevalidate = {
                success: test1Passed && test2Passed && test3Passed && test4Passed && test5Passed,
                tests: {
                    basicSWR: test1Passed,
                    staleWithRevalidation: test2Passed,
                    priorityBased: test3Passed,
                    fallbackSWR: test4Passed,
                    statistics: test5Passed
                },
                timestamp: new Date().toISOString()
            };

            // Store performance metrics
            this.performanceMetrics.staleWhileRevalidate = {
                cacheEfficiency: stats.cacheEfficiency || 0,
                freshHitRate: stats.freshHitRate || 0,
                staleHitRate: stats.staleHitRate || 0
            };

            logger.info('Stale-while-revalidate test completed', {
                success: this.testResults.staleWhileRevalidate.success
            });

            return this.testResults.staleWhileRevalidate;

        } catch (error) {
            logger.error('Stale-while-revalidate test error:', { error: error.message });
            this.testResults.staleWhileRevalidate = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            return this.testResults.staleWhileRevalidate;
        }
    }

    // Test advanced cache warming
    async testAdvancedCacheWarming() {
        try {
            logger.info('Testing advanced cache warming');

            const testPattern = 'user';
            const testKey = 'warming_test';
            const testData = { id: testKey, name: 'Warming Test User' };

            // Test 1: Basic warming
            advancedCacheWarming.addToWarmingQueue([
                {
                    pattern: testPattern,
                    key: testKey,
                    priority: 'high',
                    dataFetcher: async () => testData
                }
            ]);

            // Process the queue
            await advancedCacheWarming.processWarmingQueue();

            const cachedData = await multiLevelCache.get(testKey, testPattern);
            const test1Passed = cachedData !== null;

            // Test 2: Service health-based warming
            const healthResult = await advancedCacheWarming.warmBasedOnServiceHealth();
            const test2Passed = healthResult.success !== false;

            // Test 3: Predictive warming
            const predictiveResult = await advancedCacheWarming.warmPredictively({
                morningPeak: true,
                eveningPeak: false,
                weekendPeak: false
            });

            const test3Passed = predictiveResult.success !== false;

            // Test 4: Emergency warming
            const emergencyResult = await advancedCacheWarming.emergencyWarmCriticalData();
            const test4Passed = emergencyResult.success !== false;

            // Test 5: Statistics
            const stats = advancedCacheWarming.getStatistics();
            const test5Passed = stats.totalWarmingOperations >= 0 && stats.successRate >= 0;

            // Store results
            this.testResults.advancedCacheWarming = {
                success: test1Passed && test2Passed && test3Passed && test4Passed && test5Passed,
                tests: {
                    basicWarming: test1Passed,
                    serviceHealthBased: test2Passed,
                    predictiveWarming: test3Passed,
                    emergencyWarming: test4Passed,
                    statistics: test5Passed
                },
                timestamp: new Date().toISOString()
            };

            // Store performance metrics
            this.performanceMetrics.advancedCacheWarming = {
                successRate: stats.successRate || 0,
                efficiency: stats.efficiency || 0,
                bytesWarmed: stats.bytesWarmed || 0
            };

            logger.info('Advanced cache warming test completed', {
                success: this.testResults.advancedCacheWarming.success
            });

            return this.testResults.advancedCacheWarming;

        } catch (error) {
            logger.error('Advanced cache warming test error:', { error: error.message });
            this.testResults.advancedCacheWarming = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            return this.testResults.advancedCacheWarming;
        }
    }

    // Test intelligent cache invalidation
    async testIntelligentCacheInvalidation() {
        try {
            logger.info('Testing intelligent cache invalidation');

            const testKey = 'invalidation_test';
            const testPattern = 'user';
            const testData = { id: testKey, name: 'Invalidation Test User' };
            const testTtl = 60; // 60 seconds

            // First, cache some data
            await multiLevelCache.set(testKey, testData, testPattern, testTtl);

            // Test 1: Immediate invalidation
            const result1 = await intelligentCacheInvalidation.invalidate(
                testKey,
                testPattern,
                'data_updated'
            );

            const test1Passed = result1.success;

            // Cache the data again for further tests
            await multiLevelCache.set(testKey, testData, testPattern, testTtl);

            // Test 2: Lazy invalidation
            const result2 = await intelligentCacheInvalidation.invalidate(
                `${testKey}_lazy`,
                testPattern,
                'low_usage'
            );

            const test2Passed = result2.success;

            // Test 3: Selective invalidation
            const result3 = await intelligentCacheInvalidation.invalidate(
                `${testKey}_selective`,
                testPattern,
                'size_pressure',
                { size: 20000 } // Large size
            );

            const test3Passed = result3.success;

            // Test 4: Cascading invalidation
            const result4 = await intelligentCacheInvalidation.invalidate(
                `${testKey}_cascading`,
                testPattern,
                'dependency_change'
            );

            const test4Passed = result4.success;

            // Test 5: Service event invalidation
            const eventResult = await intelligentCacheInvalidation.invalidateByServiceEvent({
                type: 'user_updated',
                data: { id: testKey }
            });

            const test5Passed = eventResult.success !== false;

            // Test 6: Statistics
            const stats = intelligentCacheInvalidation.getStatistics();
            const test6Passed = stats.totalInvalidations >= 0 && stats.successRate >= 0;

            // Store results
            this.testResults.intelligentCacheInvalidation = {
                success: test1Passed && test2Passed && test3Passed && test4Passed && test5Passed && test6Passed,
                tests: {
                    immediateInvalidation: test1Passed,
                    lazyInvalidation: test2Passed,
                    selectiveInvalidation: test3Passed,
                    cascadingInvalidation: test4Passed,
                    serviceEventInvalidation: test5Passed,
                    statistics: test6Passed
                },
                timestamp: new Date().toISOString()
            };

            // Store performance metrics
            this.performanceMetrics.intelligentCacheInvalidation = {
                successRate: stats.successRate || 0,
                efficiency: stats.efficiency || 0,
                bytesFreed: stats.bytesFreed || 0
            };

            logger.info('Intelligent cache invalidation test completed', {
                success: this.testResults.intelligentCacheInvalidation.success
            });

            return this.testResults.intelligentCacheInvalidation;

        } catch (error) {
            logger.error('Intelligent cache invalidation test error:', { error: error.message });
            this.testResults.intelligentCacheInvalidation = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            return this.testResults.intelligentCacheInvalidation;
        }
    }

    // Test integration scenarios
    async testIntegrationScenarios() {
        try {
            logger.info('Testing integration scenarios');

            const testKey = 'integration_test';
            const testPattern = 'event';
            const testData = { id: testKey, title: 'Integration Test Event', views: 500 };

            // Scenario 1: Full caching lifecycle
            // 1. Warm the cache
            await advancedCacheWarming.addToWarmingQueue([
                {
                    pattern: testPattern,
                    key: testKey,
                    priority: 'critical',
                    dataFetcher: async () => testData
                }
            ]);

            await advancedCacheWarming.processWarmingQueue();

            // 2. Retrieve with SWR
            const swrResult = await staleWhileRevalidate.get(
                testKey,
                testPattern,
                async () => testData,
                { ttl: 30, staleTtl: 60 }
            );

            // 3. Update data with stampede protection
            const updatedData = { ...testData, views: 501 };
            const stampedeResult = await cacheStampedeProtection.protect(
                testKey,
                testPattern,
                async () => updatedData,
                { ttl: 30 }
            );

            // 4. Invalidate intelligently
            const invalidationResult = await intelligentCacheInvalidation.invalidate(
                testKey,
                testPattern,
                'data_updated'
            );

            const scenario1Passed = swrResult.data !== undefined &&
                stampedeResult.data !== undefined &&
                invalidationResult.success;

            // Scenario 2: Cache under load
            const loadTestResults = await this.testCacheUnderLoad();
            const scenario2Passed = loadTestResults.success;

            // Scenario 3: Failure recovery
            const recoveryResult = await this.testFailureRecovery();
            const scenario3Passed = recoveryResult.success;

            // Store integration results
            this.testResults.integration = {
                success: scenario1Passed && scenario2Passed && scenario3Passed,
                scenarios: {
                    fullLifecycle: scenario1Passed,
                    cacheUnderLoad: scenario2Passed,
                    failureRecovery: scenario3Passed
                },
                timestamp: new Date().toISOString()
            };

            logger.info('Integration scenarios test completed', {
                success: this.testResults.integration.success
            });

            return this.testResults.integration;

        } catch (error) {
            logger.error('Integration scenarios test error:', { error: error.message });
            this.testResults.integration = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            return this.testResults.integration;
        }
    }

    // Test cache under load
    async testCacheUnderLoad() {
        try {
            const testPattern = 'load_test';
            const concurrentRequests = 20;
            const testTtl = 5; // Short TTL

            // Create test data fetcher that simulates load
            const testDataFetcher = async (i) => ({
                id: `load_${i}`,
                name: `Load Test Item ${i}`,
                timestamp: new Date().toISOString()
            });

            // Fire concurrent requests
            const promises = Array(concurrentRequests).fill().map((_, i) =>
                multiLevelCache.getWithStampedeProtection(
                    `load_key_${i}`,
                    testPattern,
                    async () => testDataFetcher(i),
                    testTtl
                )
            );

            const results = await Promise.all(promises);

            // Check that all requests completed successfully
            const allSuccessful = results.every(r => r !== null);

            // Check cache statistics
            const stats = multiLevelCache.getPerformanceMetrics();
            const hitRateImproved = stats.hitRate > 0;

            return {
                success: allSuccessful && hitRateImproved,
                concurrentRequests,
                successfulRequests: results.filter(r => r !== null).length,
                hitRate: stats.hitRate
            };

        } catch (error) {
            logger.error('Cache under load test error:', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Test failure recovery
    async testFailureRecovery() {
        try {
            const testKey = 'failure_recovery_test';
            const testPattern = 'user';
            const testData = { id: testKey, name: 'Failure Recovery Test User' };

            // Test 1: Cache with fallback data
            const fallbackResult = await staleWhileRevalidate.getWithFallbacks(
                testKey,
                testPattern,
                async () => { throw new Error('Simulated failure'); },
                {
                    fallbackData: testData,
                    ttl: 30,
                    staleTtl: 60
                }
            );

            const test1Passed = fallbackResult.data !== undefined &&
                fallbackResult.source === 'fallback';

            // Test 2: Emergency warming after failure
            await advancedCacheWarming.emergencyWarmCriticalData();

            const emergencyStats = advancedCacheWarming.getStatistics();
            const test2Passed = emergencyStats.successfulOperations > 0;

            // Test 3: Service health-based recovery
            const healthResult = await advancedCacheWarming.warmBasedOnServiceHealth();
            const test3Passed = healthResult.success !== false;

            return {
                success: test1Passed && test2Passed && test3Passed,
                fallbackRecovery: test1Passed,
                emergencyWarming: test2Passed,
                healthBasedRecovery: test3Passed
            };

        } catch (error) {
            logger.error('Failure recovery test error:', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Calculate overall results
    calculateOverallResults() {
        const componentResults = [
            this.testResults.multiLevelCache,
            this.testResults.cacheStampedeProtection,
            this.testResults.staleWhileRevalidate,
            this.testResults.advancedCacheWarming,
            this.testResults.intelligentCacheInvalidation
        ];

        const successfulComponents = componentResults.filter(r => r?.success).length;
        const totalComponents = componentResults.length;

        const successRate = totalComponents > 0 ? successfulComponents / totalComponents : 0;

        // Calculate overall performance score
        const performanceScore = this.calculatePerformanceScore();

        this.testResults.overall = {
            success: successRate >= 0.8, // Consider successful if 80%+ components pass
            successRate,
            successfulComponents,
            totalComponents,
            performanceScore,
            timestamp: new Date().toISOString()
        };

        logger.info('Calculated overall test results', {
            success: this.testResults.overall.success,
            successRate,
            performanceScore
        });
    }

    // Calculate performance score
    calculatePerformanceScore() {
        // Simple weighted performance calculation
        const metrics = this.performanceMetrics;

        const scores = {
            multiLevelCache: metrics.multiLevelCache.hitRate * 0.3,
            cacheStampedeProtection: metrics.cacheStampedeProtection.efficiency * 0.2,
            staleWhileRevalidate: metrics.staleWhileRevalidate.cacheEfficiency * 0.25,
            advancedCacheWarming: metrics.advancedCacheWarming.efficiency * 0.15,
            intelligentCacheInvalidation: metrics.intelligentCacheInvalidation.efficiency * 0.1
        };

        const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

        // Normalize to 0-100 scale
        return Math.min(100, Math.max(0, totalScore * 10));
    }

    // Get test report
    getTestReport() {
        return {
            summary: this.testResults.overall,
            components: {
                multiLevelCache: this.testResults.multiLevelCache,
                cacheStampedeProtection: this.testResults.cacheStampedeProtection,
                staleWhileRevalidate: this.testResults.staleWhileRevalidate,
                advancedCacheWarming: this.testResults.advancedCacheWarming,
                intelligentCacheInvalidation: this.testResults.intelligentCacheInvalidation,
                integration: this.testResults.integration
            },
            performance: this.performanceMetrics,
            timestamp: new Date().toISOString()
        };
    }

    // Get performance dashboard
    getPerformanceDashboard() {
        const report = this.getTestReport();

        return {
            overallPerformance: report.summary.performanceScore || 0,
            componentPerformance: Object.fromEntries(
                Object.entries(report.components).map(([component, result]) => [
                    component,
                    {
                        success: result?.success || false,
                        performance: this.performanceMetrics[component] || {}
                    }
                ])
            ),
            recommendations: this.generateRecommendations(report),
            timestamp: new Date().toISOString()
        };
    }

    // Generate recommendations based on test results
    generateRecommendations(report) {
        const recommendations = [];

        // Check multi-level cache performance
        if (report.components.multiLevelCache?.success === false) {
            recommendations.push({
                component: 'multiLevelCache',
                priority: 'high',
                message: 'Multi-level cache tests failed. Review cache configuration and error handling.',
                actions: [
                    'Check Redis connection',
                    'Review cache TTL settings',
                    'Verify memory cache limits'
                ]
            });
        } else if (this.performanceMetrics.multiLevelCache.hitRate < 0.7) {
            recommendations.push({
                component: 'multiLevelCache',
                priority: 'medium',
                message: `Cache hit rate is low (${this.performanceMetrics.multiLevelCache.hitRate}). Consider optimizing cache warming.`,
                actions: [
                    'Increase TTL for frequently accessed data',
                    'Add more items to cache warming',
                    'Review cache invalidation patterns'
                ]
            });
        }

        // Check stampede protection
        if (report.components.cacheStampedeProtection?.success === false) {
            recommendations.push({
                component: 'cacheStampedeProtection',
                priority: 'high',
                message: 'Cache stampede protection tests failed. Review lock acquisition and error handling.',
                actions: [
                    'Check Redis lock implementation',
                    'Review retry logic',
                    'Verify lock TTL settings'
                ]
            });
        } else if (this.performanceMetrics.cacheStampedeProtection.preventionRate < 0.5) {
            recommendations.push({
                component: 'cacheStampedeProtection',
                priority: 'medium',
                message: `Stampede prevention rate is low (${this.performanceMetrics.cacheStampedeProtection.preventionRate}).`,
                actions: [
                    'Review lock acquisition strategy',
                    'Adjust retry parameters',
                    'Consider longer lock TTLs'
                ]
            });
        }

        // Check SWR performance
        if (report.components.staleWhileRevalidate?.success === false) {
            recommendations.push({
                component: 'staleWhileRevalidate',
                priority: 'high',
                message: 'Stale-while-revalidate tests failed. Review revalidation logic and error handling.',
                actions: [
                    'Check background revalidation',
                    'Review stale data handling',
                    'Verify fallback mechanisms'
                ]
            });
        } else if (this.performanceMetrics.staleWhileRevalidate.cacheEfficiency < 0.6) {
            recommendations.push({
                component: 'staleWhileRevalidate',
                priority: 'medium',
                message: `SWR cache efficiency is low (${this.performanceMetrics.staleWhileRevalidate.cacheEfficiency}).`,
                actions: [
                    'Review stale TTL settings',
                    'Optimize revalidation timing',
                    'Improve fallback data quality'
                ]
            });
        }

        // Check cache warming
        if (report.components.advancedCacheWarming?.success === false) {
            recommendations.push({
                component: 'advancedCacheWarming',
                priority: 'high',
                message: 'Cache warming tests failed. Review warming strategies and error handling.',
                actions: [
                    'Check data fetcher implementations',
                    'Review warming queue processing',
                    'Verify emergency warming logic'
                ]
            });
        } else if (this.performanceMetrics.advancedCacheWarming.successRate < 0.8) {
            recommendations.push({
                component: 'advancedCacheWarming',
                priority: 'medium',
                message: `Cache warming success rate is low (${this.performanceMetrics.advancedCacheWarming.successRate}).`,
                actions: [
                    'Review warming item priorities',
                    'Check data fetcher reliability',
                    'Adjust warming batch sizes'
                ]
            });
        }

        // Check intelligent invalidation
        if (report.components.intelligentCacheInvalidation?.success === false) {
            recommendations.push({
                component: 'intelligentCacheInvalidation',
                priority: 'high',
                message: 'Intelligent invalidation tests failed. Review invalidation strategies and error handling.',
                actions: [
                    'Check invalidation condition logic',
                    'Review dependency analysis',
                    'Verify lazy invalidation processing'
                ]
            });
        } else if (this.performanceMetrics.intelligentCacheInvalidation.successRate < 0.7) {
            recommendations.push({
                component: 'intelligentCacheInvalidation',
                priority: 'medium',
                message: `Invalidation success rate is low (${this.performanceMetrics.intelligentCacheInvalidation.successRate}).`,
                actions: [
                    'Review selective invalidation conditions',
                    'Check cascading invalidation logic',
                    'Adjust invalidation priorities'
                ]
            });
        }

        return recommendations;
    }

    // Reset all test data
    reset() {
        this.testResults = {
            multiLevelCache: null,
            cacheStampedeProtection: null,
            staleWhileRevalidate: null,
            advancedCacheWarming: null,
            intelligentCacheInvalidation: null,
            overall: null
        };

        this.performanceMetrics = {
            multiLevelCache: {},
            cacheStampedeProtection: {},
            staleWhileRevalidate: {},
            advancedCacheWarming: {},
            intelligentCacheInvalidation: {}
        };

        logger.info('Reset advanced cache testing data');
    }
}

export const advancedCacheTesting = new AdvancedCacheTesting();
export default advancedCacheTesting;