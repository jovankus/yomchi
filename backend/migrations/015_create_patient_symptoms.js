const db = require('../db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS patient_symptoms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER UNIQUE NOT NULL,
        
        -- Symptom boolean flags
        depression INTEGER DEFAULT 0,
        anxiety INTEGER DEFAULT 0,
        panic INTEGER DEFAULT 0,
        ptsd INTEGER DEFAULT 0,
        ocd INTEGER DEFAULT 0,
        psychosis INTEGER DEFAULT 0,
        mania INTEGER DEFAULT 0,
        substance_use INTEGER DEFAULT 0,
        sleep_problem INTEGER DEFAULT 0,
        suicidal_ideation INTEGER DEFAULT 0,
        self_harm INTEGER DEFAULT 0,
        irritability INTEGER DEFAULT 0,
        attention_problem INTEGER DEFAULT 0,
        
        -- Clinical notes
        notes TEXT,
        
        -- Audit fields
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER,
        
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating patient_symptoms table:', err);
        } else {
            console.log('patient_symptoms table created successfully.');
        }
    });
});
