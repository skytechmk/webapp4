import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../../server/config/env.js';
import { redisService } from '../../server/services/redisService.js';
import { logger } from '../../server/services/loggerService.js';

class AuthService {
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
                service: 'auth',
                timestamp: new Date().toISOString()
            });
        });

        // User registration
        this.app.post('/register', async (req, res) => {
            try {
                const { email, password, name, role = 'user' } = req.body;

                if (!email || !password || !name) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }

                // Check if user already exists (in a real implementation, this would check the database)
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
                    createdAt: new Date().toISOString()
                };

                // Store user (in a real implementation, this would save to database)
                await this.saveUser(user);

                // Generate JWT token
                const token = this.generateToken(user);

                res.json({
                    success: true,
                    user: this.sanitizeUser(user),
                    token
                });

            } catch (error) {
                logger.error('Registration error:', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // User login
        this.app.post('/login', async (req, res) => {
            try {
                const { email, password } = req.body;

                if (!email || !password) {
                    return res.status(400).json({ error: 'Missing credentials' });
                }

                // Find user (in a real implementation, this would query the database)
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

        // Token validation
        this.app.post('/validate', async (req, res) => {
            try {
                const { token } = req.body;

                if (!token) {
                    return res.status(400).json({ error: 'Token required' });
                }

                // Validate token
                const decoded = jwt.verify(token, config.JWT_SECRET);

                // Check if user exists (in a real implementation, this would query the database)
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
        this.app.post('/refresh', async (req, res) => {
            try {
                const { token } = req.body;

                if (!token) {
                    return res.status(400).json({ error: 'Token required' });
                }

                // Validate token
                const decoded = jwt.verify(token, config.JWT_SECRET);

                // Check if user exists (in a real implementation, this would query the database)
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

    // Database methods (would be implemented to connect to actual database)
    async getUserByEmail(email) {
        // In a real implementation, this would query the database
        // For now, return null to simulate no existing user
        return null;
    }

    async getUserById(userId) {
        // In a real implementation, this would query the database
        // For now, return a mock user
        return {
            id: userId,
            email: 'test@example.com',
            name: 'Test User',
            password: '$2b$10$mockhash', // Mock hashed password
            role: 'user'
        };
    }

    async saveUser(user) {
        // In a real implementation, this would save to database
        // For now, just log
        logger.info('User saved (mock)', { userId: user.id });
    }

    // Start the service
    start(port = 3002) {
        return new Promise((resolve) => {
            this.app.listen(port, () => {
                logger.info(`Auth Service running on port ${port}`);
                resolve();
            });
        });
    }
}

export const authService = new AuthService();
export default authService;