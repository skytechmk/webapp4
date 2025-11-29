import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../server/snapify.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('DB Error', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database at', dbPath);
});

const createEvent = () => {
    const query = `INSERT OR IGNORE INTO events (id, title, description, date, city, hostId, code, expiresAt, createdAt) 
                   VALUES ('test-event-id', 'Test Event', 'Description', '2025-01-01', 'Test City', 'test-host', 'TEST12', '2026-01-01', '2025-01-01')`;

    db.run(query, function (err) {
        if (err) {
            console.error('Error creating event:', err);
            process.exit(1);
        }
        console.log('Event created/ignored. Changes:', this.changes);
        process.exit(0);
    });
};

createEvent();
