import { config } from '../../server/config/env.js';
import { logger } from '../../server/services/loggerService.js';
import { serviceCommunication } from '../service-communication/index.js';
import { redisService } from '../../server/services/redisService.js';

class ServiceDiscovery {
    constructor() {
        this.services = {
            user: {
                name: 'user',
                type: 'user-management',
                endpoints: ['/health', '/users', '/users/:id', '/auth/login', '/auth/google', '/auth/validate', '/auth/refresh'],
                instances: [],
                health: { status: 'unknown', lastCheck: null }
            },
            event: {
                name: 'event',
                type: 'event-management',
                endpoints: ['/health', '/events', '/events/:id', '/events/:id/validate-pin'],
                instances: [],
                health: { status: 'unknown', lastCheck: null }
            },
            media: {
                name: 'media',
                type: 'media-processing',
                endpoints: ['/health', '/upload', '/:mediaId', '/event/:eventId', '/bulk-delete', '/:mediaId/like'],
                instances: [],
                health: { status: 'unknown', lastCheck: null }
            },
            notification: {
                name: 'notification',
                type: 'notification',
                endpoints: ['/health', '/notifications', '/notifications/user/:userId', '/notifications/:id/read', '/notifications/email', '/notifications/push'],
                instances: [],
                health: { status: 'unknown', lastCheck: null }
            }
        };

        this.discoveryInterval = null;
        this.healthCheckInterval = null;
        this.serviceCommunication = serviceCommunication;
    }

    // Start service discovery
    start() {
        // Initial discovery
        this.discoverServices();

        // Set up periodic discovery
        this.discoveryInterval = setInterval(() => {
            this.discoverServices();
        }, 60000); // Every minute

        // Set up health monitoring
        this.healthCheckInterval = setInterval(() => {
            this.checkServiceHealth();
        }, 30000); // Every 30 seconds

        logger.info('Service discovery started');
    }

    // Stop service discovery
    stop() {
        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        logger.info('Service discovery stopped');
    }

    // Discover available services
    async discoverServices() {
        try {
            // In a real implementation, this would query a service registry
            // For now, we'll use environment variables and defaults

            // Discover user service
            const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3004';
            this.registerServiceInstance('user', userServiceUrl);

            // Discover event service
            const eventServiceUrl = process.env.EVENT_SERVICE_URL || 'http://localhost:3005';
            this.registerServiceInstance('event', eventServiceUrl);

            // Discover media service
            const mediaServiceUrl = process.env.MEDIA_SERVICE_URL || 'http://localhost:3003';
            this.registerServiceInstance('media', mediaServiceUrl);

            // Discover notification service
            const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006';
            this.registerServiceInstance('notification', notificationServiceUrl);

            // Log discovery results
            logger.info('Service discovery completed', {
                services: Object.keys(this.services).reduce((acc, name) => {
                    acc[name] = {
                        instances: this.services[name].instances.length,
                        type: this.services[name].type
                    };
                    return acc;
                }, {})
            });

        } catch (error) {
            logger.error('Service discovery error:', { error: error.message });
        }
    }

    // Register a service instance
    registerServiceInstance(serviceName, instanceUrl) {
        if (!this.services[serviceName]) {
            logger.warn(`Unknown service: ${serviceName}`);
            return;
        }

        // Check if instance already exists
        const exists = this.services[serviceName].instances.some(
            instance => instance.url === instanceUrl
        );

        if (!exists) {
            this.services[serviceName].instances.push({
                url: instanceUrl,
                registeredAt: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            });

            logger.info(`Registered new instance for ${serviceName} service`, { url: instanceUrl });
        }
    }

    // Check service health
    async checkServiceHealth() {
        for (const serviceName in this.services) {
            try {
                const service = this.services[serviceName];

                // Check each instance
                for (const instance of service.instances) {
                    try {
                        const startTime = Date.now();
                        const response = await this.serviceCommunication.callService(
                            serviceName,
                            '/health',
                            'GET'
                        );
                        const responseTime = Date.now() - startTime;

                        // Update instance health
                        instance.health = {
                            status: 'healthy',
                            responseTime,
                            lastCheck: new Date().toISOString(),
                            lastResponse: response
                        };

                        // Update service health
                        service.health = {
                            status: 'healthy',
                            lastCheck: new Date().toISOString(),
                            healthyInstances: service.instances.filter(i => i.health?.status === 'healthy').length,
                            totalInstances: service.instances.length
                        };

                        // Cache health status
                        await redisService.set(
                            `service_health:${serviceName}`,
                            service.health,
                            60
                        );

                    } catch (error) {
                        instance.health = {
                            status: 'unhealthy',
                            error: error.message,
                            lastCheck: new Date().toISOString()
                        };

                        service.health = {
                            status: 'degraded',
                            lastCheck: new Date().toISOString(),
                            error: error.message
                        };

                        logger.error(`Health check failed for ${serviceName} instance`, {
                            url: instance.url,
                            error: error.message
                        });
                    }
                }

            } catch (error) {
                logger.error(`Service health check error for ${serviceName}:`, { error: error.message });
            }
        }
    }

    // Get service information
    getServiceInfo(serviceName) {
        if (!this.services[serviceName]) {
            return null;
        }

        return {
            name: this.services[serviceName].name,
            type: this.services[serviceName].type,
            endpoints: this.services[serviceName].endpoints,
            instances: this.services[serviceName].instances.map(instance => ({
                url: instance.url,
                health: instance.health,
                registeredAt: instance.registeredAt,
                lastSeen: instance.lastSeen
            })),
            health: this.services[serviceName].health
        };
    }

