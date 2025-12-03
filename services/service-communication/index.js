import axios from 'axios';
import { io } from 'socket.io-client';
import { config } from '../../server/config/env.js';
import { logger } from '../../server/services/loggerService.js';

class ServiceCommunication {
    constructor() {
        this.services = {
            auth: {
                url: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
                socket: null
            },
            media: {
                url: process.env.MEDIA_SERVICE_URL || 'http://localhost:3003',
                socket: null
            }
        };

        this.serviceHealth = {};
        this.retryAttempts = {};
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    // REST communication methods
    async callService(serviceName, endpoint, method = 'GET', data = null, headers = {}) {
        if (!this.services[serviceName]) {
            throw new Error(`Service ${serviceName} not configured`);
        }

        const service = this.services[serviceName];
        const url = `${service.url}${endpoint}`;

        try {
            const response = await axios({
                method,
                url,
                data,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                timeout: 10000
            });

            return response.data;

        } catch (error) {
            logger.error(`Service call failed: ${serviceName} ${endpoint}`, {
                error: error.message,
                service: serviceName,
                endpoint,
                method
            });

            // Implement retry logic
            if (this.shouldRetry(serviceName, error)) {
                return this.retryCall(serviceName, endpoint, method, data, headers);
            }

            throw this.handleServiceError(error, serviceName);
        }
    }

    shouldRetry(serviceName, error) {
        // Don't retry if it's a client error (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
            return false;
        }

        // Don't retry if we've exceeded max attempts
        this.retryAttempts[serviceName] = (this.retryAttempts[serviceName] || 0) + 1;
        return this.retryAttempts[serviceName] <= this.maxRetries;
    }

    async retryCall(serviceName, endpoint, method, data, headers) {
        const delay = this.retryDelay * (this.retryAttempts[serviceName] || 1);
        logger.info(`Retrying service call: ${serviceName} ${endpoint} (attempt ${this.retryAttempts[serviceName]})`);

        await new Promise(resolve => setTimeout(resolve, delay));

        return this.callService(serviceName, endpoint, method, data, headers);
    }

    handleServiceError(error, serviceName) {
        let message = 'Service communication error';
        let status = 500;

        if (error.response) {
            message = error.response.data?.error || error.response.statusText;
            status = error.response.status;
        } else if (error.request) {
            message = 'No response from service';
            status = 503;
        } else {
            message = error.message;
        }

        // Mark service as unhealthy
        this.serviceHealth[serviceName] = {
            healthy: false,
            lastError: message,
            lastChecked: new Date().toISOString()
        };

        const serviceError = new Error(message);
        serviceError.status = status;
        serviceError.service = serviceName;

        return serviceError;
    }

    // WebSocket communication methods
    connectToServiceSocket(serviceName) {
        if (!this.services[serviceName]) {
            throw new Error(`Service ${serviceName} not configured`);
        }

        if (this.services[serviceName].socket) {
            return this.services[serviceName].socket;
        }

        const service = this.services[serviceName];
        const socketUrl = `${service.url.replace('http', 'ws')}`;

        try {
            const socket = io(socketUrl, {
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 5000,
                transports: ['websocket']
            });

            socket.on('connect', () => {
                logger.info(`Connected to ${serviceName} service via WebSocket`);
                this.serviceHealth[serviceName] = {
                    healthy: true,
                    lastChecked: new Date().toISOString()
                };
            });

            socket.on('disconnect', (reason) => {
                logger.warn(`Disconnected from ${serviceName} service: ${reason}`);
                this.serviceHealth[serviceName] = {
                    healthy: false,
                    lastError: `Disconnected: ${reason}`,
                    lastChecked: new Date().toISOString()
                };
            });

            socket.on('error', (error) => {
                logger.error(`WebSocket error with ${serviceName} service:`, { error: error.message });
                this.serviceHealth[serviceName] = {
                    healthy: false,
                    lastError: error.message,
                    lastChecked: new Date().toISOString()
                };
            });

            this.services[serviceName].socket = socket;
            return socket;

        } catch (error) {
            logger.error(`Failed to connect to ${serviceName} service via WebSocket:`, { error: error.message });
            throw error;
        }
    }

    emitToService(serviceName, event, data) {
        if (!this.services[serviceName]?.socket) {
            throw new Error(`Not connected to ${serviceName} service`);
        }

        return new Promise((resolve, reject) => {
            const socket = this.services[serviceName].socket;

            // Add acknowledgment callback
            socket.emit(event, data, (response) => {
                if (response?.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });

            // Set timeout
            setTimeout(() => {
                reject(new Error(`Timeout waiting for response from ${serviceName} service`));
            }, 5000);
        });
    }

    // Health monitoring
    async checkServiceHealth(serviceName) {
        try {
            const response = await this.callService(serviceName, '/health', 'GET');
            this.serviceHealth[serviceName] = {
                healthy: true,
                responseTime: Date.now() - response.timestamp,
                lastChecked: new Date().toISOString()
            };
            return true;
        } catch (error) {
            this.serviceHealth[serviceName] = {
                healthy: false,
                lastError: error.message,
                lastChecked: new Date().toISOString()
            };
            return false;
        }
    }

    getServiceHealth() {
        return this.serviceHealth;
    }

    // Circuit breaker pattern
    async withCircuitBreaker(serviceName, operation, fallback = null) {
        const service = this.services[serviceName];

        // Check if service is healthy
        if (this.serviceHealth[serviceName]?.healthy === false) {
            logger.warn(`Circuit breaker: ${serviceName} service is unhealthy, using fallback`);
            return fallback;
        }

        try {
            const result = await operation();
            return result;
        } catch (error) {
            logger.error(`Circuit breaker: ${serviceName} operation failed`, { error: error.message });
            return fallback;
        }
    }

    // Start health monitoring
    startHealthMonitoring(interval = 30000) {
        setInterval(async () => {
            for (const serviceName in this.services) {
                await this.checkServiceHealth(serviceName);
            }
        }, interval);
    }
}

export const serviceCommunication = new ServiceCommunication();
export default serviceCommunication;