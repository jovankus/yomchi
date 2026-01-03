const db = require('../db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS integration_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        external_event_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        processed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, external_event_id)
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_integration_events_provider ON integration_events (provider)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_integration_events_processed_at ON integration_events (processed_at)`);

    console.log('Integration Events table created with unique constraint and indexes.');
});
