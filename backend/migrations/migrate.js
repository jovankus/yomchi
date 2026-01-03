const db = require('../db');

function runMigrations() {
    console.log("Running migrations...");
    db.serialize(() => {
        // Create a basic migrations table to track state
        db.run(`CREATE TABLE IF NOT EXISTS _migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error creating migrations table:", err);
            else console.log("Migrations system initialized.");
        });
    });
}

if (require.main === module) {
    runMigrations();
}

module.exports = runMigrations;
