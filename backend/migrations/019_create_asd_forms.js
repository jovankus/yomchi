const db = require('../db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS patient_asd_forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        form_version TEXT DEFAULT 'v1',
        responses_json TEXT NOT NULL,
        summary_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating patient_asd_forms table:', err);
        } else {
            console.log('patient_asd_forms table created successfully.');
        }
    });
});
