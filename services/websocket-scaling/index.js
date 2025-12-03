import { logger } from '../../server/services/loggerService.js';
import { serviceDiscovery } from '../service-discovery/index.js';
import { advancedCache } from '../advanced-cache/index.js';
import { connectionThrottling } from '../connection-throttling/index.js';

class WebSocketScaling {
    constructor() {
        this.serverInstances = [];
        this.loadBalancer = {
            strategy: 'round-robin', // Default strategy
            currentIndex: 0,
            serverWeights: {}
        };
        this.scalingConfig = {
            minServers: 1,
            maxServers: 10,
            scaleUpThreshold: 0.8, // 80% CPU usage
            scaleDownThreshold: 0.3, // 30% CPU usage
            cooldownPeriod: 300000, // 5 minutes
            healthCheckInterval: 30000 // 30 seconds
        };
        this.scalingHistory = [];
        this.healthCheckInterval = null;
    }

    // Start WebSocket scaling service
    start() {
        // Initial server discovery
        this.discoverServerInstances();

        // Set up periodic health checks
        this.healthCheckInterval = setInterval(() => {
            this.checkServerHealth();
        }, this.scalingConfig.healthCheckInterval);

        // Set up periodic scaling decisions
        setInterval(() => {
            this.makeScalingDecision();
        }, 60000); // Every minute

        logger.info('WebSocket scaling service started');
    }

