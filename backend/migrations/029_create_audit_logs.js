const db = require('../db');

// Create audit_logs table for SQLite
db.run(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    user_role TEXT,
    user_role_id INTEGER,
    clinic_id INTEGER,
    details TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`, (err) => {
    if (err) {
        console.error('Migration 029 failed:', err.message);
    } else {
        console.log('✓ Migration 029: audit_logs table created');
    }
});

// Create index for faster querying
db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)`, (err) => {
    if (err) console.error('Index creation failed:', err.message);
});

db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`, (err) => {
    if (err) console.error('Index creation failed:', err.message);
});
