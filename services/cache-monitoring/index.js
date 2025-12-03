import { advancedCache } from '../advanced-cache/index.js';
import { distributedCache } from '../distributed-cache/index.js';
import { logger } from '../../server/services/loggerService.js';
import { serviceDiscovery } from '../service-discovery/index.js';

class CacheMonitoringService {
    constructor() {
        this.monitoringInterval = null;
        this.statsHistory = [];
        this.maxHistory = 100; // Keep last 100 measurements
        this.performanceThresholds = {
            cacheHitRate: 0.7, // 70% hit rate target
            responseTime: 100, // 100ms max response time
            memoryUsage: 0.8 // 80% memory usage threshold
        };
    }

    // Start monitoring service
    start(interval = 60000) {
        // Initial monitoring
        this.captureMetrics();

        // Set up periodic monitoring
        this.monitoringInterval = setInterval(() => {
            this.captureMetrics();
        }, interval);

        logger.info('Cache monitoring service started', { interval });
    }

    // Stop monitoring service
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        logger.info('Cache monitoring service stopped');
    }

    // Capture comprehensive metrics
    async captureMetrics() {
        try {
            const timestamp = new Date().toISOString();
            const metrics = {
                timestamp,
                advancedCache: await this.getAdvancedCacheMetrics(),
                distributedCache: await this.getDistributedCacheMetrics(),
                serviceHealth: this.getServiceHealthMetrics(),
                systemMetrics: this.getSystemMetrics()
            };

            // Store in history
            this.addToHistory(metrics);

            // Log summary
            this.logMetricsSummary(metrics);

            // Check for performance issues
            this.checkPerformanceIssues(metrics);

            return metrics;

        } catch (error) {
            logger.error('Cache metrics capture error:', { error: error.message });
            return null;
        }
    }

    // Get advanced cache metrics
    async getAdvancedCacheMetrics() {
        try {
            const stats = advancedCache.getCacheStats();
            const performance = await advancedCache.getPerformanceMetrics();

            return {
                ...stats,
                performance,
                patterns: Object.keys(advancedCache.cachePatterns),
                status: 'healthy'
            };

        } catch (error) {
            logger.error('Advanced cache metrics error:', { error: error.message });
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get distributed cache metrics
    async getDistributedCacheMetrics() {
        try {
            if (!distributedCache.isConnected) {
                return {
                    status: 'disconnected',
                    timestamp: new Date().toISOString()
                };
            }

            const health = await distributedCache.getClusterHealth();
            const performance = await distributedCache.getPerformanceMetrics();

            return {
                ...health,
                performance,
                status: health.healthy ? 'healthy' : 'degraded'
            };

        } catch (error) {
            logger.error('Distributed cache metrics error:', { error: error.message });
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get service health metrics
    getServiceHealthMetrics() {
        try {
            const serviceHealth = serviceDiscovery.getAllServicesInfo();

            return Object.keys(serviceHealth).reduce((acc, serviceName) => {
                acc[serviceName] = {
                    status: serviceHealth[serviceName].health?.status || 'unknown',
                    instances: serviceHealth[serviceName].instances?.length || 0,
                    healthyInstances: serviceHealth[serviceName].instances?.filter(i => i.health?.status === 'healthy').length || 0
                };
                return acc;
            }, {});

        } catch (error) {
            logger.error('Service health metrics error:', { error: error.message });
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    // Get system metrics
    getSystemMetrics() {
        try {
            return {
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                uptime: process.uptime(),
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            };

        } catch (error) {
            logger.error('System metrics error:', { error: error.message });
            return {
                error: error.message
            };
        }
    }

    // Add metrics to history
    addToHistory(metrics) {
        this.statsHistory.push(metrics);

        // Keep history within limits
        if (this.statsHistory.length > this.maxHistory) {
            this.statsHistory = this.statsHistory.slice(-this.maxHistory);
        }
    }

    // Get historical metrics
    getHistoricalMetrics() {
        return {
            count: this.statsHistory.length,
            metrics: [...this.statsHistory],
            timeRange: this.statsHistory.length > 0
                ? `${this.statsHistory[0].timestamp} to ${this.statsHistory[this.statsHistory.length - 1].timestamp}`
                : 'No data'
        };
    }

    // Log metrics summary
    logMetricsSummary(metrics) {
        try {
            const advanced = metrics.advancedCache;
            const distributed = metrics.distributedCache;

            const summary = {
                timestamp: metrics.timestamp,
                cacheHitRate: advanced.hitRate || 0,
                clusterHealth: distributed.status || 'unknown',
                serviceHealth: Object.keys(metrics.serviceHealth).reduce((acc, service) => {
                    acc[service] = metrics.serviceHealth[service].status;
                    return acc;
                }, {}),
                memoryUsage: metrics.systemMetrics.memoryUsage?.heapUsed || 0
            };

            logger.info('Cache metrics summary', summary);

        } catch (error) {
            logger.error('Metrics summary logging error:', { error: error.message });
        }
    }

    // Check for performance issues
    checkPerformanceIssues(metrics) {
        try {
            const issues = [];

            // Check cache hit rate
            const hitRate = metrics.advancedCache.hitRate || 0;
            if (hitRate < this.performanceThresholds.cacheHitRate) {
                issues.push({
                    type: 'cache_hit_rate',
                    severity: 'warning',
                    message: `Cache hit rate below threshold: ${hitRate.toFixed(2)} < ${this.performanceThresholds.cacheHitRate}`,
                    current: hitRate,
                    threshold: this.performanceThresholds.cacheHitRate
                });
            }

            // Check distributed cache health
            if (metrics.distributedCache.status !== 'healthy') {
                issues.push({
                    type: 'distributed_cache',
                    severity: 'critical',
                    message: `Distributed cache unhealthy: ${metrics.distributedCache.status}`,
                    status: metrics.distributedCache.status
                });
            }

            // Check service health
            for (const [serviceName, serviceInfo] of Object.entries(metrics.serviceHealth)) {
                if (serviceInfo.status !== 'healthy') {
                    issues.push({
                        type: 'service_health',
                        severity: 'warning',
                        message: `Service unhealthy: ${serviceName} (${serviceInfo.status})`,
                        service: serviceName,
                        status: serviceInfo.status
                    });
                }
            }

            // Log issues if any
            if (issues.length > 0) {
                logger.warn('Performance issues detected', { issues });
            }

            return issues;

        } catch (error) {
            logger.error('Performance issue checking error:', { error: error.message });
            return [];
        }
    }

    // Get cache performance report
    async getPerformanceReport() {
        try {
            const currentMetrics = await this.captureMetrics();
            const history = this.getHistoricalMetrics();

            return {
                current: currentMetrics,
                history,
                analysis: this.analyzePerformance(currentMetrics, history),
                recommendations: this.generateRecommendations(currentMetrics)
            };

        } catch (error) {
            logger.error('Performance report generation error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Analyze performance trends
    analyzePerformance(currentMetrics, history) {
        try {
            if (history.metrics.length < 2) {
                return {
                    message: 'Insufficient historical data for trend analysis',
                    dataPoints: history.metrics.length
                };
            }

            // Simple trend analysis
            const hitRates = history.metrics.map(m => m.advancedCache.hitRate || 0);
            const avgHitRate = hitRates.reduce((sum, rate) => sum + rate, 0) / hitRates.length;

            const currentHitRate = currentMetrics.advancedCache.hitRate || 0;
            const hitRateTrend = currentHitRate > avgHitRate ? 'improving' : 'declining';

            return {
                hitRateTrend,
                currentHitRate,
                averageHitRate: avgHitRate,
                memoryUsageTrend: this.analyzeMemoryTrend(history),
                serviceHealthTrend: this.analyzeServiceHealthTrend(history)
            };

        } catch (error) {
            logger.error('Performance analysis error:', { error: error.message });
            return {
                error: error.message
            };
        }
    }

    // Analyze memory trend
    analyzeMemoryTrend(history) {
        try {
            const memoryUsages = history.metrics
                .map(m => m.systemMetrics.memoryUsage?.heapUsed || 0)
                .filter(usage => usage > 0);

            if (memoryUsages.length < 2) {
                return 'insufficient_data';
            }

            const latest = memoryUsages[memoryUsages.length - 1];
            const earliest = memoryUsages[0];
            const change = latest - earliest;
            const percentChange = (change / earliest) * 100;

            if (percentChange > 20) {
                return 'increasing_significantly';
            } else if (percentChange > 5) {
                return 'increasing';
            } else if (percentChange < -5) {
                return 'decreasing';
            } else {
                return 'stable';
            }

        } catch (error) {
            logger.error('Memory trend analysis error:', { error: error.message });
            return 'error';
        }
    }

    // Analyze service health trend
    analyzeServiceHealthTrend(history) {
        try {
            const serviceHealthCounts = history.metrics.map(m => {
                return Object.values(m.serviceHealth).filter(s => s.status === 'healthy').length;
            });

            if (serviceHealthCounts.length < 2) {
                return 'insufficient_data';
            }

            const latest = serviceHealthCounts[serviceHealthCounts.length - 1];
            const earliest = serviceHealthCounts[0];

            if (latest > earliest) {
                return 'improving';
            } else if (latest < earliest) {
                return 'declining';
            } else {
                return 'stable';
            }

        } catch (error) {
            logger.error('Service health trend analysis error:', { error: error.message });
            return 'error';
        }
    }

    // Generate performance recommendations
    generateRecommendations(metrics) {
        try {
            const recommendations = [];

            // Cache hit rate recommendations
            const hitRate = metrics.advancedCache.hitRate || 0;
            if (hitRate < this.performanceThresholds.cacheHitRate) {
                recommendations.push({
                    type: 'cache_optimization',
                    priority: 'high',
                    message: `Cache hit rate is low (${hitRate.toFixed(2)}). Consider increasing cache TTL or warming more data.`,
                    actions: [
                        'Review cache warming patterns',
                        'Increase TTL for frequently accessed data',
                        'Add more data to cache warming'
                    ]
                });
            }

            // Distributed cache recommendations
            if (metrics.distributedCache.status !== 'healthy') {
                recommendations.push({
                    type: 'distributed_cache',
                    priority: 'critical',
                    message: 'Distributed cache is unhealthy. Check Redis cluster status.',
                    actions: [
                        'Verify Redis cluster nodes are running',
                        'Check network connectivity between nodes',
                        'Review Redis cluster logs'
                    ]
                });
            }

            // Service health recommendations
            for (const [serviceName, serviceInfo] of Object.entries(metrics.serviceHealth)) {
                if (serviceInfo.status !== 'healthy') {
                    recommendations.push({
                        type: 'service_health',
                        priority: 'high',
                        message: `Service ${serviceName} is unhealthy (${serviceInfo.status}).`,
                        actions: [
                            'Check service logs',
                            'Verify service is running',
                            'Review service dependencies'
                        ]
                    });
                }
            }

            return recommendations;

        } catch (error) {
            logger.error('Recommendations generation error:', { error: error.message });
            return [];
        }
    }

    // Get cache monitoring dashboard data
    async getDashboardData() {
        try {
            const currentMetrics = await this.captureMetrics();
            const history = this.getHistoricalMetrics();
            const issues = this.checkPerformanceIssues(currentMetrics);
            const recommendations = this.generateRecommendations(currentMetrics);

            return {
                current: currentMetrics,
                history,
                issues,
                recommendations,
                thresholds: this.performanceThresholds,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Dashboard data retrieval error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Set performance thresholds
    setPerformanceThresholds(thresholds) {
        this.performanceThresholds = {
            ...this.performanceThresholds,
            ...thresholds
        };
        logger.info('Performance thresholds updated', { thresholds: this.performanceThresholds });
    }

    // Get current performance thresholds
    getPerformanceThresholds() {
        return this.performanceThresholds;
    }

    // Reset monitoring history
    resetHistory() {
        this.statsHistory = [];
        logger.info('Cache monitoring history reset');
    }
}

export const cacheMonitoringService = new CacheMonitoringService();
export default cacheMonitoringService;