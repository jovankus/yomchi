const db = require('../db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        clinician_id INTEGER NOT NULL,
        start_at DATETIME NOT NULL,
        end_at DATETIME NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (clinician_id) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating appointments table:', err);
        } else {
            console.log('Appointments table created successfully.');
        }
    });
});
