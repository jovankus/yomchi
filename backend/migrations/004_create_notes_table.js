const db = require('../db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS clinical_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        appointment_id INTEGER,
        author_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (appointment_id) REFERENCES appointments(id),
        FOREIGN KEY (author_id) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating clinical_notes table:', err);
        } else {
            console.log('Clinical notes table created successfully.');
        }
    });
});
