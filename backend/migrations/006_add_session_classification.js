const db = require('../db');

db.serialize(() => {
    // Add session_type column
    db.run(`ALTER TABLE appointments ADD COLUMN session_type TEXT CHECK(session_type IN ('IN_CLINIC', 'ONLINE'))`, (err) => {
        if (err) {
            console.error('Error adding session_type column:', err);
        } else {
            console.log('session_type column added successfully.');
        }
    });

    // Add payment_status column
    db.run(`ALTER TABLE appointments ADD COLUMN payment_status TEXT CHECK(payment_status IN ('PAID', 'UNPAID', 'FREE_RETURN'))`, (err) => {
        if (err) {
            console.error('Error adding payment_status column:', err);
        } else {
            console.log('payment_status column added successfully.');
        }
    });

    // Add free_return_reason column (nullable)
    db.run(`ALTER TABLE appointments ADD COLUMN free_return_reason TEXT`, (err) => {
        if (err) {
            console.error('Error adding free_return_reason column:', err);
        } else {
            console.log('free_return_reason column added successfully.');
        }
    });
});
