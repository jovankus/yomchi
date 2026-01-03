const db = require('../db');

db.serialize(() => {
    // Add has_asd column to patients table
    db.run(`ALTER TABLE patients ADD COLUMN has_asd INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding has_asd column:', err);
        } else {
            console.log('has_asd column added successfully or already exists.');
        }
    });

    // Create patient_asd_profile table
    db.run(`CREATE TABLE IF NOT EXISTS patient_asd_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER UNIQUE NOT NULL,
        diagnosed INTEGER DEFAULT 0,
        diagnosis_source TEXT,
        severity_level TEXT,
        language_level TEXT,
        notes TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER,
        
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating patient_asd_profile table:', err);
        } else {
            console.log('patient_asd_profile table created successfully.');
        }
    });
});
