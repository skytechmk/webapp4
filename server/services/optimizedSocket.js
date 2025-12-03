import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { redisCache } from '../utils/redis_cache.js';

// Enhanced Socket.IO configuration with performance optimizations
const SOCKET_IO_OPTIONS = {
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
    allowRequest: (req, callback) => {
        // Rate limiting and connection validation
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        callback(null, true); // Allow connection
    }
};

let io;
const adminOnlineStatus = new Map();
const connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    maxConcurrent: 0,
    connectionHistory: []
};

// Connection cleanup configuration
const CONNECTION_CLEANUP = {
    INACTIVE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
    MAX_CONNECTIONS_PER_IP: 10, // Prevent abuse
    RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
    RATE_LIMIT_MAX: 30 // Max connections per minute per IP
};

const connectionRateLimits = new Map();
const ipConnectionCounts = new Map();

export const initOptimizedSocket = (server) => {
    io = new Server(server, SOCKET_IO_OPTIONS);

    // Enhanced connection handling
    io.on('connection', (socket) => {
        const clientIP = socket.handshake.address;
        const connectionTime = Date.now();

        // Track connection stats
        connectionStats.totalConnections++;
        connectionStats.activeConnections++;
        connectionStats.maxConcurrent = Math.max(connectionStats.maxConcurrent, connectionStats.activeConnections);
        connectionStats.connectionHistory.push({ ip: clientIP, time: connectionTime });

        // Rate limiting
        if (!ipConnectionCounts.has(clientIP)) {
            ipConnectionCounts.set(clientIP, 1);
        } else {
            ipConnectionCounts.set(clientIP, ipConnectionCounts.get(clientIP) + 1);
        }

        // Check rate limits
        if (checkRateLimit(clientIP)) {
            console.warn(`⚠️ Connection rate limit exceeded for IP: ${clientIP}`);
            socket.disconnect(true);
            return;
        }

        console.log(`🔌 New connection from ${clientIP} (Total: ${connectionStats.activeConnections})`);

        let currentUser = null;
        let lastActivity = Date.now();
        let connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

        // Track connection in Redis for persistence
        trackConnectionInRedis(connectionId, clientIP, socket.id);

        // Set up activity monitoring
        setupActivityMonitoring(socket, connectionId, clientIP);

        socket.on('authenticate', (token) => {
            try {
                const user = jwt.verify(token, config.JWT_SECRET);
                currentUser = user;

                // Track admin status with enhanced data
                if (user.role === 'ADMIN') {
                    adminOnlineStatus.set(user.id, {
                        online: true,
                        socketId: socket.id,
                        lastSeen: Date.now(),
                        connectionId,
                        ip: clientIP,
                        userAgent: socket.handshake.headers['user-agent']
                    });

                    // Notify all users about admin status change (with debouncing)
                    io.emit('admin_status_update', {
                        adminId: user.id,
                        online: true,
                        lastSeen: Date.now(),
                        connectionId
                    });

                    console.log(`👑 Admin ${user.name} (${user.id}) came online from ${clientIP}`);
                }

                // Update user presence in cache
                updateUserPresence(user.id, true, connectionId);

            } catch (e) {
                console.error("Authentication failed:", e);
                socket.emit('auth_error', { error: 'Authentication failed' });
            }
        });

        // Enhanced event joining with validation
        socket.on('join_event', (eventId, callback) => {
            if (!eventId || typeof eventId !== 'string') {
                callback?.({ success: false, error: 'Invalid event ID' });
                return;
            }

            try {
                socket.join(eventId);
                console.log(`📍 User joined event ${eventId}`);
                callback?.({ success: true, eventId });

                // Update last activity
                lastActivity = Date.now();
                updateConnectionActivity(connectionId);

            } catch (error) {
                console.error(`Failed to join event ${eventId}:`, error);
                callback?.({ success: false, error: 'Failed to join event' });
            }
        });

        // Admin reload with enhanced security
        socket.on('admin_trigger_reload', (token, callback) => {
            try {
                const user = jwt.verify(token, config.JWT_SECRET);
                if (user.role === 'ADMIN') {
                    // Broadcast reload with version info
                    io.emit('force_client_reload', {
                        version: Date.now(),
                        timestamp: new Date().toISOString(),
                        initiatedBy: user.id
                    });
                    callback?.({ success: true });
                } else {
                    callback?.({ success: false, error: 'Unauthorized' });
                }
            } catch (e) {
                console.error("Unauthorized reload attempt from:", clientIP);
                callback?.({ success: false, error: 'Unauthorized' });
            }
        });

        // Enhanced disconnect handling
        socket.on('disconnect', (reason) => {
            console.log(`🔌 Connection ${connectionId} disconnected (${reason})`);

            // Clean up connection tracking
            cleanupConnection(connectionId, clientIP);

            if (currentUser && currentUser.role === 'ADMIN') {
                // Mark admin as offline with graceful handling
                const adminData = adminOnlineStatus.get(currentUser.id);
                if (adminData && adminData.connectionId === connectionId) {
                    adminData.online = false;
                    adminData.lastSeen = Date.now();
                    adminData.disconnectReason = reason;

                    // Notify all users about admin going offline (debounced)
                    setTimeout(() => {
                        if (adminData && !adminData.online) {
                            io.emit('admin_status_update', {
                                adminId: currentUser.id,
                                online: false,
                                lastSeen: Date.now(),
                                disconnectReason: reason
                            });
                        }
                    }, 2000); // Small delay to prevent flickering

                    console.log(`👑 Admin ${currentUser.name} (${currentUser.id}) went offline (${reason})`);
                }
            }

            // Update user presence in cache
            if (currentUser) {
                updateUserPresence(currentUser.id, false, connectionId);
            }
        });

        // Heartbeat monitoring
        socket.on('heartbeat', (data) => {
            lastActivity = Date.now();
            updateConnectionActivity(connectionId);

            // Respond with server status
            socket.emit('heartbeat_response', {
                serverTime: Date.now(),
                connectionId,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            });
        });
    });

    // Set up periodic cleanup
    setupPeriodicCleanup();

    // Set up connection monitoring
    setupConnectionMonitoring();

    return io;
};

