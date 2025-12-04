import { multiLevelCache } from '../multi-level-cache/index.js';
import { cacheStampedeProtection } from '../cache-stampede-protection/index.js';
import { staleWhileRevalidate } from '../stale-while-revalidate/index.js';
import { logger } from '../../server/services/loggerService.js';
import { serviceDiscovery } from '../service-discovery/index.js';

class AdvancedCacheWarming {
    constructor() {
        this.warmingStrategies = {
            critical: {
                priority: 1,
                ttl: 86400, // 24 hours
                staleTtl: 172800, // 48 hours
                revalidate: true,
                stampedeProtection: true
            },
            high: {
                priority: 2,
                ttl: 3600, // 1 hour
                staleTtl: 7200, // 2 hours
                revalidate: true,
                stampedeProtection: true
            },
            medium: {
                priority: 3,
                ttl: 1800, // 30 minutes
                staleTtl: 3600, // 1 hour
                revalidate: false,
                stampedeProtection: true
            },
            low: {
                priority: 4,
                ttl: 900, // 15 minutes
                staleTtl: 1800, // 30 minutes
                revalidate: false,
                stampedeProtection: false
            }
        };

        this.warmingQueue = [];
        this.activeWarming = new Set();
        this.maxConcurrentWarming = 5;
        this.warmingInterval = null;

        this.stats = {
            totalWarmingOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            bytesWarmed: 0,
            lastWarmingTime: null
        };
    }

    // Start cache warming service
    start() {
        if (this.warmingInterval) {
            logger.info('Cache warming service already running');
            return;
        }

        // Start periodic warming
        this.warmingInterval = setInterval(() => {
            this.processWarmingQueue();
        }, 60000); // Every minute

        logger.info('Advanced cache warming service started');
    }

    // Stop cache warming service
    stop() {
        if (this.warmingInterval) {
            clearInterval(this.warmingInterval);
            this.warmingInterval = null;
        }

        logger.info('Advanced cache warming service stopped');
    }

    // Add items to warming queue
    addToWarmingQueue(items) {
        if (!Array.isArray(items)) {
            items = [items];
        }

        // Add items with priority
        items.forEach(item => {
            const strategy = this.warmingStrategies[item.priority] || this.warmingStrategies.medium;
            this.warmingQueue.push({
                ...item,
                strategy,
                addedTime: new Date().toISOString()
            });
        });

        // Sort by priority
        this.warmingQueue.sort((a, b) => a.strategy.priority - b.strategy.priority);

        logger.debug('Added to warming queue', {
            count: items.length,
            queueSize: this.warmingQueue.length
        });
    }

    // Process warming queue
    async processWarmingQueue() {
        if (this.activeWarming.size >= this.maxConcurrentWarming) {
            logger.debug('Max concurrent warming operations reached');
            return;
        }

        if (this.warmingQueue.length === 0) {
            logger.debug('Warming queue is empty');
            return;
        }

        // Get next item from queue
        const nextItem = this.warmingQueue.shift();
        const operationId = `${nextItem.pattern}:${nextItem.key}:${Date.now()}`;

        this.activeWarming.add(operationId);
        this.stats.totalWarmingOperations++;

        logger.debug('Starting warming operation', {
            key: nextItem.key,
            pattern: nextItem.pattern,
            priority: nextItem.priority
        });

        try {
            // Execute warming with appropriate strategy
            const result = await this.warmWithStrategy(nextItem);

            if (result.success) {
                this.stats.successfulOperations++;
                this.stats.bytesWarmed += result.bytes || 0;
            } else {
                this.stats.failedOperations++;
            }

            logger.info('Completed warming operation', {
                key: nextItem.key,
                pattern: nextItem.pattern,
                success: result.success,
                bytes: result.bytes
            });

        } catch (error) {
            this.stats.failedOperations++;
            logger.error('Warming operation error:', {
                error: error.message,
                key: nextItem.key,
                pattern: nextItem.pattern
            });

        } finally {
            this.activeWarming.delete(operationId);
            this.stats.lastWarmingTime = new Date().toISOString();
        }
    }

