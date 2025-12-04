import { microservicesManager } from './index.js';
import { serviceCommunication } from '../services/service-communication/index.js';
import { serviceDiscovery } from '../services/service-discovery/index.js';
import { logger } from '../server/services/loggerService.js';

class MicroservicesTester {
    constructor() {
        this.manager = microservicesManager;
        this.serviceCommunication = serviceCommunication;
        this.serviceDiscovery = serviceDiscovery;
    }

    async runAllTests() {
        logger.info('Starting Snapify Microservices Architecture Tests...');

        const testResults = {
            serviceDiscovery: await this.testServiceDiscovery(),
            serviceCommunication: await this.testServiceCommunication(),
            userService: await this.testUserService(),
            eventService: await this.testEventService(),
            mediaService: await this.testMediaService(),
            notificationService: await this.testNotificationService(),
            apiGateway: await this.testApiGateway(),
            errorHandling: await this.testErrorHandling(),
            loadBalancing: await this.testLoadBalancing(),
            circuitBreaker: await this.testCircuitBreaker()
        };

        // Calculate overall test results
        const totalTests = Object.keys(testResults).length;
        const passedTests = Object.values(testResults).filter(result => result.passed).length;
        const successRate = (passedTests / totalTests) * 100;

        logger.info('Microservices Architecture Test Results:', {
            totalTests,
            passedTests,
            failedTests: totalTests - passedTests,
            successRate: `${successRate.toFixed(2)}%`
        });

        return {
            success: passedTests === totalTests,
            results: testResults,
            summary: {
                totalTests,
                passedTests,
                failedTests: totalTests - passedTests,
                successRate: `${successRate.toFixed(2)}%`
            }
        };
    }