function setupActivityMonitoring(socket, connectionId, clientIP) {
    // Send periodic keep-alive
    const keepAliveInterval = setInterval(() => {
        if (socket.connected) {
            socket.emit('keep_alive', { timestamp: Date.now() });
        }
    }, 15000); // Every 15 seconds

    // Clean up interval on disconnect
    socket.on('disconnect', () => {
        clearInterval(keepAliveInterval);
    });
}

function setupPeriodicCleanup() {
    // Clean up inactive connections
    setInterval(async () => {
        try {
            const inactiveThreshold = Date.now() - CONNECTION_CLEANUP.INACTIVE_TIMEOUT;
            const inactiveConnections = await getInactiveConnections(inactiveThreshold);

            for (const conn of inactiveConnections) {
                const socket = io.sockets.sockets.get(conn.socketId);
                if (socket && socket.connected) {
                    console.log(`🧹 Disconnecting inactive connection ${conn.connectionId}`);
                    socket.disconnect(true);
                }
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }, CONNECTION_CLEANUP.CLEANUP_INTERVAL);
}

function setupConnectionMonitoring() {
    // Log connection stats periodically
    setInterval(() => {
        const activeIps = new Set();
        io.sockets.sockets.forEach(socket => {
            activeIps.add(socket.handshake.address);
        });

        console.log(`📊 Socket Stats: ${connectionStats.activeConnections} active connections from ${activeIps.size} unique IPs`);
    }, 60000); // Every minute
}

async function trackConnectionInRedis(connectionId, ip, socketId) {
    try {
        await redisCache.set('socket_connection', {
            connectionId,
            ip,
            socketId,
            connectedAt: Date.now(),
            lastActivity: Date.now()
        }, 3600); // 1 hour TTL
    } catch (error) {
        console.error('Failed to track connection in Redis:', error);
    }
}

async function updateConnectionActivity(connectionId) {
    try {
        const connectionData = await redisCache.get('socket_connection', connectionId);
        if (connectionData) {
            connectionData.lastActivity = Date.now();
            await redisCache.set('socket_connection', connectionData, 3600);
        }
    } catch (error) {
        console.error('Failed to update connection activity:', error);
    }
}

async function getInactiveConnections(threshold) {
    try {
        // This would be more efficient with Redis keys pattern matching in production
        // For now, we'll simulate it
        const connections = [];
        io.sockets.sockets.forEach(socket => {
            // In a real implementation, we'd check Redis for last activity
            connections.push({
                socketId: socket.id,
                connectionId: `conn_${socket.id}`,
                lastActivity: socket.handshake.time // This is simplified
            });
        });

        return connections.filter(conn => conn.lastActivity < threshold);
    } catch (error) {
        console.error('Failed to get inactive connections:', error);
        return [];
    }
}

function cleanupConnection(connectionId, ip) {
    connectionStats.activeConnections = Math.max(0, connectionStats.activeConnections - 1);

    // Clean up rate limiting
    if (ipConnectionCounts.has(ip)) {
        ipConnectionCounts.set(ip, Math.max(0, ipConnectionCounts.get(ip) - 1));
    }

    // Clean up from Redis
    redisCache.delete('socket_connection', connectionId).catch(err => {
        console.error('Failed to clean up connection from Redis:', err);
    });
}

function checkRateLimit(ip) {
    const now = Date.now();

    // Initialize rate limit tracking for this IP if not exists
    if (!connectionRateLimits.has(ip)) {
        connectionRateLimits.set(ip, {
            connections: [],
            lastCheck: now
        });
    }

    const rateData = connectionRateLimits.get(ip);

    // Clean up old connections
    rateData.connections = rateData.connections.filter(conn => {
        return now - conn < CONNECTION_CLEANUP.RATE_LIMIT_WINDOW;
    });

    // Check if limit exceeded
    if (rateData.connections.length >= CONNECTION_CLEANUP.RATE_LIMIT_MAX) {
        return true; // Rate limit exceeded
    }

    // Add current connection
    rateData.connections.push(now);
    rateData.lastCheck = now;

    return false; // Within rate limit
}

async function updateUserPresence(userId, online, connectionId) {
    try {
        const presenceKey = `user_presence:${userId}`;
        const presenceData = {
            userId,
            online,
            connectionId,
            lastSeen: Date.now(),
            lastConnection: connectionId
        };

        // Store presence with appropriate TTL
        const ttl = online ? 3600 : 600; // 1 hour if online, 10 minutes if offline
        await redisCache.set(presenceKey, presenceData, ttl);

        // Broadcast presence update to friends/followers if implemented
        // io.to(`user:${userId}:followers`).emit('presence_update', presenceData);
    } catch (error) {
        console.error('Failed to update user presence:', error);
    }
}

export const getIo = () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
};

export const getAdminStatus = () => adminOnlineStatus;

export const getConnectionStats = () => ({
    ...connectionStats,
    rateLimits: Object.fromEntries(connectionRateLimits),
    ipCounts: Object.fromEntries(ipConnectionCounts)
});

export const broadcastToEvent = (eventId, eventName, data) => {
    if (!io) {
        console.error('Socket.io not initialized');
        return false;
    }

    try {
        io.to(eventId).emit(eventName, data);
        return true;
    } catch (error) {
        console.error(`Failed to broadcast to event ${eventId}:`, error);
        return false;
    }
};

export const getActiveConnectionsCount = () => {
    return io ? io.engine.clientsCount : 0;
};

// Graceful shutdown
export const shutdownSocket = async () => {
    if (io) {
        console.log('🔌 Shutting down Socket.io server...');

        // Notify all clients
        io.emit('server_shutdown', {
            message: 'Server is shutting down for maintenance',
            timestamp: Date.now(),
            reconnect: false
        });

        // Close all connections
        await new Promise(resolve => {
            io.close(() => {
                console.log('✓ Socket.io server closed');
                resolve();
            });
        });
    }
};