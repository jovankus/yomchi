/**
 * Migration: Create device_sessions table for "Remember This Device" feature
 */
const db = require('../db');

async function up() {
    return new Promise((resolve, reject) => {
        db.run(`
            CREATE TABLE IF NOT EXISTS device_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clinic_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                device_name TEXT,
                last_used_at TEXT DEFAULT (datetime('now')),
                expires_at TEXT NOT NULL,
                revoked_at TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (clinic_id) REFERENCES clinics(id)
            )
        `, (err) => {
            if (err) return reject(err);
            console.log('device_sessions table created');
            resolve();
        });
    });
}

module.exports = { up };

if (require.main === module) {
    up().then(() => {
        console.log('Migration complete');
        process.exit(0);
    }).catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}
