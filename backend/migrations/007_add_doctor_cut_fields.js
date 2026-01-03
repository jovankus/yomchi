const db = require('../db');

db.serialize(() => {
    // Add doctor_cut_percent column (nullable, 10-20%)
    db.run(`ALTER TABLE appointments ADD COLUMN doctor_cut_percent REAL`, (err) => {
        if (err) {
            console.error('Error adding doctor_cut_percent column:', err);
        } else {
            console.log('doctor_cut_percent column added successfully.');
        }
    });

    // Add doctor_involved column (boolean, default true)
    db.run(`ALTER TABLE appointments ADD COLUMN doctor_involved INTEGER DEFAULT 1`, (err) => {
        if (err) {
            console.error('Error adding doctor_involved column:', err);
        } else {
            console.log('doctor_involved column added successfully.');
        }
    });
});
