import express from 'express';
import http from 'http';
import https from 'https';
import { config } from '../../server/config/env.js';
import { logger } from '../../server/services/loggerService.js';
import { serviceCommunication } from '../service-communication/index.js';
import { redisService } from '../../server/services/redisService.js';

class EnhancedApiGateway {
    constructor() {
        this.app = express();
        this.server = null;
        this.httpsServer = null;
        this.serviceCommunication = serviceCommunication;
        this.routeCache = {};
        this.loadBalancer = {
            auth: { currentIndex: 0, instances: [] },
            media: { currentIndex: 0, instances: [] }
        };

        this.setupMiddleware();
        this.setupRoutes();
        this.setupServiceDiscovery();
    }

    setupMiddleware() {
        // Security headers
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            next();
        });

        // CORS configuration
        this.app.use((req, res, next) => {
            const allowedOrigins = config.ALLOWED_ORIGINS || ['http://localhost:3000', 'http://localhost:5173'];
            const origin = req.headers.origin;

            if (allowedOrigins.includes(origin) || !origin) {
                res.setHeader('Access-Control-Allow-Origin', origin || '*');
            }

            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Allow-Credentials', 'true');

            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }

            next();
        });

        // Request logging
        this.app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                const duration = Date.now() - start;
                logger.info('Request completed', {
                    method: req.method,
                    path: req.path,
                    status: res.statusCode,
                    duration,
                    ip: req.ip
                });
            });
            next();
        });

        // Rate limiting
        this.app.use('/api/', async (req, res, next) => {
            const ip = req.ip;
            const key = `rate_limit:${ip}`;
            const limit = 100; // requests
            const window = 60 * 15; // 15 minutes in seconds

            try {
                const current = await redisService.get(key) || 0;

                if (current >= limit) {
                    return res.status(429).json({
                        error: 'Too many requests',
                        retryAfter: window
                    });
                }

                await redisService.set(key, current + 1, window);
                next();
            } catch (error) {
                logger.error('Rate limiting error:', { error: error.message });
                next(); // Continue if Redis fails
            }
        });

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
    }

    setupRoutes() {
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'ok',
                service: 'api-gateway',
                timestamp: new Date().toISOString(),
                services: this.serviceCommunication.getServiceHealth()
            });
        });

        // Service discovery endpoint
        this.app.get('/api/services', (req, res) => {
            res.json({
                services: Object.keys(this.loadBalancer).reduce((acc, serviceName) => {
                    acc[serviceName] = {
                        instances: this.loadBalancer[serviceName].instances,
                        healthy: this.serviceCommunication.getServiceHealth()[serviceName]?.healthy || false
                    };
                    return acc;
                }, {})
            });
        });

        // Auth service routes
        this.app.use('/api/auth', this.createServiceProxy('auth'));

        // Media service routes
        this.app.use('/api/media', this.createServiceProxy('media'));

        // Legacy routes (for backward compatibility)
        this.setupLegacyRoutes();

        // Error handling
        this.app.use((err, req, res, next) => {
            logger.error('API Gateway error:', {
                error: err.message,
                stack: err.stack,
                path: req.path
            });

            res.status(err.status || 500).json({
                error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message
            });
        });
    }

    createServiceProxy(serviceName) {
        return async (req, res, next) => {
            try {
                const method = req.method.toLowerCase();
                const path = req.path;
                const data = ['get', 'head'].includes(method) ? req.query : req.body;
                const headers = req.headers;

                // Check cache first
                const cacheKey = `gateway:${serviceName}:${path}:${JSON.stringify(data)}`;
                const cachedResponse = await redisService.get(cacheKey);

                if (cachedResponse && !req.headers['x-no-cache']) {
                    logger.info('Serving from cache', { service: serviceName, path });
                    return res.json(cachedResponse);
                }

                // Use load balancer to get service instance
                const serviceUrl = this.getServiceInstance(serviceName);
                const fullUrl = `${serviceUrl}${path}`;

                logger.info(`Proxying request to ${serviceName} service`, {
                    method,
                    url: fullUrl,
                    serviceInstance: serviceUrl
                });

                // Call the service
                const response = await this.serviceCommunication.callService(
                    serviceName,
                    path,
                    method.toUpperCase(),
                    data,
                    headers
                );

                // Cache the response if cacheable
                if (this.isCacheable(req, response)) {
                    await redisService.set(cacheKey, response, 300); // 5 minutes
                }

                res.json(response);

            } catch (error) {
                logger.error(`Service proxy error for ${serviceName}:`, {
                    error: error.message,
                    path: req.path
                });

                // Circuit breaker fallback
                if (error.service === serviceName) {
                    return this.handleServiceFallback(serviceName, req, res);
                }

                next(error);
            }
        };
    }

    getServiceInstance(serviceName) {
        const lb = this.loadBalancer[serviceName];

        if (!lb || lb.instances.length === 0) {
            throw new Error(`No instances available for ${serviceName} service`);
        }

        // Round-robin load balancing
        const instance = lb.instances[lb.currentIndex];
        lb.currentIndex = (lb.currentIndex + 1) % lb.instances.length;

        return instance;
    }

    isCacheable(req, response) {
        // Don't cache POST/PUT/DELETE requests
        if (['post', 'put', 'delete'].includes(req.method.toLowerCase())) {
            return false;
        }

        // Don't cache if explicitly requested not to
        if (req.headers['x-no-cache']) {
            return false;
        }

        // Don't cache error responses
        if (response.error) {
            return false;
        }

        return true;
    }

    handleServiceFallback(serviceName, req, res) {
        logger.warn(`Service ${serviceName} unavailable, using fallback`);

        // Implement service-specific fallbacks
        switch (serviceName) {
            case 'auth':
                return res.status(503).json({
                    error: 'Authentication service unavailable',
                    fallback: 'Please try again later'
                });

            case 'media':
                return res.status(503).json({
                    error: 'Media service unavailable',
                    fallback: 'Media operations temporarily unavailable'
                });

            default:
                return res.status(503).json({
                    error: 'Service unavailable',
                    fallback: 'Please try again later'
                });
        }
    }

    setupLegacyRoutes() {
        // Legacy auth routes (for backward compatibility)
        this.app.post('/api/legacy/auth/login', (req, res) => {
            // This would proxy to the old auth system
            res.json({ message: 'Legacy auth endpoint (mock)' });
        });

        // Legacy media routes
        this.app.post('/api/legacy/media/upload', (req, res) => {
            // This would proxy to the old media system
            res.json({ message: 'Legacy media upload endpoint (mock)' });
        });
    }

    setupServiceDiscovery() {
        // Discover auth service instances
        this.loadBalancer.auth.instances = [
            process.env.AUTH_SERVICE_URL || 'http://localhost:3002'
        ];

        // Discover media service instances
        this.loadBalancer.media.instances = [
            process.env.MEDIA_SERVICE_URL || 'http://localhost:3003'
        ];

        // Start health monitoring
        this.serviceCommunication.startHealthMonitoring();

        // Log initial service discovery
        logger.info('Service discovery completed', {
            services: Object.keys(this.loadBalancer).reduce((acc, name) => {
                acc[name] = this.loadBalancer[name].instances;
                return acc;
            }, {})
        });
    }

    // Start the gateway
    async start(port = 3001) {
        return new Promise((resolve, reject) => {
            this.server = http.createServer(this.app);

            this.server.listen(port, () => {
                logger.info(`Enhanced API Gateway running on port ${port}`);
                resolve();
            });

            this.server.on('error', (error) => {
                logger.error('API Gateway server error:', { error: error.message });
                reject(error);
            });
        });
    }

    // Start HTTPS server
    async startHttps(options, port = 3443) {
        return new Promise((resolve, reject) => {
            this.httpsServer = https.createServer(options, this.app);

            this.httpsServer.listen(port, () => {
                logger.info(`Enhanced API Gateway running on HTTPS port ${port}`);
                resolve();
            });

            this.httpsServer.on('error', (error) => {
                logger.error('API Gateway HTTPS server error:', { error: error.message });
                reject(error);
            });
        });
    }

    // Graceful shutdown
    async shutdown() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    logger.info('API Gateway HTTP server closed');
                });
            }

            if (this.httpsServer) {
                this.httpsServer.close(() => {
                    logger.info('API Gateway HTTPS server closed');
                });
            }

            resolve();
        });
    }
}

export const enhancedApiGateway = new EnhancedApiGateway();
export default enhancedApiGateway;