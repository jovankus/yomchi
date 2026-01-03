const db = require('../db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS financial_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_date TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK(event_type IN ('INCOME', 'EXPENSE')),
        category TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        description TEXT,
        reference_type TEXT CHECK(reference_type IN ('PATIENT', 'APPOINTMENT', 'EXPENSE', 'SYSTEM')),
        reference_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`, (err) => {
        if (err) {
            console.error('Error creating financial_events table:', err);
        } else {
            console.log('Financial events table created successfully.');
        }
    });

    // Create indexes for better query performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_financial_events_date ON financial_events(event_date)`, (err) => {
        if (err) {
            console.error('Error creating date index:', err);
        } else {
            console.log('Date index created successfully.');
        }
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_financial_events_type ON financial_events(event_type)`, (err) => {
        if (err) {
            console.error('Error creating type index:', err);
        } else {
            console.log('Type index created successfully.');
        }
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_financial_events_category ON financial_events(category)`, (err) => {
        if (err) {
            console.error('Error creating category index:', err);
        } else {
            console.log('Category index created successfully.');
        }
    });
});
