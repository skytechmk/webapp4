import dotenv from 'dotenv';
dotenv.config();

export const config = {
    PORT: process.env.PORT || 3001,
    NODE_ENV: process.env.NODE_ENV || 'development',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@skytech.mk',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
    JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
    JWT_EXPIRY: '7d',
    SMTP: {
        HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
        PORT: parseInt(process.env.SMTP_PORT || '587'),
        USER: process.env.SMTP_USER,
        PASS: process.env.SMTP_PASS
    },
    ALLOWED_ORIGINS: process.env.NODE_ENV === 'production'
        ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://snapify.skytech.mk', 'https://www.snapify.skytech.mk', 'http://snapify.skytech.mk', 'http://www.snapify.skytech.mk'])
        : (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*'),
    S3: {
        ENDPOINT: process.env.S3_ENDPOINT || 'http://192.168.20.153:9000',
        REGION: process.env.S3_REGION || 'us-east-1',
        BUCKET: process.env.S3_BUCKET_NAME || 'snapify-media',
        ACCESS_KEY: process.env.S3_ACCESS_KEY || 'minioadmin',
        SECRET_KEY: process.env.S3_SECRET_KEY || 'minioadmin'
    },
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    REDIS: {
        HOST: process.env.REDIS_HOST || 'localhost',
        PORT: parseInt(process.env.REDIS_PORT || '6379'),
        PASSWORD: process.env.REDIS_PASSWORD,
        DB: parseInt(process.env.REDIS_DB || '0')
    },
    DATABASE_MIGRATION: {
        AUTO_RUN: process.env.AUTO_RUN_MIGRATION === 'true',
        SHARDING_ENABLED: process.env.SHARDING_ENABLED !== 'false',
        READ_REPLICAS_ENABLED: process.env.READ_REPLICAS_ENABLED !== 'false',
        CACHING_ENABLED: process.env.CACHING_ENABLED !== 'false',
        ARCHIVING_ENABLED: process.env.ARCHIVING_ENABLED !== 'false',
        SHARD_COUNT: parseInt(process.env.SHARD_COUNT || '4'),
        REPLICA_COUNT: parseInt(process.env.REPLICA_COUNT || '2')
    }
};

if (config.NODE_ENV === 'production') {
    const requiredVars = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'JWT_SECRET'];
    const missing = requiredVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`FATAL: Missing required environment variables in production: ${missing.join(', ')}`);
        process.exit(1);
    }
}
