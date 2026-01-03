const db = require('./backend/db');
db.run(`INSERT OR IGNORE INTO patients (id, first_name, last_name, date_of_birth, phone, email) 
        VALUES (1, 'John', 'Doe', '1980-01-01', '555-0100', 'john@example.com')`, [], (err) => {
    if (err) console.error('Error insert patient:', err);
    else console.log('Patient inserted');
});
