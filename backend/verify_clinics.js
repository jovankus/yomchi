const db = require('./db');
db.all('SELECT id, name, active, created_at FROM clinics', (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Clinics in database:');
        console.table(rows);
    }
    process.exit(0);
});
