const db = require('../db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS pharmacies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating pharmacies table:', err);
        } else {
            console.log('Pharmacies table created successfully.');
        }
    });
});
