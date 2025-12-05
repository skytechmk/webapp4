import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { initDb } from './config/db.js';
import { initOptimizedSocket } from './services/optimizedSocket.js';
import { apiGateway } from './services/apiGateway.js';
import { logger } from './services/loggerService.js';
import { monitoring } from './services/monitoringService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
    console.log(`📂 Creating upload directory: ${uploadDir}`);
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Initialize Database
initDb();

// Get the Express app from API Gateway
const app = apiGateway.getApp();
const server = http.createServer(app);

// Initialize Socket.io
initOptimizedSocket(server);

// Trust proxy - required when behind nginx
app.set('trust proxy', true);

// Admin Reset (Dev Only) - Add this to the gateway
app.post('/api/admin/reset', async (req, res) => {
    const { authenticateToken } = await import('./controllers/authController.js');
    authenticateToken(req, res, async () => {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Unauthorized" });
        if (config.NODE_ENV === 'production') {
            return res.status(403).json({ error: "System reset is disabled in production." });
        }
        // ... (Reset logic would go here, omitted for brevity as it's dev-only)
        res.json({ success: true, message: "Reset functionality is currently disabled in refactored version." });
    });
});

// Start Server
server.listen(config.PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${config.PORT} and listening on all interfaces`, {
        port: config.PORT,
        host: '0.0.0.0',
        environment: config.NODE_ENV,
        redisEnabled: !!process.env.REDIS_HOST,
        sentryEnabled: !!config.SENTRY_DSN
    });
});