    // Warm with appropriate strategy
    async warmWithStrategy(item) {
        const startTime = Date.now();
        let result;

        try {
            // Check if already cached
            const existingCache = await multiLevelCache.get(item.key, item.pattern);

            if (existingCache !== null) {
                logger.debug('Item already cached, skipping warming', {
                    key: item.key,
                    pattern: item.pattern
                });

                return {
                    success: true,
                    bytes: JSON.stringify(existingCache).length,
                    cached: true
                };
            }

            // Use appropriate warming method based on strategy
            if (item.strategy.revalidate) {
                result = await this.warmWithRevalidation(item);
            } else if (item.strategy.stampedeProtection) {
                result = await this.warmWithStampedeProtection(item);
            } else {
                result = await this.warmStandard(item);
            }

            const duration = Date.now() - startTime;
            const dataSize = result.data ? JSON.stringify(result.data).length : 0;

            return {
                success: true,
                bytes: dataSize,
                duration,
                ...result
            };

        } catch (error) {
            logger.error('Warming strategy error:', {
                error: error.message,
                key: item.key,
                pattern: item.pattern,
                strategy: item.strategy
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    // Warm with stale-while-revalidate
    async warmWithRevalidation(item) {
        try {
            const result = await staleWhileRevalidate.get(
                item.key,
                item.pattern,
                item.dataFetcher,
                {
                    ttl: item.strategy.ttl,
                    staleTtl: item.strategy.staleTtl,
                    revalidateInBackground: true,
                    useStampedeProtection: item.strategy.stampedeProtection
                }
            );

            return {
                data: result.data,
                source: result.source,
                revalidating: result.revalidating
            };

        } catch (error) {
            logger.error('Revalidation warming error:', {
                error: error.message,
                key: item.key,
                pattern: item.pattern
            });
            throw error;
        }
    }

    // Warm with stampede protection
    async warmWithStampedeProtection(item) {
        try {
            const result = await cacheStampedeProtection.protect(
                item.key,
                item.pattern,
                item.dataFetcher,
                {
                    ttl: item.strategy.ttl,
                    lockTtl: 15 // Longer lock for warming operations
                }
            );

            return {
                data: result.data,
                source: result.source,
                stampedePrevented: result.stampedePrevented
            };

        } catch (error) {
            logger.error('Stampede protection warming error:', {
                error: error.message,
                key: item.key,
                pattern: item.pattern
            });
            throw error;
        }
    }

    // Standard warming
    async warmStandard(item) {
        try {
            // Fetch data
            const data = await item.dataFetcher();

            // Cache with multi-level caching
            await multiLevelCache.set(
                item.key,
                data,
                item.pattern,
                item.strategy.ttl
            );

            // Also cache stale version
            await multiLevelCache.setStaleCache(
                item.key,
                data,
                item.pattern,
                item.strategy.staleTtl
            );

            return {
                data,
                source: 'warmed',
                strategy: 'standard'
            };

        } catch (error) {
            logger.error('Standard warming error:', {
                error: error.message,
                key: item.key,
                pattern: item.pattern
            });
            throw error;
        }
    }

    // Intelligent cache warming based on service health
    async warmBasedOnServiceHealth() {
        try {
            const serviceHealth = serviceDiscovery.getAllServicesInfo();
            const warmingItems = [];

            logger.info('Starting service health-based cache warming');

            // Analyze each service and determine what to warm
            for (const [serviceName, serviceInfo] of Object.entries(serviceHealth)) {
                if (serviceInfo.health?.status === 'healthy') {
                    const items = this.getWarmingItemsForService(serviceName, serviceInfo);
                    warmingItems.push(...items);
                }
            }

            // Add to warming queue
            this.addToWarmingQueue(warmingItems);

            return {
                success: true,
                itemsAdded: warmingItems.length,
                servicesProcessed: Object.keys(serviceHealth).length
            };

        } catch (error) {
            logger.error('Service health-based warming error:', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get warming items for specific service
    getWarmingItemsForService(serviceName, serviceInfo) {
        const items = [];

        switch (serviceName) {
            case 'auth':
                items.push(
                    this.createWarmingItem('user', 'active_users', 'high', () => this.fetchActiveUsers()),
                    this.createWarmingItem('user', 'admin_users', 'medium', () => this.fetchAdminUsers())
                );
                break;

            case 'media':
                items.push(
                    this.createWarmingItem('media', 'recent_media', 'high', () => this.fetchRecentMedia()),
                    this.createWarmingItem('media', 'featured_media', 'medium', () => this.fetchFeaturedMedia())
                );
                break;

            case 'event':
                items.push(
                    this.createWarmingItem('event', 'popular_events', 'critical', () => this.fetchPopularEvents()),
                    this.createWarmingItem('event', 'recent_events', 'high', () => this.fetchRecentEvents())
                );
                break;

            default:
                logger.debug('No specific warming items for service', { service: serviceName });
        }

        return items;
    }

    // Create warming item
    createWarmingItem(pattern, key, priority, dataFetcher) {
        return {
            pattern,
            key,
            priority,
            dataFetcher,
            service: pattern // Associate with service
        };
    }

    // Predictive cache warming based on usage patterns
    async warmPredictively(usageData) {
        try {
            const predictiveItems = this.analyzeUsagePatterns(usageData);
            this.addToWarmingQueue(predictiveItems);

            logger.info('Added predictive warming items', {
                count: predictiveItems.length
            });

            return {
                success: true,
                itemsAdded: predictiveItems.length
            };

        } catch (error) {
            logger.error('Predictive warming error:', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Analyze usage patterns and create warming items
    analyzeUsagePatterns(usageData) {
        const items = [];

        // Simple pattern analysis
        if (usageData.morningPeak) {
            items.push(
                this.createWarmingItem('event', 'morning_events', 'high', () => this.fetchMorningEvents()),
                this.createWarmingItem('user', 'morning_users', 'medium', () => this.fetchMorningUsers())
            );
        }

        if (usageData.eveningPeak) {
            items.push(
                this.createWarmingItem('media', 'evening_media', 'high', () => this.fetchEveningMedia()),
                this.createWarmingItem('event', 'evening_events', 'medium', () => this.fetchEveningEvents())
            );
        }

        if (usageData.weekendPeak) {
            items.push(
                this.createWarmingItem('event', 'weekend_events', 'critical', () => this.fetchWeekendEvents()),
                this.createWarmingItem('media', 'weekend_media', 'high', () => this.fetchWeekendMedia())
            );
        }

        return items;
    }

    // Data fetchers for warming
    async fetchActiveUsers() {
        // Mock implementation - would call user service
        return {
            users: [
                { id: 'user-1', name: 'John Doe', lastActive: new Date().toISOString() },
                { id: 'user-2', name: 'Jane Smith', lastActive: new Date().toISOString() }
            ],
            timestamp: new Date().toISOString()
        };
    }

    async fetchAdminUsers() {
        // Mock implementation
        return {
            users: [
                { id: 'admin-1', name: 'Admin User', role: 'admin' }
            ],
            timestamp: new Date().toISOString()
        };
    }

    async fetchRecentMedia() {
        // Mock implementation
        return {
            media: [
                { id: 'media-1', eventId: 'event-1', type: 'image' },
                { id: 'media-2', eventId: 'event-2', type: 'video' }
            ],
            timestamp: new Date().toISOString()
        };
    }

    async fetchFeaturedMedia() {
        // Mock implementation
        return {
            media: [
                { id: 'featured-1', eventId: 'event-1', type: 'image', featured: true }
            ],
            timestamp: new Date().toISOString()
        };
    }

    async fetchPopularEvents() {
        // Mock implementation
        return {
            events: [
                { id: 'event-1', title: 'Summer Party', views: 1000 },
                { id: 'event-2', title: 'Wedding', views: 800 }
            ],
            timestamp: new Date().toISOString()
        };
    }

    async fetchRecentEvents() {
        // Mock implementation
        return {
            events: [
                { id: 'event-3', title: 'Birthday', createdAt: new Date().toISOString() },
                { id: 'event-4', title: 'Conference', createdAt: new Date().toISOString() }
            ],
            timestamp: new Date().toISOString()
        };
    }

    async fetchMorningEvents() {
        // Mock implementation
        return {
            events: [
                { id: 'morning-1', title: 'Breakfast Meeting', time: 'morning' }
            ],
            timestamp: new Date().toISOString()
        };
    }

    async fetchMorningUsers() {
        // Mock implementation
        return {
            users: [
                { id: 'morning-user-1', name: 'Early Bird', activeTime: 'morning' }
            ],
            timestamp: new Date().toISOString()
        };
    }

    async fetchEveningMedia() {
        // Mock implementation
        return {
            media: [
                { id: 'evening-1', eventId: 'event-1', type: 'video', time: 'evening' }
            ],
            timestamp: new Date().toISOString()
        };
    }

    async fetchEveningEvents() {
        // Mock implementation
        return {
            events: [
                { id: 'evening-1', title: 'Dinner Party', time: 'evening' }
            ],
            timestamp: new Date().toISOString()
        };
    }

    async fetchWeekendEvents() {
        // Mock implementation
        return {
            events: [
                { id: 'weekend-1', title: 'Weekend Festival', time: 'weekend' }
            ],
            timestamp: new Date().toISOString()
        };
    }

    async fetchWeekendMedia() {
        // Mock implementation
        return {
            media: [
                { id: 'weekend-1', eventId: 'event-1', type: 'image', time: 'weekend' }
            ],
            timestamp: new Date().toISOString()
        };
    }

    // Get warming statistics
    getStatistics() {
        const totalOperations = this.stats.totalWarmingOperations;
        const successRate = totalOperations > 0
            ? this.stats.successfulOperations / totalOperations
            : 0;

        return {
            ...this.stats,
            successRate,
            queueSize: this.warmingQueue.length,
            activeOperations: this.activeWarming.size,
            efficiency: this.calculateEfficiency(),
            lastUpdated: new Date().toISOString()
        };
    }

    // Calculate warming efficiency
    calculateEfficiency() {
        const totalOperations = this.stats.totalWarmingOperations;
        if (totalOperations === 0) return 0;

        const successRate = this.stats.successfulOperations / totalOperations;
        const byteEfficiency = this.stats.bytesWarmed / (this.stats.successfulOperations || 1);

        // Weighted efficiency score
        return (successRate * 0.7 + Math.min(1, byteEfficiency / 1000) * 0.3);
    }

    // Reset statistics
    resetStatistics() {
        this.stats = {
            totalWarmingOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            bytesWarmed: 0,
            lastWarmingTime: null
        };
    }

    // Get queue status
    getQueueStatus() {
        return {
            queueSize: this.warmingQueue.length,
            activeOperations: this.activeWarming.size,
            nextItems: this.warmingQueue.slice(0, 5).map(item => ({
                key: item.key,
                pattern: item.pattern,
                priority: item.priority,
                strategy: item.strategy
            })),
            timestamp: new Date().toISOString()
        };
    }

    // Emergency cache warming for critical failures
    async emergencyWarmCriticalData() {
        try {
            logger.info('Starting emergency cache warming for critical data');

            const criticalItems = [
                this.createWarmingItem('event', 'popular_events', 'critical', () => this.fetchPopularEvents()),
                this.createWarmingItem('user', 'active_users', 'critical', () => this.fetchActiveUsers()),
                this.createWarmingItem('media', 'recent_media', 'critical', () => this.fetchRecentMedia())
            ];

            // Process immediately, bypassing queue
            const results = [];

            for (const item of criticalItems) {
                try {
                    const result = await this.warmWithStrategy(item);
                    results.push({
                        ...item,
                        success: result.success,
                        bytes: result.bytes
                    });

                    if (result.success) {
                        this.stats.successfulOperations++;
                        this.stats.bytesWarmed += result.bytes || 0;
                    } else {
                        this.stats.failedOperations++;
                    }

                } catch (error) {
                    logger.error('Emergency warming error:', {
                        error: error.message,
                        key: item.key,
                        pattern: item.pattern
                    });

                    results.push({
                        ...item,
                        success: false,
                        error: error.message
                    });

                    this.stats.failedOperations++;
                }
            }

            this.stats.totalWarmingOperations += criticalItems.length;
            this.stats.lastWarmingTime = new Date().toISOString();

            return {
                success: true,
                itemsProcessed: criticalItems.length,
                successfulItems: results.filter(r => r.success).length,
                results
            };

        } catch (error) {
            logger.error('Emergency warming error:', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export const advancedCacheWarming = new AdvancedCacheWarming();
export default advancedCacheWarming;