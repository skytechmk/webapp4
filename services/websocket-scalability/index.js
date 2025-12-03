import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { config } from '../../server/config/env.js';
import { logger } from '../../server/services/loggerService.js';
import { serviceDiscovery } from '../service-discovery/index.js';
import { advancedCache } from '../advanced-cache/index.js';

class WebSocketScalability {
    constructor() {
        this.io = null;
        this.redisClient = null;
        this.pubClient = null;
        this.subClient = null;
        this.connectionStats = {
            totalConnections: 0,
            activeConnections: 0,
            maxConcurrent: 0,
            messagesSent: 0,
            messagesReceived: 0,
            bytesSent: 0,
            bytesReceived: 0
        };
        this.serverInstances = [];
        this.currentServerId = `server-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    }

    // Initialize scalable WebSocket server
    async init(server) {
        try {
            // Initialize Redis clients for adapter
            await this.initRedisClients();

            // Create Socket.IO server with Redis adapter
            this.io = new Server(server, {
                cors: {
                    origin: config.ALLOWED_ORIGINS,
                    credentials: true
                },
                connectionStateRecovery: {
                    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
                    skipMiddlewares: true
                },
                transports: ['websocket', 'polling'],
                maxHttpBufferSize: 1e8, // 100MB
                pingTimeout: 30000, // 30 seconds
                pingInterval: 25000, // 25 seconds
                connectTimeout: 45000, // 45 seconds
                adapter: createAdapter(this.pubClient, this.subClient)
            });

            // Set up connection handling
            this.setupConnectionHandling();

            // Register this server instance
            await this.registerServerInstance();

            logger.info('Scalable WebSocket server initialized', {
                serverId: this.currentServerId,
                redisConnected: !!this.redisClient
            });

            return this.io;

        } catch (error) {
            logger.error('WebSocket scalability initialization error:', { error: error.message });
            throw error;
        }
    }

    // Initialize Redis clients
    async initRedisClients() {
        try {
            // Create Redis clients
            this.pubClient = createClient({
                host: config.REDIS.HOST,
                port: config.REDIS.PORT,
                password: config.REDIS.PASSWORD
            });

            this.subClient = this.pubClient.duplicate();

            // Connect clients
            await Promise.all([
                this.pubClient.connect(),
                this.subClient.connect()
            ]);

            logger.info('✅ Redis clients connected for WebSocket adapter');

            // Set up error handling
            this.pubClient.on('error', (err) => {
                logger.error('Redis Pub Client Error:', { error: err.message });
            });

            this.subClient.on('error', (err) => {
                logger.error('Redis Sub Client Error:', { error: err.message });
            });

        } catch (error) {
            logger.error('Redis client initialization error:', { error: error.message });
            throw error;
        }
    }

    // Set up connection handling
    setupConnectionHandling() {
        this.io.on('connection', (socket) => {
            this.handleNewConnection(socket);
        });

        // Set up periodic stats logging
        this.setupPeriodicStats();
    }

    // Handle new connection
    handleNewConnection(socket) {
        const clientIP = socket.handshake.address;
        const connectionTime = Date.now();
        const connectionId = `${this.currentServerId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

        // Track connection stats
        this.connectionStats.totalConnections++;
        this.connectionStats.activeConnections++;
        this.connectionStats.maxConcurrent = Math.max(
            this.connectionStats.maxConcurrent,
            this.connectionStats.activeConnections
        );

        logger.info(`🔌 New WebSocket connection`, {
            connectionId,
            clientIP,
            totalConnections: this.connectionStats.totalConnections,
            activeConnections: this.connectionStats.activeConnections
        });

        // Set up socket event handlers
        this.setupSocketHandlers(socket, connectionId, clientIP);

        // Set up connection monitoring
        this.setupConnectionMonitoring(socket, connectionId, clientIP);
    }

    // Set up socket event handlers
    setupSocketHandlers(socket, connectionId, clientIP) {
        // Authentication
        socket.on('authenticate', (token) => {
            this.handleAuthentication(socket, token, connectionId);
        });

        // Event joining
        socket.on('join_event', (eventId, callback) => {
            this.handleEventJoining(socket, eventId, callback, connectionId);
        });

        // Message handling
        socket.on('message', (data) => {
            this.handleMessage(socket, data, connectionId);
        });

        // Disconnection
        socket.on('disconnect', (reason) => {
            this.handleDisconnection(socket, reason, connectionId, clientIP);
        });

        // Error handling
        socket.on('error', (error) => {
            this.handleSocketError(socket, error, connectionId);
        });
    }

    // Handle authentication
    async handleAuthentication(socket, token, connectionId) {
        try {
            // Validate token (mock implementation)
            const isValid = await this.validateToken(token);

            if (isValid) {
                socket.data.authenticated = true;
                socket.data.user = this.decodeToken(token);
                logger.info('Socket authenticated', { connectionId, userId: socket.data.user?.userId });
            } else {
                logger.warn('Socket authentication failed', { connectionId });
                socket.emit('auth_error', { error: 'Authentication failed' });
            }

        } catch (error) {
            logger.error('Socket authentication error:', { error: error.message, connectionId });
            socket.emit('auth_error', { error: 'Authentication error' });
        }
    }

    // Validate token (mock)
    async validateToken(token) {
        // In a real implementation, this would validate JWT
        return true;
    }

    // Decode token (mock)
    decodeToken(token) {
        // In a real implementation, this would decode JWT
        return { userId: 'user-123', role: 'user' };
    }

    // Handle event joining
    handleEventJoining(socket, eventId, callback, connectionId) {
        try {
            if (!eventId || typeof eventId !== 'string') {
                callback?.({ success: false, error: 'Invalid event ID' });
                return;
            }

            socket.join(eventId);
            logger.info('Socket joined event', { connectionId, eventId });

            callback?.({ success: true, eventId });

        } catch (error) {
            logger.error('Event joining error:', { error: error.message, connectionId, eventId });
            callback?.({ success: false, error: 'Failed to join event' });
        }
    }

    // Handle message
    handleMessage(socket, data, connectionId) {
        try {
            // Update stats
            this.connectionStats.messagesReceived++;
            this.connectionStats.bytesReceived += JSON.stringify(data).length;

            logger.debug('Message received', {
                connectionId,
                messageSize: JSON.stringify(data).length,
                from: socket.data.user?.userId || 'anonymous'
            });

            // Broadcast to room if applicable
            if (data.room) {
                this.io.to(data.room).emit('message', {
                    ...data,
                    from: socket.data.user?.userId || 'anonymous',
                    timestamp: new Date().toISOString()
                });

                // Update sent stats
                this.connectionStats.messagesSent++;
                this.connectionStats.bytesSent += JSON.stringify(data).length;
            }

        } catch (error) {
            logger.error('Message handling error:', { error: error.message, connectionId });
        }
    }

    // Handle disconnection
    handleDisconnection(socket, reason, connectionId, clientIP) {
        logger.info(`🔌 Connection disconnected`, {
            connectionId,
            reason,
            duration: socket.data.connectionDuration || 0
        });

        // Update stats
        this.connectionStats.activeConnections = Math.max(0, this.connectionStats.activeConnections - 1);

        // Clean up
        this.cleanupConnection(connectionId, clientIP);
    }

    // Handle socket error
    handleSocketError(socket, error, connectionId) {
        logger.error('Socket error', {
            connectionId,
            error: error.message,
            stack: error.stack
        });

        // Disconnect problematic socket
        socket.disconnect(true);
    }

    // Set up connection monitoring
    setupConnectionMonitoring(socket, connectionId, clientIP) {
        // Track connection duration
        socket.data.connectionStart = Date.now();

        // Set up heartbeat
        const heartbeatInterval = setInterval(() => {
            if (socket.connected) {
                socket.emit('heartbeat', {
                    serverTime: Date.now(),
                    serverId: this.currentServerId,
                    connectionId
                });
            }
        }, 30000); // Every 30 seconds

        // Clean up on disconnect
        socket.on('disconnect', () => {
            clearInterval(heartbeatInterval);

            // Calculate connection duration
            if (socket.data.connectionStart) {
                socket.data.connectionDuration = Date.now() - socket.data.connectionStart;
            }
        });
    }

    // Set up periodic stats logging
    setupPeriodicStats() {
        setInterval(() => {
            this.logConnectionStats();
        }, 60000); // Every minute
    }

    // Log connection stats
    logConnectionStats() {
        logger.info('WebSocket connection stats', {
            activeConnections: this.connectionStats.activeConnections,
            totalConnections: this.connectionStats.totalConnections,
            maxConcurrent: this.connectionStats.maxConcurrent,
            messagesSent: this.connectionStats.messagesSent,
            messagesReceived: this.connectionStats.messagesReceived,
            bytesSent: this.connectionStats.bytesSent,
            bytesReceived: this.connectionStats.bytesReceived
        });
    }

    // Register server instance
    async registerServerInstance() {
        try {
            // Register with service discovery
            await serviceDiscovery.registerServiceInstance('websocket', `ws://localhost:3001`);

            // Store server info in cache
            await advancedCache.set(`websocket_server:${this.currentServerId}`, {
                serverId: this.currentServerId,
                registeredAt: new Date().toISOString(),
                connections: 0,
                status: 'active'
            }, 3600);

            logger.info('WebSocket server instance registered', { serverId: this.currentServerId });

        } catch (error) {
            logger.error('Server instance registration error:', { error: error.message });
        }
    }

    // Clean up connection
    cleanupConnection(connectionId, clientIP) {
        // Update server stats in cache
        advancedCache.get(`websocket_server:${this.currentServerId}`).then(serverInfo => {
            if (serverInfo) {
                serverInfo.connections = Math.max(0, (serverInfo.connections || 0) - 1);
                advancedCache.set(`websocket_server:${this.currentServerId}`, serverInfo, 3600);
            }
        });
    }

    // Message batching for efficiency
    setupMessageBatching() {
        // This would implement message batching
        // For now, just log the setup
        logger.info('Message batching setup (mock implementation)');
    }

    // Connection throttling
    setupConnectionThrottling() {
        // This would implement connection throttling
        // For now, just log the setup
        logger.info('Connection throttling setup (mock implementation)');
    }

    // Horizontal scaling support
    async setupHorizontalScaling() {
        try {
            // Get other server instances
            const serverKeys = await advancedCache.getKeysByPattern('websocket_server:*');
            const otherServers = [];

            for (const key of serverKeys) {
                if (key !== `websocket_server:${this.currentServerId}`) {
                    const serverInfo = await advancedCache.get(key);
                    if (serverInfo) {
                        otherServers.push(serverInfo);
                    }
                }
            }

            this.serverInstances = otherServers;
            logger.info('Horizontal scaling configured', {
                serverId: this.currentServerId,
                otherServers: otherServers.length
            });

        } catch (error) {
            logger.error('Horizontal scaling setup error:', { error: error.message });
        }
    }

    // Get connection statistics
    getConnectionStats() {
        return {
            ...this.connectionStats,
            serverId: this.currentServerId,
            serverInstances: this.serverInstances.length,
            timestamp: new Date().toISOString()
        };
    }

    // Get WebSocket server health
    async getServerHealth() {
        try {
            const stats = this.getConnectionStats();

            return {
                status: 'healthy',
                stats,
                redisConnected: this.pubClient?.isReady && this.subClient?.isReady,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Server health check error:', { error: error.message });
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Graceful shutdown
    async shutdown() {
        try {
            logger.info('Shutting down WebSocket server...');

            // Notify clients
            if (this.io) {
                this.io.emit('server_shutdown', {
                    message: 'Server is shutting down for maintenance',
                    timestamp: Date.now()
                });

                // Close all connections
                await new Promise(resolve => {
                    this.io.close(() => {
                        logger.info('WebSocket server closed');
                        resolve();
                    });
                });
            }

            // Disconnect Redis clients
            if (this.pubClient) {
                await this.pubClient.quit();
            }

            if (this.subClient) {
                await this.subClient.quit();
            }

            logger.info('WebSocket scalability shutdown complete');

        } catch (error) {
            logger.error('WebSocket shutdown error:', { error: error.message });
        }
    }

    // Broadcast to all servers (for horizontal scaling)
    async broadcastToAllServers(event, data) {
        try {
            // Get all server instances
            const serverKeys = await advancedCache.getKeysByPattern('websocket_server:*');
            const results = [];

            for (const key of serverKeys) {
                const serverInfo = await advancedCache.get(key);
                if (serverInfo && serverInfo.serverId !== this.currentServerId) {
                    // In a real implementation, this would send to other servers
                    results.push({
                        serverId: serverInfo.serverId,
                        status: 'sent'
                    });
                }
            }

            // Also send locally
            if (this.io) {
                this.io.emit(event, data);
                results.push({
                    serverId: this.currentServerId,
                    status: 'local'
                });
            }

            return results;

        } catch (error) {
            logger.error('Broadcast to all servers error:', { error: error.message });
            return [];
        }
    }

    // Get server instance info
    async getServerInstanceInfo() {
        return {
            serverId: this.currentServerId,
            connections: this.connectionStats.activeConnections,
            totalConnections: this.connectionStats.totalConnections,
            status: 'active',
            registeredAt: new Date().toISOString()
        };
    }
}

export const webSocketScalability = new WebSocketScalability();
export default webSocketScalability;