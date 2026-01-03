const db = require('../db');

db.serialize(() => {
    // Add note_type field
    db.run(`ALTER TABLE clinical_notes ADD COLUMN note_type TEXT DEFAULT 'GENERAL'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding note_type column:', err);
        } else {
            console.log('note_type column added successfully or already exists.');
        }
    });

    // Add appointment_id foreign key (optional)
    db.run(`ALTER TABLE clinical_notes ADD COLUMN appointment_id INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding appointment_id column:', err);
        } else {
            console.log('appointment_id column added successfully or already exists.');
        }
    });

    // Add changes_since_last_visit field
    db.run(`ALTER TABLE clinical_notes ADD COLUMN changes_since_last_visit TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding changes_since_last_visit column:', err);
        } else {
            console.log('changes_since_last_visit column added successfully or already exists.');
        }
    });

    // Add medication_adherence_change field
    db.run(`ALTER TABLE clinical_notes ADD COLUMN medication_adherence_change TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding medication_adherence_change column:', err);
        } else {
            console.log('medication_adherence_change column added successfully or already exists.');
        }
    });

    // Add side_effects_change field
    db.run(`ALTER TABLE clinical_notes ADD COLUMN side_effects_change TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding side_effects_change column:', err);
        } else {
            console.log('side_effects_change column added successfully or already exists.');
        }
    });
});