    // Stop WebSocket scaling service
    stop() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        logger.info('WebSocket scaling service stopped');
    }

    // Discover server instances
    async discoverServerInstances() {
        try {
            // Get WebSocket servers from service discovery
            const services = serviceDiscovery.getAllServicesInfo();
            const websocketServices = Object.keys(services).filter(
                name => name.includes('websocket')
            );

            // Register each WebSocket server
            for (const serviceName of websocketServices) {
                const service = services[serviceName];
                for (const instance of service.instances) {
                    await this.registerServerInstance(instance.url, service.health.status);
                }
            }

            logger.info('WebSocket server discovery completed', {
                serverCount: this.serverInstances.length
            });

        } catch (error) {
            logger.error('Server discovery error:', { error: error.message });
        }
    }

    // Register server instance
    async registerServerInstance(url, initialStatus = 'unknown') {
        try {
            // Check if already registered
            const exists = this.serverInstances.some(instance => instance.url === url);
            if (exists) {
                return;
            }

            // Add new server instance
            const serverId = `ws-server-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
            const newInstance = {
                serverId,
                url,
                status: initialStatus,
                connections: 0,
                cpuUsage: 0,
                memoryUsage: 0,
                registeredAt: new Date().toISOString(),
                lastHealthCheck: new Date().toISOString(),
                weight: 1 // Default weight
            };

            this.serverInstances.push(newInstance);
            this.loadBalancer.serverWeights[serverId] = newInstance.weight;

            // Store in cache
            await advancedCache.set(`ws_scaling:server:${serverId}`, newInstance, 'scaling', 3600);

            logger.info('WebSocket server instance registered', {
                serverId,
                url,
                status: initialStatus
            });

        } catch (error) {
            logger.error('Server registration error:', { error: error.message, url });
        }
    }

    // Check server health
    async checkServerHealth() {
        try {
            for (const instance of this.serverInstances) {
                try {
                    // In a real implementation, this would call server health endpoints
                    // For now, simulate health check
                    const healthStatus = this.simulateHealthCheck(instance);
                    instance.status = healthStatus.status;
                    instance.connections = healthStatus.connections;
                    instance.cpuUsage = healthStatus.cpuUsage;
                    instance.memoryUsage = healthStatus.memoryUsage;
                    instance.lastHealthCheck = new Date().toISOString();

                    // Update cache
                    await advancedCache.set(`ws_scaling:server:${instance.serverId}`, instance, 'scaling', 3600);

                    logger.debug('Server health check completed', {
                        serverId: instance.serverId,
                        status: instance.status
                    });

                } catch (error) {
                    logger.error('Server health check error:', {
                        error: error.message,
                        serverId: instance.serverId
                    });
                }
            }

        } catch (error) {
            logger.error('Server health checking error:', { error: error.message });
        }
    }

    // Simulate health check (mock)
    simulateHealthCheck(instance) {
        // Mock health data
        return {
            status: ['healthy', 'degraded', 'unhealthy'][Math.floor(Math.random() * 3)],
            connections: Math.floor(Math.random() * 1000),
            cpuUsage: Math.random(),
            memoryUsage: Math.random()
        };
    }

    // Make scaling decision
    async makeScalingDecision() {
        try {
            // Check if we should scale up or down
            const shouldScaleUp = await this.shouldScaleUp();
            const shouldScaleDown = await this.shouldScaleDown();

            if (shouldScaleUp) {
                await this.scaleUp();
            } else if (shouldScaleDown) {
                await this.scaleDown();
            } else {
                logger.debug('No scaling action needed at this time');
            }

        } catch (error) {
            logger.error('Scaling decision error:', { error: error.message });
        }
    }

    // Check if should scale up
    async shouldScaleUp() {
        try {
            // Check if we're at max servers
            if (this.serverInstances.length >= this.scalingConfig.maxServers) {
                return false;
            }

            // Calculate average CPU usage
            const healthyServers = this.serverInstances.filter(
                instance => instance.status === 'healthy'
            );

            if (healthyServers.length === 0) {
                return true; // Scale up if no healthy servers
            }

            const avgCpuUsage = healthyServers.reduce(
                (sum, server) => sum + server.cpuUsage, 0
            ) / healthyServers.length;

            // Scale up if CPU usage is high
            return avgCpuUsage > this.scalingConfig.scaleUpThreshold;

        } catch (error) {
            logger.error('Scale up check error:', { error: error.message });
            return false;
        }
    }

    // Check if should scale down
    async shouldScaleDown() {
        try {
            // Check if we're at min servers
            if (this.serverInstances.length <= this.scalingConfig.minServers) {
                return false;
            }

            // Calculate average CPU usage
            const healthyServers = this.serverInstances.filter(
                instance => instance.status === 'healthy'
            );

            if (healthyServers.length === 0) {
                return false; // Don't scale down if no healthy servers
            }

            const avgCpuUsage = healthyServers.reduce(
                (sum, server) => sum + server.cpuUsage, 0
            ) / healthyServers.length;

            // Scale down if CPU usage is low
            return avgCpuUsage < this.scalingConfig.scaleDownThreshold;

        } catch (error) {
            logger.error('Scale down check error:', { error: error.message });
            return false;
        }
    }

    // Scale up
    async scaleUp() {
        try {
            // In a real implementation, this would start new server instances
            // For now, simulate adding a new server

            const newServerUrl = `ws://localhost:${3001 + this.serverInstances.length}`;
            await this.registerServerInstance(newServerUrl, 'healthy');

            // Record scaling action
            this.recordScalingAction('scale_up', {
                newServerCount: this.serverInstances.length,
                newServerUrl
            });

            logger.info('WebSocket server scaled up', {
                newServerCount: this.serverInstances.length,
                newServerUrl
            });

        } catch (error) {
            logger.error('Scale up error:', { error: error.message });
        }
    }

    // Scale down
    async scaleDown() {
        try {
            // Find server with lowest load to remove
            const healthyServers = this.serverInstances.filter(
                instance => instance.status === 'healthy'
            ).sort((a, b) => a.connections - b.connections);

            if (healthyServers.length === 0) {
                logger.warn('No healthy servers available for scale down');
                return;
            }

            const serverToRemove = healthyServers[0];

            // In a real implementation, this would gracefully shut down the server
            // For now, just remove from our tracking

            this.serverInstances = this.serverInstances.filter(
                instance => instance.serverId !== serverToRemove.serverId
            );

            delete this.loadBalancer.serverWeights[serverToRemove.serverId];

            // Remove from cache
            await advancedCache.delete(`ws_scaling:server:${serverToRemove.serverId}`, 'scaling');

            // Record scaling action
            this.recordScalingAction('scale_down', {
                newServerCount: this.serverInstances.length,
                removedServerId: serverToRemove.serverId
            });

            logger.info('WebSocket server scaled down', {
                newServerCount: this.serverInstances.length,
                removedServerId: serverToRemove.serverId
            });

        } catch (error) {
            logger.error('Scale down error:', { error: error.message });
        }
    }

    // Record scaling action
    recordScalingAction(action, details) {
        const scalingAction = {
            action,
            timestamp: new Date().toISOString(),
            serverCount: this.serverInstances.length,
            ...details
        };

        this.scalingHistory.push(scalingAction);

        // Keep history within reasonable limits
        if (this.scalingHistory.length > 100) {
            this.scalingHistory = this.scalingHistory.slice(-100);
        }

        // Store in cache
        advancedCache.set('ws_scaling:history', this.scalingHistory, 'scaling', 86400);
    }

    // Load balancing - get server for new connection
    getServerForConnection() {
        try {
            const healthyServers = this.serverInstances.filter(
                instance => instance.status === 'healthy'
            );

            if (healthyServers.length === 0) {
                throw new Error('No healthy servers available');
            }

            // Apply load balancing strategy
            switch (this.loadBalancer.strategy) {
                case 'round-robin':
                    return this.roundRobinLoadBalancing(healthyServers);

                case 'weighted':
                    return this.weightedLoadBalancing(healthyServers);

                case 'least-connections':
                    return this.leastConnectionsLoadBalancing(healthyServers);

                default:
                    return this.roundRobinLoadBalancing(healthyServers);
            }

        } catch (error) {
            logger.error('Load balancing error:', { error: error.message });
            throw error;
        }
    }

    // Round-robin load balancing
    roundRobinLoadBalancing(servers) {
        const server = servers[this.loadBalancer.currentIndex];
        this.loadBalancer.currentIndex = (this.loadBalancer.currentIndex + 1) % servers.length;
        return server;
    }

    // Weighted load balancing
    weightedLoadBalancing(servers) {
        // Calculate total weight
        const totalWeight = servers.reduce((sum, server) => {
            return sum + (this.loadBalancer.serverWeights[server.serverId] || 1);
        }, 0);

        // Select server based on weight
        let random = Math.random() * totalWeight;
        for (const server of servers) {
            const weight = this.loadBalancer.serverWeights[server.serverId] || 1;
            if (random < weight) {
                return server;
            }
            random -= weight;
        }

        // Fallback to first server
        return servers[0];
    }

    // Least connections load balancing
    leastConnectionsLoadBalancing(servers) {
        return servers.sort((a, b) => a.connections - b.connections)[0];
    }

    // Set load balancing strategy
    setLoadBalancingStrategy(strategy) {
        const validStrategies = ['round-robin', 'weighted', 'least-connections'];
        if (validStrategies.includes(strategy)) {
            this.loadBalancer.strategy = strategy;
            logger.info('Load balancing strategy updated', { strategy });
        } else {
            logger.warn('Invalid load balancing strategy', { strategy, validStrategies });
        }
    }

    // Set server weight
    setServerWeight(serverId, weight) {
        if (this.loadBalancer.serverWeights[serverId] !== undefined) {
            this.loadBalancer.serverWeights[serverId] = weight;
            logger.info('Server weight updated', { serverId, weight });
        } else {
            logger.warn('Server not found for weight update', { serverId });
        }
    }

    // Get scaling statistics
    getScalingStats() {
        return {
            serverCount: this.serverInstances.length,
            healthyServers: this.serverInstances.filter(i => i.status === 'healthy').length,
            strategy: this.loadBalancer.strategy,
            scalingHistory: [...this.scalingHistory],
            config: this.scalingConfig,
            timestamp: new Date().toISOString()
        };
    }

    // Get load balancing report
    async getLoadBalancingReport() {
        try {
            const stats = this.getScalingStats();

            // Get server distribution
            const serverDistribution = this.serverInstances.reduce((acc, server) => {
                acc[server.status] = (acc[server.status] || 0) + 1;
                return acc;
            }, {});

            // Get connection distribution
            const connectionDistribution = this.serverInstances.map(server => ({
                serverId: server.serverId,
                connections: server.connections,
                status: server.status
            }));

            return {
                stats,
                serverDistribution,
                connectionDistribution,
                loadBalancer: {
                    strategy: this.loadBalancer.strategy,
                    currentIndex: this.loadBalancer.currentIndex,
                    serverWeights: this.loadBalancer.serverWeights
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Load balancing report error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get scaling recommendations
    async getScalingRecommendations() {
        try {
            const stats = this.getScalingStats();
            const recommendations = [];

            // Check if approaching max servers
            if (stats.serverCount >= this.scalingConfig.maxServers * 0.9) {
                recommendations.push({
                    type: 'server_limit',
                    priority: 'high',
                    message: `Approaching maximum server limit (${stats.serverCount}/${this.scalingConfig.maxServers}).`,
                    action: 'Consider increasing maxServers configuration'
                });
            }

            // Check server health distribution
            const healthyPercentage = stats.healthyServers / stats.serverCount;
            if (healthyPercentage < 0.7) {
                recommendations.push({
                    type: 'server_health',
                    priority: 'critical',
                    message: `Low healthy server percentage (${(healthyPercentage * 100).toFixed(1)}%).`,
                    action: 'Investigate unhealthy servers and scaling decisions'
                });
            }

            // Check scaling history
            const recentScales = this.scalingHistory.filter(
                action => Date.now() - new Date(action.timestamp).getTime() < 3600000
            ); // Last hour

            if (recentScales.length > 5) {
                recommendations.push({
                    type: 'scaling_stability',
                    priority: 'medium',
                    message: `Frequent scaling actions detected (${recentScales.length} in last hour).`,
                    action: 'Review scaling thresholds and server performance'
                });
            }

            return recommendations;

        } catch (error) {
            logger.error('Scaling recommendations error:', { error: error.message });
            return [];
        }
    }

    // Get comprehensive scaling report
    async getComprehensiveReport() {
        try {
            const scalingReport = await this.getLoadBalancingReport();
            const recommendations = await this.getScalingRecommendations();

            return {
                scaling: scalingReport,
                recommendations,
                config: this.scalingConfig,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Comprehensive scaling report error:', { error: error.message });
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Handle server failure
    async handleServerFailure(serverId) {
        try {
            // Find the failed server
            const serverIndex = this.serverInstances.findIndex(
                instance => instance.serverId === serverId
            );

            if (serverIndex === -1) {
                logger.warn('Server failure: server not found', { serverId });
                return;
            }

            // Mark server as unhealthy
            this.serverInstances[serverIndex].status = 'unhealthy';
            this.serverInstances[serverIndex].lastHealthCheck = new Date().toISOString();

            // Update cache
            await advancedCache.set(
                `ws_scaling:server:${serverId}`,
                this.serverInstances[serverIndex],
                'scaling',
                3600
            );

            logger.warn('Server marked as unhealthy', { serverId });

            // Check if we need to scale up to replace failed server
            const shouldScaleUp = await this.shouldScaleUp();
            if (shouldScaleUp) {
                await this.scaleUp();
            }

        } catch (error) {
            logger.error('Server failure handling error:', { error: error.message, serverId });
        }
    }

    // Handle server recovery
    async handleServerRecovery(serverId) {
        try {
            // Find the recovered server
            const serverIndex = this.serverInstances.findIndex(
                instance => instance.serverId === serverId
            );

            if (serverIndex === -1) {
                logger.warn('Server recovery: server not found', { serverId });
                return;
            }

            // Mark server as healthy
            this.serverInstances[serverIndex].status = 'healthy';
            this.serverInstances[serverIndex].lastHealthCheck = new Date().toISOString();

            // Update cache
            await advancedCache.set(
                `ws_scaling:server:${serverId}`,
                this.serverInstances[serverIndex],
                'scaling',
                3600
            );

            logger.info('Server marked as healthy', { serverId });

        } catch (error) {
            logger.error('Server recovery handling error:', { error: error.message, serverId });
        }
    }

    // Get server scaling configuration
    getScalingConfig() {
        return this.scalingConfig;
    }

    // Set server scaling configuration
    setScalingConfig(config) {
        this.scalingConfig = { ...this.scalingConfig, ...config };
        logger.info('Scaling configuration updated', { config: this.scalingConfig });
    }

    // Reset scaling history
    resetScalingHistory() {
        this.scalingHistory = [];
        advancedCache.delete('ws_scaling:history', 'scaling');
        logger.info('Scaling history reset');
    }
}

export const webSocketScaling = new WebSocketScaling();
export default webSocketScaling;