    // Get all services information
    getAllServicesInfo() {
        return Object.keys(this.services).reduce((acc, serviceName) => {
            acc[serviceName] = this.getServiceInfo(serviceName);
            return acc;
        }, {});
    }

    // Get healthy instances for a service
    getHealthyInstances(serviceName) {
        if (!this.services[serviceName]) {
            return [];
        }

        return this.services[serviceName].instances.filter(
            instance => instance.health?.status === 'healthy'
        );
    }

    // Service registration endpoint (for services to register themselves)
    async handleServiceRegistration(req, res) {
        try {
            const { serviceName, instanceUrl, serviceType } = req.body;

            if (!serviceName || !instanceUrl) {
                return res.status(400).json({ error: 'serviceName and instanceUrl are required' });
            }

            // Validate service name
            if (!this.services[serviceName]) {
                // Register new service type
                this.services[serviceName] = {
                    name: serviceName,
                    type: serviceType || 'unknown',
                    endpoints: [],
                    instances: [],
                    health: { status: 'unknown', lastCheck: null }
                };
            }

            // Register the instance
            this.registerServiceInstance(serviceName, instanceUrl);

            // Check health immediately
            await this.checkServiceHealth();

            res.json({
                success: true,
                message: 'Service instance registered successfully'
            });

        } catch (error) {
            logger.error('Service registration error:', { error: error.message });
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Service deregistration endpoint
    async handleServiceDeregistration(req, res) {
        try {
            const { serviceName, instanceUrl } = req.body;

            if (!serviceName || !instanceUrl) {
                return res.status(400).json({ error: 'serviceName and instanceUrl are required' });
            }

            if (!this.services[serviceName]) {
                return res.status(404).json({ error: 'Service not found' });
            }

            // Remove the instance
            const initialCount = this.services[serviceName].instances.length;
            this.services[serviceName].instances = this.services[serviceName].instances.filter(
                instance => instance.url !== instanceUrl
            );

            if (this.services[serviceName].instances.length === initialCount) {
                return res.status(404).json({ error: 'Instance not found' });
            }

            logger.info(`Deregistered instance for ${serviceName} service`, { url: instanceUrl });

            res.json({
                success: true,
                message: 'Service instance deregistered successfully'
            });

        } catch (error) {
            logger.error('Service deregistration error:', { error: error.message });
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Get service health endpoint
    async handleGetServiceHealth(req, res) {
        try {
            const { serviceName } = req.params;

            if (serviceName) {
                // Get specific service health
                const service = this.services[serviceName];
                if (!service) {
                    return res.status(404).json({ error: 'Service not found' });
                }

                return res.json({
                    service: serviceName,
                    health: service.health,
                    instances: service.instances.map(instance => ({
                        url: instance.url,
                        health: instance.health
                    }))
                });
            }

            // Get all services health
            const healthInfo = Object.keys(this.services).reduce((acc, name) => {
                acc[name] = this.services[name].health;
                return acc;
            }, {});

            res.json(healthInfo);

        } catch (error) {
            logger.error('Get service health error:', { error: error.message });
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Load balancing - get next instance for a service
    getNextInstance(serviceName) {
        if (!this.services[serviceName]) {
            throw new Error(`Service ${serviceName} not found`);
        }

        const healthyInstances = this.getHealthyInstances(serviceName);
        if (healthyInstances.length === 0) {
            throw new Error(`No healthy instances available for ${serviceName} service`);
        }

        // Simple round-robin for now
        // In production, this would consider response times, load, etc.
        const instance = healthyInstances[0];
        return instance.url;
    }

    // Circuit breaker pattern
    async withCircuitBreaker(serviceName, operation, fallback = null) {
        const service = this.services[serviceName];

        // Check if service has healthy instances
        const healthyInstances = this.getHealthyInstances(serviceName);
        if (healthyInstances.length === 0) {
            logger.warn(`Circuit breaker: No healthy instances for ${serviceName}, using fallback`);
            return fallback;
        }

        try {
            return await operation();
        } catch (error) {
            logger.error(`Circuit breaker: ${serviceName} operation failed`, { error: error.message });
            return fallback;
        }
    }

    // Start monitoring with Redis pub/sub
    async startRedisMonitoring() {
        try {
            if (!redisService.isConnected) {
                logger.warn('Redis not connected, skipping Redis monitoring');
                return;
            }

            // Subscribe to service events
            const subscriber = redisService.client.duplicate();

            await subscriber.connect();

            subscriber.on('message', (channel, message) => {
                if (channel === 'service_events') {
                    try {
                        const event = JSON.parse(message);
                        this.handleServiceEvent(event);
                    } catch (error) {
                        logger.error('Failed to parse service event:', { error: error.message });
                    }
                }
            });

            await subscriber.subscribe('service_events');

            logger.info('Redis service monitoring started');

        } catch (error) {
            logger.error('Failed to start Redis monitoring:', { error: error.message });
        }
    }

    // Handle service events from Redis
    handleServiceEvent(event) {
        logger.info('Received service event', { event });

        switch (event.type) {
            case 'service_registered':
                this.registerServiceInstance(event.serviceName, event.instanceUrl);
                break;

            case 'service_deregistered':
                // Remove instance
                if (this.services[event.serviceName]) {
                    this.services[event.serviceName].instances = this.services[event.serviceName].instances.filter(
                        instance => instance.url !== event.instanceUrl
                    );
                }
                break;

            case 'health_status':
                // Update health status
                if (this.services[event.serviceName]) {
                    const instance = this.services[event.serviceName].instances.find(
                        i => i.url === event.instanceUrl
                    );

                    if (instance) {
                        instance.health = event.health;
                    }
                }
                break;
        }
    }
}

export const serviceDiscovery = new ServiceDiscovery();
export default serviceDiscovery;