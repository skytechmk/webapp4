import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import sqlite3 from 'sqlite3';
const { verbose } = sqlite3;
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs';
import bodyParser from 'body-parser';
import http from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import webpush from 'web-push';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { GoogleGenAI } from "@google/genai";
import crypto from 'crypto'; // Added for randomUUID
import { setIo } from './services/socket.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3001;

// SECURITY FIX: Strict Environment Check
if (process.env.NODE_ENV === 'production') {
    const requiredVars = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'JWT_SECRET'];
    const missing = requiredVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`FATAL: Missing required environment variables in production: ${missing.join(', ')}`);
        process.exit(1);
    }
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@skytech.mk';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // SECURITY: Change this in production!
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production'; // SECURITY: Generate a secure random secret for production!
const JWT_EXPIRY = '7d';

// Domain Management
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://snapify.skytech.mk'])
    : (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*');

// MinIO / S3 Config
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://192.168.20.153:9000';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'snapify-media';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'snapify_admin';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'StrongPassword123!';

const s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY
    },
    forcePathStyle: true
});

// Web Push Configuration
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BPhZ...placeholder...',
    privateKey: process.env.VAPID_PRIVATE_KEY || '...placeholder...'
};

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:' + ADMIN_EMAIL,
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        credentials: true
    }
});
// Share socket instance with services
setIo(io);

// Middleware
app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// --- SECURITY: Rate Limiters ---

const RateLimitStore = {
    upload: new Map(),
    pin: new Map(),

    // Clean up old entries every hour
    cleanup: setInterval(() => {
        RateLimitStore.upload.clear();
        const now = Date.now();
        for (const [key, data] of RateLimitStore.pin.entries()) {
            if (data.resetTime < now) RateLimitStore.pin.delete(key);
        }
    }, 3600000)
};

// Generic Rate Limiter Helper
const checkRateLimit = (store, key, limit, windowMs) => {
    const now = Date.now();
    let record = store.get(key);

    if (!record || record.resetTime < now) {
        record = { count: 0, resetTime: now + windowMs };
        store.set(key, record);
    }

    if (record.count >= limit) return false;
    record.count++;
    return true;
};

// Middleware for PIN Brute Force Protection
const pinRateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    // Limit: 5 attempts per 15 minutes
    if (!checkRateLimit(RateLimitStore.pin, ip, 5, 15 * 60 * 1000)) {
        return res.status(429).json({
            error: "Too many failed attempts. Please try again in 15 minutes."
        });
    }
    next();
};

// Authentication Middleware (Updated)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Optional Auth Middleware (for Guest Uploads)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) req.user = user;
            next();
        });
    } else {
        next();
    }
};

// Local Temp Storage
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
} else {
    // Clean up on start
    fs.readdir(uploadDir, (err, files) => {
        if (!err) {
            for (const file of files) {
                fs.unlink(path.join(uploadDir, file), () => { });
            }
        }
    });
}

// Database Setup
const dbPath = path.join(__dirname, 'snapify.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('DB Error', err);
    else {
        console.log('Connected to SQLite database');
        db.run("PRAGMA foreign_keys = ON;");
    }
});

