import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../server/snapify.db');

const { verbose } = sqlite3;

// Database connection pool configuration
const POOL_SIZE = 10; // Number of connections in the pool
const MAX_RETRIES = 3; // Maximum retry attempts for failed connections
const RETRY_DELAY = 1000; // Delay between retry attempts in ms

class DatabaseConnectionPool {
    constructor() {
        this.pool = [];
        this.availableConnections = [];
        this.pendingRequests = [];
        this.isInitializing = false;
    }

    async initialize() {
        if (this.isInitializing) return;
        this.isInitializing = true;

        console.log(`Initializing database connection pool with ${POOL_SIZE} connections...`);

        try {
            // Create initial pool of connections
            for (let i = 0; i < POOL_SIZE; i++) {
                await this.createConnection();
            }

            console.log(`✓ Database connection pool initialized with ${this.pool.length} connections`);
        } catch (error) {
            console.error('Failed to initialize connection pool:', error);
            throw error;
        } finally {
            this.isInitializing = false;
        }
    }

    async createConnection(retryCount = 0) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, async (err) => {
                if (err) {
                    if (retryCount < MAX_RETRIES) {
                        console.log(`Connection attempt ${retryCount + 1} failed, retrying in ${RETRY_DELAY}ms...`);
                        setTimeout(() => {
                            this.createConnection(retryCount + 1).then(resolve).catch(reject);
                        }, RETRY_DELAY);
                    } else {
                        console.error(`Failed to create database connection after ${MAX_RETRIES} attempts:`, err);
                        reject(err);
                    }
                    return;
                }

                try {
                    // Apply performance optimizations to this connection
                    await this.applyPerformanceOptimizations(db);

                    // Add connection to pool
                    const connectionId = this.pool.length;
                    const connection = {
                        id: connectionId,
                        db: db,
                        inUse: false,
                        lastUsed: Date.now(),
                        createdAt: Date.now()
                    };

                    this.pool.push(connection);
                    this.availableConnections.push(connection);
                    console.log(`✓ Created database connection #${connectionId}`);
                    resolve(connection);
                } catch (optimizationError) {
                    console.error('Failed to optimize connection:', optimizationError);
                    db.close();
                    reject(optimizationError);
                }
            });
        });
    }

    async applyPerformanceOptimizations(db) {
        return new Promise((resolve, reject) => {
            // Enable WAL mode for better write performance
            db.run("PRAGMA journal_mode = WAL;", (walErr) => {
                if (walErr) {
                    console.error('Failed to enable WAL mode:', walErr);
                    // Fallback to DELETE mode if WAL fails
                    db.run("PRAGMA journal_mode = DELETE;");
                }

                // Set synchronous mode to NORMAL for better performance with WAL
                db.run("PRAGMA synchronous = NORMAL;", (syncErr) => {
                    if (syncErr) {
                        console.error('Failed to set synchronous mode:', syncErr);
                    }

                    // Increase cache size for better performance
                    db.run("PRAGMA cache_size = -20000;", (cacheErr) => {
                        if (cacheErr) {
                            console.error('Failed to set cache size:', cacheErr);
                        }

                        // Enable foreign keys
                        db.run("PRAGMA foreign_keys = ON;", (fkErr) => {
                            if (fkErr) {
                                console.error('Failed to enable foreign keys:', fkErr);
                            }
                            resolve();
                        });
                    });
                });
            });
        });
    }

    async getConnection() {
        return new Promise((resolve, reject) => {
            // Check if there are available connections
            if (this.availableConnections.length > 0) {
                const connection = this.availableConnections.pop();
                connection.inUse = true;
                connection.lastUsed = Date.now();
                resolve(connection);
                return;
            }

            // If no connections available, check if we can create more
            if (this.pool.length < POOL_SIZE * 1.5) { // Allow some overflow
                this.createConnection().then(connection => {
                    connection.inUse = true;
                    connection.lastUsed = Date.now();
                    resolve(connection);
                }).catch(reject);
                return;
            }

            // If pool is full, queue the request
            this.pendingRequests.push({ resolve, reject });
        });
    }

    releaseConnection(connection) {
        if (!connection) return;

        connection.inUse = false;
        connection.lastUsed = Date.now();

        // Check if there are pending requests
        if (this.pendingRequests.length > 0) {
            const { resolve } = this.pendingRequests.shift();
            connection.inUse = true;
            resolve(connection);
        } else {
            this.availableConnections.push(connection);
        }

        // Clean up old connections periodically
        this.cleanupOldConnections();
    }

    cleanupOldConnections() {
        const now = Date.now();
        const MAX_IDLE_TIME = 30 * 60 * 1000; // 30 minutes

        // Remove connections that have been idle for too long
        this.availableConnections = this.availableConnections.filter(conn => {
            if (now - conn.lastUsed > MAX_IDLE_TIME && this.pool.length > POOL_SIZE / 2) {
                console.log(`Closing idle connection #${conn.id}`);
                conn.db.close();
                this.pool = this.pool.filter(p => p.id !== conn.id);
                return false;
            }
            return true;
        });
    }

    async executeQuery(sql, params = []) {
        const connection = await this.getConnection();

        return new Promise((resolve, reject) => {
            connection.db.all(sql, params, (err, rows) => {
                this.releaseConnection(connection);
                if (err) {
                    console.error('Query execution error:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async executeSingleQuery(sql, params = []) {
        const connection = await this.getConnection();

        return new Promise((resolve, reject) => {
            connection.db.get(sql, params, (err, row) => {
                this.releaseConnection(connection);
                if (err) {
                    console.error('Single query execution error:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async executeRun(sql, params = []) {
        const connection = await this.getConnection();

        return new Promise((resolve, reject) => {
            connection.db.run(sql, params, function (err) {
                this.releaseConnection(connection);
                if (err) {
                    console.error('Run execution error:', err);
                    reject(err);
                } else {
                    resolve({
                        changes: this.changes,
                        lastID: this.lastID
                    });
                }
            });
        });
    }

    async closeAll() {
        console.log('Closing all database connections...');
        const closePromises = this.pool.map(connection => {
            return new Promise((resolve) => {
                connection.db.close((err) => {
                    if (err) console.error(`Error closing connection #${connection.id}:`, err);
                    else console.log(`✓ Closed connection #${connection.id}`);
                    resolve();
                });
            });
        });

        await Promise.all(closePromises);
        this.pool = [];
        this.availableConnections = [];
        console.log('All database connections closed');
    }

    getPoolStats() {
        return {
            totalConnections: this.pool.length,
            availableConnections: this.availableConnections.length,
            inUseConnections: this.pool.length - this.availableConnections.length,
            pendingRequests: this.pendingRequests.length
        };
    }
}

// Singleton instance
const dbPool = new DatabaseConnectionPool();

// Initialize the pool
dbPool.initialize().catch(err => {
    console.error('Failed to initialize database pool:', err);
});

export { dbPool };