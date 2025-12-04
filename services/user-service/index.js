import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../../server/config/env.js';
import { redisService } from '../../server/services/redisService.js';
import { logger } from '../../server/services/loggerService.js';
import { db } from '../../server/config/db.js';

class UserService {
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
                service: 'user',
                timestamp: new Date().toISOString()
            });
        });

        // User registration
        this.app.post('/users', async (req, res) => {
            try {
                const { email, password, name, role = 'user', studioName } = req.body;

                if (!email || !password || !name) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }

                // Check if user already exists
                const existingUser = await this.getUserByEmail(email);
                if (existingUser) {
                    return res.status(409).json({ error: 'User already exists' });
                }

                // Hash password
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                // Create user
                const user = {
                    id: `user-${Date.now()}`,
                    email: email.toLowerCase(),
                    name,
                    password: hashedPassword,
                    role,
                    studioName: studioName || null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // Save user to database
                await this.saveUser(user);

                // Generate JWT token
                const token = this.generateToken(user);

                res.status(201).json({
                    success: true,
                    user: this.sanitizeUser(user),
                    token
                });

            } catch (error) {
                logger.error('User registration error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get user by ID
        this.app.get('/users/:id', async (req, res) => {
            try {
                const { id } = req.params;

                // Get user from database
                const user = await this.getUserById(id);
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                res.json({
                    success: true,
                    user: this.sanitizeUser(user)
                });

            } catch (error) {
                logger.error('Get user error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Update user
        this.app.put('/users/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const updates = req.body;

                // Get existing user
                const existingUser = await this.getUserById(id);
                if (!existingUser) {
                    return res.status(404).json({ error: 'User not found' });
                }

                // Update user
                const updatedUser = {
                    ...existingUser,
                    ...updates,
                    updatedAt: new Date().toISOString()
                };

                // Save updated user
                await this.updateUser(updatedUser);

                res.json({
                    success: true,
                    user: this.sanitizeUser(updatedUser)
                });

            } catch (error) {
                logger.error('Update user error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Delete user
        this.app.delete('/users/:id', async (req, res) => {
            try {
                const { id } = req.params;

                // Delete user from database
                await this.deleteUser(id);

                res.json({
                    success: true,
                    message: 'User deleted successfully'
                });

            } catch (error) {
                logger.error('Delete user error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // User login
        this.app.post('/auth/login', async (req, res) => {
            try {
                const { email, password } = req.body;

                if (!email || !password) {
                    return res.status(400).json({ error: 'Missing credentials' });
                }

                // Find user
                const user = await this.getUserByEmail(email);
                if (!user) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                // Verify password
                const isValid = await bcrypt.compare(password, user.password);
                if (!isValid) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                // Generate JWT token
                const token = this.generateToken(user);

                res.json({
                    success: true,
                    user: this.sanitizeUser(user),
                    token
                });

            } catch (error) {
                logger.error('Login error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Google login
        this.app.post('/auth/google', async (req, res) => {
            try {
                const { credential } = req.body;

                if (!credential) {
                    return res.status(400).json({ error: 'Google credential is required' });
                }

                // In a real implementation, this would verify the Google credential
                // For now, we'll create a mock user
                const user = {
                    id: `google-${Date.now()}`,
                    email: `google-user-${Date.now()}@example.com`,
                    name: 'Google User',
                    role: 'user',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // Save user to database
                await this.saveUser(user);

                // Generate JWT token
                const token = this.generateToken(user);

                res.json({
                    success: true,
                    user: this.sanitizeUser(user),
                    token
                });

            } catch (error) {
                logger.error('Google login error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Token validation
        this.app.post('/auth/validate', async (req, res) => {
            try {
                const { token } = req.body;

                if (!token) {
                    return res.status(400).json({ error: 'Token required' });
                }

                // Validate token
                const decoded = jwt.verify(token, config.JWT_SECRET);

                // Check if user exists
                const user = await this.getUserById(decoded.userId);
                if (!user) {
                    return res.status(401).json({ error: 'Invalid token' });
                }

                res.json({
                    valid: true,
                    user: this.sanitizeUser(user)
                });

            } catch (error) {
                logger.error('Token validation error:', { error: error.message });
                res.status(401).json({ error: 'Invalid token' });
            }
        });

        // Token refresh
        this.app.post('/auth/refresh', async (req, res) => {
            try {
                const { token } = req.body;

                if (!token) {
                    return res.status(400).json({ error: 'Token required' });
                }

                // Validate token
                const decoded = jwt.verify(token, config.JWT_SECRET);

                // Check if user exists
                const user = await this.getUserById(decoded.userId);
                if (!user) {
                    return res.status(401).json({ error: 'Invalid token' });
                }

                // Generate new token
                const newToken = this.generateToken(user);

                res.json({
                    success: true,
                    token: newToken
                });

            } catch (error) {
                logger.error('Token refresh error:', { error: error.message });
                res.status(401).json({ error: 'Invalid token' });
            }
        });
    }

    // Helper methods
    generateToken(user) {
        return jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            config.JWT_SECRET,
            { expiresIn: '24h' }
        );
    }

    sanitizeUser(user) {
        const { password, ...sanitized } = user;
        return sanitized;
    }

    // Database methods
    async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()], (err, row) => {
                if (err) {
                    logger.error('Database error in getUserByEmail:', { error: err.message });
                    return reject(err);
                }
                resolve(row);
            });
        });
    }

    async getUserById(userId) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) {
                    logger.error('Database error in getUserById:', { error: err.message });
                    return reject(err);
                }
                resolve(row);
            });
        });
    }

    async saveUser(user) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (id, email, name, password, role, studioName, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    user.id,
                    user.email,
                    user.name,
                    user.password,
                    user.role,
                    user.studioName,
                    user.createdAt,
                    user.updatedAt
                ],
                function (err) {
                    if (err) {
                        logger.error('Database error in saveUser:', { error: err.message });
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    async updateUser(user) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET email = ?, name = ?, password = ?, role = ?, studioName = ?, updatedAt = ? WHERE id = ?',
                [
                    user.email,
                    user.name,
                    user.password,
                    user.role,
                    user.studioName,
                    user.updatedAt,
                    user.id
                ],
                function (err) {
                    if (err) {
                        logger.error('Database error in updateUser:', { error: err.message });
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    }

    async deleteUser(userId) {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
                if (err) {
                    logger.error('Database error in deleteUser:', { error: err.message });
                    return reject(err);
                }
                resolve();
            });
        });
    }

    // Start the service
    start(port = 3004) {
        return new Promise((resolve) => {
            this.app.listen(port, () => {
                logger.info(`User Service running on port ${port}`);
                resolve();
            });
        });
    }
}

export const userService = new UserService();
export default userService;