// Initialize Tables & Seed Admin
db.serialize(async () => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'USER',
        tier TEXT DEFAULT 'FREE',
        storageUsedMb REAL DEFAULT 0,
        storageLimitMb REAL,
        joinedDate TEXT,
        studioName TEXT,
        logoUrl TEXT,
        watermarkOpacity REAL,
        watermarkSize REAL,
        watermarkPosition TEXT,
        watermarkOffsetX REAL,
        watermarkOffsetY REAL
    )`);

    const adminId = 'admin-system-id';
    const adminName = 'System Admin';
    const joined = new Date().toISOString();

    try {
        const hashedAdminPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        db.run(`INSERT OR REPLACE INTO users (id, name, email, password, role, tier, storageUsedMb, storageLimitMb, joinedDate, studioName) 
            VALUES (?, ?, ?, ?, 'ADMIN', 'STUDIO', 0, -1, ?, 'System Root')`,
            [adminId, adminName, ADMIN_EMAIL, hashedAdminPassword, joined], (err) => {
                if (err) console.error("Failed to seed admin user:", err);
                else console.log("System Admin seeded/updated successfully.");
            });
    } catch (err) {
        console.error("Error hashing admin password:", err);
    }

    db.run(`CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        date TEXT,
        city TEXT,
        hostId TEXT,
        code TEXT,
        coverImage TEXT,
        coverMediaType TEXT,
        expiresAt TEXT,
        pin TEXT,
        views INTEGER DEFAULT 0,
        downloads INTEGER DEFAULT 0,
        FOREIGN KEY(hostId) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // NEW: Vendors Table
    db.run(`CREATE TABLE IF NOT EXISTS vendors (
        id TEXT PRIMARY KEY,
        ownerId TEXT,
        businessName TEXT,
        category TEXT,
        city TEXT,
        description TEXT,
        contactEmail TEXT,
        contactPhone TEXT,
        website TEXT,
        instagram TEXT,
        coverImage TEXT,
        isVerified INTEGER DEFAULT 0,
        createdAt TEXT,
        FOREIGN KEY(ownerId) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.all("PRAGMA table_info(media)", (err, rows) => {
        if (err) return;
        const hasPrivacy = rows.some(row => row.name === 'privacy');
        if (!hasPrivacy) {
            db.run("ALTER TABLE media ADD COLUMN privacy TEXT DEFAULT 'public'");
        }
        const hasUploaderId = rows.some(row => row.name === 'uploaderId');
        if (!hasUploaderId) {
            db.run("ALTER TABLE media ADD COLUMN uploaderId TEXT");
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        eventId TEXT,
        type TEXT,
        url TEXT,
        previewUrl TEXT,
        isProcessing INTEGER DEFAULT 0,
        caption TEXT,
        uploadedAt TEXT,
        uploaderName TEXT,
        isWatermarked INTEGER,
        watermarkText TEXT,
        likes INTEGER DEFAULT 0,
        privacy TEXT DEFAULT 'public',
        uploaderId TEXT,
        FOREIGN KEY(eventId) REFERENCES events(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS guestbook (
        id TEXT PRIMARY KEY,
        eventId TEXT,
        senderName TEXT,
        message TEXT,
        createdAt TEXT,
        FOREIGN KEY(eventId) REFERENCES events(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        mediaId TEXT,
        eventId TEXT,
        senderName TEXT,
        text TEXT,
        createdAt TEXT,
        FOREIGN KEY(mediaId) REFERENCES media(id) ON DELETE CASCADE
    )`);
});

// File upload middleware
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
        files: 1 // Only one file per request
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'
        ];

        // 1. Check MIME type
        if (!allowedMimes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type'), false);
        }

        // 2. Upload Rate Limiting (IP based)
        const clientIP = req.ip || req.connection.remoteAddress;
        // Strict limit: 20 uploads per hour per IP
        if (!checkRateLimit(RateLimitStore.upload, clientIP, 20, 60 * 60 * 1000)) {
            return cb(new Error('Upload limit exceeded. Please try again later.'), false);
        }

        cb(null, true);
    }
});

// S3 Helpers
async function uploadToS3(filePath, key, contentType) {
    try {
        const fileStream = fs.createReadStream(filePath);
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: fileStream,
            ContentType: contentType
        }));
        return key;
    } catch (err) {
        console.error("S3 Upload Error:", err);
        throw new Error('Failed to upload media.');
    } finally {
        if (fs.existsSync(filePath)) fs.unlink(filePath, () => { });
    }
}

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    socket.on('join_event', (eventId) => {
        socket.join(eventId);
    });

    // NEW: Admin Force Reload Listener
    socket.on('admin_trigger_reload', (token) => {
        try {
            const user = jwt.verify(token, JWT_SECRET);
            if (user.role === 'ADMIN') {
                console.log(`Admin ${user.id} triggered global reload`);
                // Broadcast to ALL clients connected
                io.emit('force_client_reload', { version: Date.now() });
            }
        } catch (e) {
            console.error("Unauthorized reload attempt");
        }
    });
});


// --- ROUTES - Use API Gateway for modular routing ---
import { apiGateway } from './services/apiGateway.js';

// Use the API Gateway which includes all routes including system routes
app.use(apiGateway.getApp());
server.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
