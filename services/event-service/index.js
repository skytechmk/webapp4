import express from 'express';
import { db } from '../../server/config/db.js';
import { redisService } from '../../server/services/redisService.js';
import { logger } from '../../server/services/loggerService.js';

class EventService {
    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
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
                service: 'event',
                timestamp: new Date().toISOString()
            });
        });

        // Create event
        this.app.post('/events', async (req, res) => {
            try {
                const eventData = req.body;

                // Validate required fields
                if (!eventData.title || !eventData.hostId || !eventData.date) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }

                // Create event
                const event = {
                    id: `event-${Date.now()}`,
                    title: eventData.title,
                    hostId: eventData.hostId,
                    date: eventData.date,
                    description: eventData.description || '',
                    location: eventData.location || '',
                    pin: eventData.pin || this.generateRandomPin(),
                    isPublic: eventData.isPublic !== false, // default true
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    mediaCount: 0,
                    guestCount: 0
                };

                // Save event to database
                await this.saveEvent(event);

                // Cache the event
                await redisService.set(`event:${event.id}`, event, 3600);

                res.status(201).json({
                    success: true,
                    event
                });

            } catch (error) {
                logger.error('Create event error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get event by ID
        this.app.get('/events/:id', async (req, res) => {
            try {
                const { id } = req.params;

                // Try to get from cache first
                const cachedEvent = await redisService.get(`event:${id}`);
                if (cachedEvent) {
                    return res.json({
                        success: true,
                        event: cachedEvent
                    });
                }

                // Get event from database
                const event = await this.getEventById(id);
                if (!event) {
                    return res.status(404).json({ error: 'Event not found' });
                }

                // Cache the event
                await redisService.set(`event:${id}`, event, 3600);

                res.json({
                    success: true,
                    event
                });

            } catch (error) {
                logger.error('Get event error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Update event
        this.app.put('/events/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const updates = req.body;

                // Get existing event
                const existingEvent = await this.getEventById(id);
                if (!existingEvent) {
                    return res.status(404).json({ error: 'Event not found' });
                }

                // Update event
                const updatedEvent = {
                    ...existingEvent,
                    ...updates,
                    updatedAt: new Date().toISOString()
                };

                // Save updated event
                await this.updateEvent(updatedEvent);

                // Invalidate cache
                await redisService.del(`event:${id}`);

                res.json({
                    success: true,
                    event: updatedEvent
                });

            } catch (error) {
                logger.error('Update event error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Delete event
        this.app.delete('/events/:id', async (req, res) => {
            try {
                const { id } = req.params;

                // Delete event from database
                await this.deleteEvent(id);

                // Invalidate cache
                await redisService.del(`event:${id}`);

                res.json({
                    success: true,
                    message: 'Event deleted successfully'
                });

            } catch (error) {
                logger.error('Delete event error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Validate event PIN
        this.app.post('/events/:id/validate-pin', async (req, res) => {
            try {
                const { id } = req.params;
                const { pin } = req.body;

                // Get event from database
                const event = await this.getEventById(id);
                if (!event) {
                    return res.status(404).json({ error: 'Event not found' });
                }

                // Validate PIN
                const isValid = event.pin === pin;
                if (!isValid) {
                    return res.status(401).json({ error: 'Invalid PIN' });
                }

                res.json({
                    success: true,
                    valid: true
                });

            } catch (error) {
                logger.error('Validate event PIN error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get all events
        this.app.get('/events', async (req, res) => {
            try {
                // Get all events from database
                const events = await this.getAllEvents();

                res.json({
                    success: true,
                    events
                });

            } catch (error) {
                logger.error('Get all events error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get events by host
        this.app.get('/events/host/:hostId', async (req, res) => {
            try {
                const { hostId } = req.params;

                // Get events by host from database
                const events = await this.getEventsByHost(hostId);

                res.json({
                    success: true,
                    events
                });

            } catch (error) {
                logger.error('Get events by host error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }

    // Helper methods
    generateRandomPin() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    // Database methods
    async saveEvent(event) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO events (id, title, hostId, date, description, location, pin, isPublic, createdAt, updatedAt, mediaCount, guestCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    event.id,
                    event.title,
                    event.hostId,
                    event.date,
                    event.description,
                    event.location,
                    event.pin,
                    event.isPublic ? 1 : 0,
                    event.createdAt,
                    event.updatedAt,
                    event.mediaCount,
                    event.guestCount
                ],
                function (err) {
                    if (err) {
                        logger.error('Database error in saveEvent:', { error: err.message });
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    async getEventById(eventId) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, row) => {
                if (err) {
                    logger.error('Database error in getEventById:', { error: err.message });
                    return reject(err);
                }
                resolve(row);
            });
        });
    }

    async updateEvent(event) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE events SET title = ?, hostId = ?, date = ?, description = ?, location = ?, pin = ?, isPublic = ?, updatedAt = ?, mediaCount = ?, guestCount = ? WHERE id = ?',
                [
                    event.title,
                    event.hostId,
                    event.date,
                    event.description,
                    event.location,
                    event.pin,
                    event.isPublic ? 1 : 0,
                    event.updatedAt,
                    event.mediaCount,
                    event.guestCount,
                    event.id
                ],
                function (err) {
                    if (err) {
                        logger.error('Database error in updateEvent:', { error: err.message });
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    async deleteEvent(eventId) {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM events WHERE id = ?', [eventId], function (err) {
                if (err) {
                    logger.error('Database error in deleteEvent:', { error: err.message });
                    return reject(err);
                }
                resolve();
            });
        });
    }

    async getAllEvents() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM events', [], (err, rows) => {
                if (err) {
                    logger.error('Database error in getAllEvents:', { error: err.message });
                    return reject(err);
                }
                resolve(rows || []);
            });
        });
    }

    async getEventsByHost(hostId) {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM events WHERE hostId = ?', [hostId], (err, rows) => {
                if (err) {
                    logger.error('Database error in getEventsByHost:', { error: err.message });
                    return reject(err);
                }
                resolve(rows || []);
            });
        });
    }

    // Start the service
    start(port = 3005) {
        return new Promise((resolve) => {
            this.app.listen(port, () => {
                logger.info(`Event Service running on port ${port}`);
                resolve();
            });
        });
    }
}

export const eventService = new EventService();
export default eventService;