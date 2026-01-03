const db = require('./backend/db');
db.run('DELETE FROM appointments', [], (err) => {
    if (err) console.error(err);
    else console.log('Appointments cleared');
});
