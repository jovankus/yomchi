const db = require('./backend/db');

db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='patient_psychiatric_profile'", [], (err, row) => {
    if (err) {
        console.error('Error:', err);
    } else if (row) {
        console.log('Table exists with schema:');
        console.log(row.sql);
    } else {
        console.log('Table does not exist');
    }

    // Also check if any data exists
    db.get("SELECT COUNT(*) as count FROM patient_psychiatric_profile", [], (err, row) => {
        if (err) {
            console.error('Error counting rows:', err);
        } else {
            console.log(`\nNumber of rows: ${row.count}`);
        }
        db.close();
    });
});
