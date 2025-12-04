import { enhancedApiGateway } from '../services/api-gateway/index.js';
import { userService } from '../services/user-service/index.js';
import { eventService } from '../services/event-service/index.js';
import { mediaService } from '../services/media-service/index.js';
import { notificationService } from '../services/notification-service/index.js';
import { serviceDiscovery } from '../services/service-discovery/index.js';
import { serviceCommunication } from '../services/service-communication/index.js';
import { logger } from '../server/services/loggerService.js';
import { config } from '../server/config/env.js';

class MicroservicesManager {
    constructor() {
        this.services = {
            gateway: enhancedApiGateway,
            user: userService,
            event: eventService,
            media: mediaService,
            notification: notificationService
        };

        this.serviceDiscovery = serviceDiscovery;
        this.serviceCommunication = serviceCommunication;
    }

    async startAllServices() {
        try {
            logger.info('Starting Snapify Microservices Architecture...');

            // Start service discovery
            this.serviceDiscovery.start();
            this.serviceCommunication.startHealthMonitoring();

            // Start individual services
            await this.startService('user', 3004);
            await this.startService('event', 3005);
            await this.startService('media', 3003);
            await this.startService('notification', 3006);

            // Start API gateway last
            await this.startService('gateway', 3001);

            logger.info('All microservices started successfully!');

            return {
                success: true,
                message: 'Snapify Microservices Architecture is running',
                services: Object.keys(this.services).map(name => ({
                    name,
                    port: this.getServicePort(name)
                }))
            };

        } catch (error) {
            logger.error('Failed to start microservices:', { error: error.message });
            throw error;
        }
    }

    async startService(serviceName, port) {
        try {
            logger.info(`Starting ${serviceName} service on port ${port}...`);

            if (this.services[serviceName]) {
                await this.services[serviceName].start(port);
                logger.info(`${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} Service started successfully`);
            } else {
                logger.warn(`Service ${serviceName} not found`);
            }

        } catch (error) {
            logger.error(`Failed to start ${serviceName} service:`, { error: error.message });
            throw error;
        }
    }

    getServicePort(serviceName) {
        const ports = {
            gateway: 3001,
            user: 3004,
            event: 3005,
            media: 3003,
            notification: 3006
        };

        return ports[serviceName] || null;
    }

    async stopAllServices() {
        try {
            logger.info('Stopping all microservices...');

            // Stop services in reverse order
            await this.stopService('gateway');
            await this.stopService('notification');
            await this.stopService('media');
            await this.stopService('event');
            await this.stopService('user');

            // Stop service discovery
            this.serviceDiscovery.stop();

            logger.info('All microservices stopped successfully');

        } catch (error) {
            logger.error('Failed to stop microservices:', { error: error.message });
            throw error;
        }
    }

    async stopService(serviceName) {
        try {
            if (this.services[serviceName] && this.services[serviceName].shutdown) {
                await this.services[serviceName].shutdown();
                logger.info(`${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} Service stopped`);
            }

        } catch (error) {
            logger.error(`Failed to stop ${serviceName} service:`, { error: error.message });
            throw error;
        }
    }

    getServiceHealth() {
        return {
            gateway: this.services.gateway ? 'running' : 'stopped',
            user: this.services.user ? 'running' : 'stopped',
            event: this.services.event ? 'running' : 'stopped',
            media: this.services.media ? 'running' : 'stopped',
            notification: this.services.notification ? 'running' : 'stopped',
            discovery: this.serviceDiscovery ? 'running' : 'stopped',
            communication: this.serviceCommunication ? 'running' : 'stopped'
        };
    }

    async getDetailedServiceStatus() {
        return {
            gateway: {
                status: this.services.gateway ? 'running' : 'stopped',
                port: this.getServicePort('gateway')
            },
            user: {
                status: this.services.user ? 'running' : 'stopped',
                port: this.getServicePort('user')
            },
            event: {
                status: this.services.event ? 'running' : 'stopped',
                port: this.getServicePort('event')
            },
            media: {
                status: this.services.media ? 'running' : 'stopped',
                port: this.getServicePort('media')
            },
            notification: {
                status: this.services.notification ? 'running' : 'stopped',
                port: this.getServicePort('notification')
            },
            discovery: {
                status: this.serviceDiscovery ? 'running' : 'stopped'
            },
            communication: {
                status: this.serviceCommunication ? 'running' : 'stopped'
            },
            serviceHealth: this.serviceCommunication.getServiceHealth()
        };
    }
}

// Export the microservices manager
export const microservicesManager = new MicroservicesManager();
export default microservicesManager;

// Start microservices if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    microservicesManager.startAllServices()
        .then(() => {
            logger.info('Microservices started successfully');
        })
        .catch(error => {
            logger.error('Failed to start microservices:', { error: error.message });
            process.exit(1);
        });
}