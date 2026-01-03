const db = require('../db');

db.serialize(() => {
    db.run(`ALTER TABLE patients ADD COLUMN place_of_living TEXT`, (err) => {
        if (err) {
            console.error('Error adding place_of_living column:', err);
        } else {
            console.log('Added place_of_living column to patients table.');
        }
    });

    db.run(`ALTER TABLE patients ADD COLUMN education_level TEXT`, (err) => {
        if (err) {
            console.error('Error adding education_level column:', err);
        } else {
            console.log('Added education_level column to patients table.');
        }
    });

    db.run(`ALTER TABLE patients ADD COLUMN marital_status TEXT`, (err) => {
        if (err) {
            console.error('Error adding marital_status column:', err);
        } else {
            console.log('Added marital_status column to patients table.');
        }
    });

    db.run(`ALTER TABLE patients ADD COLUMN occupation TEXT`, (err) => {
        if (err) {
            console.error('Error adding occupation column:', err);
        } else {
            console.log('Added occupation column to patients table.');
        }
    });

    db.run(`ALTER TABLE patients ADD COLUMN living_with TEXT`, (err) => {
        if (err) {
            console.error('Error adding living_with column:', err);
        } else {
            console.log('Added living_with column to patients table.');
        }
    });
});