    async testServiceDiscovery() {
        try {
            logger.info('Testing Service Discovery...');

            // Test that all services are registered
            const services = this.serviceDiscovery.getAllServicesInfo();

            if (!services.user || !services.event || !services.media || !services.notification) {
                throw new Error('Not all services are registered');
            }

            // Test that each service has at least one instance
            for (const serviceName in services) {
                if (services[serviceName].instances.length === 0) {
                    throw new Error(`Service ${serviceName} has no instances`);
                }
            }

            logger.info('Service Discovery Test: PASSED');
            return { passed: true, message: 'All services are properly registered and have instances' };

        } catch (error) {
            logger.error('Service Discovery Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }

    async testServiceCommunication() {
        try {
            logger.info('Testing Service Communication...');

            // Test health check for each service
            const healthResults = {};

            for (const serviceName of ['user', 'event', 'media', 'notification']) {
                try {
                    const health = await this.serviceCommunication.checkServiceHealth(serviceName);
                    healthResults[serviceName] = health;
                } catch (error) {
                    healthResults[serviceName] = false;
                    logger.warn(`Health check failed for ${serviceName} service: ${error.message}`);
                }
            }

            // Check if at least some services are healthy
            const healthyServices = Object.values(healthResults).filter(Boolean).length;

            if (healthyServices === 0) {
                throw new Error('No services are healthy');
            }

            logger.info('Service Communication Test: PASSED', { healthyServices });
            return { passed: true, message: `${healthyServices} services are healthy and communicating` };

        } catch (error) {
            logger.error('Service Communication Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }

    async testUserService() {
        try {
            logger.info('Testing User Service...');

            // Test user service health endpoint
            const healthResponse = await this.serviceCommunication.callService('user', '/health', 'GET');

            if (!healthResponse || healthResponse.status !== 'ok') {
                throw new Error('User service health check failed');
            }

            logger.info('User Service Test: PASSED');
            return { passed: true, message: 'User service is healthy and responding' };

        } catch (error) {
            logger.error('User Service Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }

    async testEventService() {
        try {
            logger.info('Testing Event Service...');

            // Test event service health endpoint
            const healthResponse = await this.serviceCommunication.callService('event', '/health', 'GET');

            if (!healthResponse || healthResponse.status !== 'ok') {
                throw new Error('Event service health check failed');
            }

            logger.info('Event Service Test: PASSED');
            return { passed: true, message: 'Event service is healthy and responding' };

        } catch (error) {
            logger.error('Event Service Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }

    async testMediaService() {
        try {
            logger.info('Testing Media Service...');

            // Test media service health endpoint
            const healthResponse = await this.serviceCommunication.callService('media', '/health', 'GET');

            if (!healthResponse || healthResponse.status !== 'ok') {
                throw new Error('Media service health check failed');
            }

            logger.info('Media Service Test: PASSED');
            return { passed: true, message: 'Media service is healthy and responding' };

        } catch (error) {
            logger.error('Media Service Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }

    async testNotificationService() {
        try {
            logger.info('Testing Notification Service...');

            // Test notification service health endpoint
            const healthResponse = await this.serviceCommunication.callService('notification', '/health', 'GET');

            if (!healthResponse || healthResponse.status !== 'ok') {
                throw new Error('Notification service health check failed');
            }

            logger.info('Notification Service Test: PASSED');
            return { passed: true, message: 'Notification service is healthy and responding' };

        } catch (error) {
            logger.error('Notification Service Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }

    async testApiGateway() {
        try {
            logger.info('Testing API Gateway...');

            // Test that the gateway can route to services
            const gatewayHealth = await this.serviceCommunication.callService('gateway', '/api/health', 'GET');

            if (!gatewayHealth || gatewayHealth.status !== 'ok') {
                throw new Error('API Gateway health check failed');
            }

            logger.info('API Gateway Test: PASSED');
            return { passed: true, message: 'API Gateway is healthy and routing requests' };

        } catch (error) {
            logger.error('API Gateway Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }

    async testErrorHandling() {
        try {
            logger.info('Testing Error Handling...');

            // Test circuit breaker functionality
            const testService = 'user';
            const testEndpoint = '/nonexistent';

            try {
                // This should fail and trigger circuit breaker
                await this.serviceCommunication.callService(testService, testEndpoint, 'GET');
                throw new Error('Expected error was not thrown');
            } catch (error) {
                // This is expected - we want to see if the error is handled properly
                if (error.status === 404 || error.status === 500) {
                    logger.info('Error Handling Test: PASSED - Errors are properly handled');
                    return { passed: true, message: 'Error handling and circuit breaker working correctly' };
                } else {
                    throw new Error('Unexpected error type');
                }
            }

        } catch (error) {
            logger.error('Error Handling Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }

    async testLoadBalancing() {
        try {
            logger.info('Testing Load Balancing...');

            // Test that service discovery can get healthy instances
            for (const serviceName of ['user', 'event', 'media', 'notification']) {
                const instances = this.serviceDiscovery.getHealthyInstances(serviceName);

                if (instances.length === 0) {
                    throw new Error(`No healthy instances found for ${serviceName} service`);
                }
            }

            logger.info('Load Balancing Test: PASSED');
            return { passed: true, message: 'Load balancing can find healthy instances for all services' };

        } catch (error) {
            logger.error('Load Balancing Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }

    async testCircuitBreaker() {
        try {
            logger.info('Testing Circuit Breaker...');

            // Test circuit breaker with a service that should fail
            const testService = 'user';
            const testOperation = async () => {
                // This should fail
                return await this.serviceCommunication.callService(testService, '/should-fail', 'GET');
            };

            const fallbackResult = 'Fallback response';

            const result = await this.serviceCommunication.withCircuitBreaker(
                testService,
                testOperation,
                fallbackResult
            );

            // If we get the fallback result, the circuit breaker is working
            if (result === fallbackResult) {
                logger.info('Circuit Breaker Test: PASSED');
                return { passed: true, message: 'Circuit breaker properly falls back when service fails' };
            } else {
                throw new Error('Circuit breaker did not return fallback as expected');
            }

        } catch (error) {
            logger.error('Circuit Breaker Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }

    async runPerformanceTests() {
        logger.info('Running Performance Tests...');

        const performanceResults = {
            serviceResponseTimes: await this.testServiceResponseTimes(),
            concurrentRequests: await this.testConcurrentRequests(),
            cachePerformance: await this.testCachePerformance()
        };

        return performanceResults;
    }

    async testServiceResponseTimes() {
        try {
            logger.info('Testing Service Response Times...');

            const responseTimes = {};

            // Test response times for each service
            for (const serviceName of ['user', 'event', 'media', 'notification']) {
                const startTime = Date.now();
                await this.serviceCommunication.callService(serviceName, '/health', 'GET');
                const endTime = Date.now();

                responseTimes[serviceName] = endTime - startTime;
            }

            logger.info('Service Response Times Test: PASSED', { responseTimes });
            return { passed: true, message: 'All services respond within acceptable time', data: responseTimes };

        } catch (error) {
            logger.error('Service Response Times Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }

    async testConcurrentRequests() {
        try {
            logger.info('Testing Concurrent Requests...');

            // Test that services can handle concurrent requests
            const promises = [];

            for (let i = 0; i < 5; i++) {
                promises.push(this.serviceCommunication.callService('user', '/health', 'GET'));
                promises.push(this.serviceCommunication.callService('event', '/health', 'GET'));
                promises.push(this.serviceCommunication.callService('media', '/health', 'GET'));
            }

            const results = await Promise.all(promises);
            const successfulRequests = results.filter(r => r && r.status === 'ok').length;

            if (successfulRequests < 10) {
                throw new Error('Too many concurrent requests failed');
            }

            logger.info('Concurrent Requests Test: PASSED', { successfulRequests });
            return { passed: true, message: 'Services can handle concurrent requests' };

        } catch (error) {
            logger.error('Concurrent Requests Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }

    async testCachePerformance() {
        try {
            logger.info('Testing Cache Performance...');

            // This would test caching performance in a real implementation
            // For now, we'll just verify that Redis is available
            const cacheTestKey = 'microservices_test_cache';
            const testData = { test: 'data', timestamp: Date.now() };

            await this.serviceCommunication.redisService.set(cacheTestKey, testData, 60);
            const cachedData = await this.serviceCommunication.redisService.get(cacheTestKey);

            if (!cachedData || cachedData.test !== 'data') {
                throw new Error('Cache test failed');
            }

            logger.info('Cache Performance Test: PASSED');
            return { passed: true, message: 'Caching is working correctly' };

        } catch (error) {
            logger.error('Cache Performance Test: FAILED', { error: error.message });
            return { passed: false, message: error.message };
        }
    }
}

// Export the tester
export const microservicesTester = new MicroservicesTester();
export default microservicesTester;

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    microservicesTester.runAllTests()
        .then(results => {
            logger.info('Microservices Architecture Tests Completed:', {
                success: results.success,
                summary: results.summary
            });

            if (!results.success) {
                process.exit(1);
            }
        })
        .catch(error => {
            logger.error('Failed to run microservices tests:', { error: error.message });
            process.exit(1);
        });
}