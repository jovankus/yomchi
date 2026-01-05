/**
 * Migration: Create final_reports table for Patient Final Reports
 */
const db = require('../db');

async function up() {
    return new Promise((resolve, reject) => {
        db.run(`
            CREATE TABLE IF NOT EXISTS final_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                author_role TEXT NOT NULL,
                diagnosis TEXT,
                treatment_plan TEXT,
                summary TEXT,
                recommendations TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (patient_id) REFERENCES patients(id)
            )
        `, (err) => {
            if (err) return reject(err);
            console.log('final_reports table created');
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
