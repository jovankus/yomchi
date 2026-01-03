const db = require('./db');

// Delete test appointments from future dates used in tests
db.run(`DELETE FROM appointments WHERE start_at LIKE '2025-12-30%' OR start_at LIKE '2025-12-31%' OR start_at LIKE '2026-01-04%'`, function (err) {
    if (err) {
        console.log('Error:', err);
    } else {
        console.log('Cleaned up', this.changes, 'test appointments');
    }

    // Also clean up test patients
    db.run(`DELETE FROM patients WHERE first_name IN ('AutoCut', 'OnlineTest')`, function (err2) {
        if (err2) {
            console.log('Error cleaning patients:', err2);
        } else {
            console.log('Cleaned up', this.changes, 'test patients');
        }
        process.exit(0);
    });
});
