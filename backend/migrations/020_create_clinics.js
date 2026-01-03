const db = require('../db');
const bcrypt = require('bcryptjs');

async function up() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Create clinics table
            db.run(`
        CREATE TABLE IF NOT EXISTS clinics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `, (err) => {
                if (err) return reject(err);

                // Seed Arjana Clinic with temporary password
                const tempPassword = 'TempClinic123!';
                const hash = bcrypt.hashSync(tempPassword, 10);

                db.run(`
          INSERT OR IGNORE INTO clinics (name, password_hash, active)
          VALUES (?, ?, 1)
        `, ['Arjana Clinic', hash], (err) => {
                    if (err) return reject(err);
                    console.log('Clinics table created and seeded with Arjana Clinic');
                    console.log('Temporary password: TempClinic123! (to be replaced in AUTH-PASS-1)');
                    resolve();
                });
            });
        });
    });
}

module.exports = { up };

if (require.main === module) {
    up().then(() => {
        console.log('Migration complete');
        process.exit(0);
    }).catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}
