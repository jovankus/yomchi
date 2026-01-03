const db = require('../db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS patient_psychiatric_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER UNIQUE NOT NULL,
        psychiatric_history_text TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating patient_psychiatric_profile table:', err);
        } else {
            console.log('patient_psychiatric_profile table created successfully.');
        }
    });
});
