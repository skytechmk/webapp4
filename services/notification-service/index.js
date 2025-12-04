import express from 'express';
import { db } from '../../server/config/db.js';
import { redisService } from '../../server/services/redisService.js';
import { logger } from '../../server/services/loggerService.js';
import { io } from 'socket.io-client';

class NotificationService {
    constructor() {
        this.app = express();
        this.notificationSocket = null;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Security headers
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                service: 'notification',
                timestamp: new Date().toISOString()
            });
        });

        // Create notification
        this.app.post('/notifications', async (req, res) => {
            try {
                const { userId, title, message, type = 'info', data = {} } = req.body;

                if (!userId || !title || !message) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }

                // Create notification
                const notification = {
                    id: `notification-${Date.now()}`,
                    userId,
                    title,
                    message,
                    type,
                    data: JSON.stringify(data),
                    isRead: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // Save notification to database
                await this.saveNotification(notification);

                // Cache the notification
                await redisService.set(`notification:${notification.id}`, notification, 3600);

                // Send real-time notification if WebSocket is connected
                if (this.notificationSocket) {
                    this.notificationSocket.emit('notification', {
                        userId,
                        notification: {
                            id: notification.id,
                            title,
                            message,
                            type,
                            data,
                            isRead: false,
                            createdAt: notification.createdAt
                        }
                    });
                }

                res.status(201).json({
                    success: true,
                    notification
                });

            } catch (error) {
                logger.error('Create notification error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get user notifications
        this.app.get('/notifications/user/:userId', async (req, res) => {
            try {
                const { userId } = req.params;

                // Get notifications from database
                const notifications = await this.getNotificationsByUser(userId);

                res.json({
                    success: true,
                    notifications: notifications.map(n => ({
                        ...n,
                        data: n.data ? JSON.parse(n.data) : {}
                    }))
                });

            } catch (error) {
                logger.error('Get user notifications error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Mark notification as read
        this.app.put('/notifications/:id/read', async (req, res) => {
            try {
                const { id } = req.params;

                // Update notification
                await this.markNotificationAsRead(id);

                // Invalidate cache
                await redisService.del(`notification:${id}`);

                res.json({
                    success: true,
                    message: 'Notification marked as read'
                });

            } catch (error) {
                logger.error('Mark notification as read error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Send email notification
        this.app.post('/notifications/email', async (req, res) => {
            try {
                const { email, subject, body, html } = req.body;

                if (!email || !subject || !body) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }

                // In a real implementation, this would send an actual email
                // For now, we'll log it and return success
                logger.info('Email notification sent (mock)', {
                    email,
                    subject,
                    hasHtml: !!html
                });

                res.json({
                    success: true,
                    message: 'Email notification sent successfully'
                });

            } catch (error) {
                logger.error('Send email notification error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Send push notification
        this.app.post('/notifications/push', async (req, res) => {
            try {
                const { userId, title, body, data = {} } = req.body;

                if (!userId || !title || !body) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }

                // In a real implementation, this would send an actual push notification
                // For now, we'll log it and return success
                logger.info('Push notification sent (mock)', {
                    userId,
                    title,
                    body,
                    data
                });

                res.json({
                    success: true,
                    message: 'Push notification sent successfully'
                });

            } catch (error) {
                logger.error('Send push notification error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }

    setupWebSocket() {
        // Connect to WebSocket for real-time notifications
        // This would connect to the main application's WebSocket server
        try {
            this.notificationSocket = io('http://localhost:3000', {
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 5000,
                transports: ['websocket']
            });

            this.notificationSocket.on('connect', () => {
                logger.info('Notification service connected to WebSocket server');
            });

            this.notificationSocket.on('disconnect', (reason) => {
                logger.warn(`Notification service disconnected from WebSocket: ${reason}`);
            });

            this.notificationSocket.on('error', (error) => {
                logger.error('Notification service WebSocket error:', { error: error.message });
            });

        } catch (error) {
            logger.error('Failed to setup WebSocket connection:', { error: error.message });
        }
    }

    // Database methods
    async saveNotification(notification) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO notifications (id, userId, title, message, type, data, isRead, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    notification.id,
                    notification.userId,
                    notification.title,
                    notification.message,
                    notification.type,
                    notification.data,
                    notification.isRead ? 1 : 0,
                    notification.createdAt,
                    notification.updatedAt
                ],
                function (err) {
                    if (err) {
                        logger.error('Database error in saveNotification:', { error: err.message });
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    async getNotificationsByUser(userId) {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC', [userId], (err, rows) => {
                if (err) {
                    logger.error('Database error in getNotificationsByUser:', { error: err.message });
                    return reject(err);
                }
                resolve(rows || []);
            });
        });
    }

    async markNotificationAsRead(notificationId) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE notifications SET isRead = 1, updatedAt = ? WHERE id = ?',
                [new Date().toISOString(), notificationId],
                function (err) {
                    if (err) {
                        logger.error('Database error in markNotificationAsRead:', { error: err.message });
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    // Start the service
    start(port = 3006) {
        return new Promise((resolve) => {
            this.app.listen(port, () => {
                logger.info(`Notification Service running on port ${port}`);
                resolve();
            });
        });
    }
}

export const notificationService = new NotificationService();
export default notificationService;