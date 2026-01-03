const db = require('../db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS integrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        config_json TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations (provider)`);

    console.log('Integrations table created with indexes.');
});
