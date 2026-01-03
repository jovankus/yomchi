const db = require('../db');

db.serialize(() => {
    console.log('Creating doctor_payouts table...');

    db.run(`CREATE TABLE IF NOT EXISTS doctor_payouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payout_date TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        period_start TEXT,
        period_end TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating doctor_payouts table:', err.message);
        } else {
            console.log('✓ doctor_payouts table created');
        }
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_payouts_date ON doctor_payouts(payout_date)`, (err) => {
        if (err) console.error('Error creating index:', err.message);
        else console.log('✓ idx_payouts_date index created');
    });

    console.log('\n✅ Doctor payouts migration complete');
});
