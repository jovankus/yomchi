const db = require('../db');
const bcrypt = require('bcryptjs');

async function up() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Create employees table
            db.run(`
        CREATE TABLE IF NOT EXISTS employees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          clinic_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          role TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (clinic_id) REFERENCES clinics(id),
          UNIQUE(clinic_id, username)
        )
      `, (err) => {
                if (err) return reject(err);

                // Get Arjana Clinic ID
                db.get('SELECT id FROM clinics WHERE name = ?', ['Arjana Clinic'], (err, clinic) => {
                    if (err) return reject(err);
                    if (!clinic) return reject(new Error('Arjana Clinic not found. Run 020_create_clinics.js first.'));

                    const clinicId = clinic.id;
                    const tempPassword = 'TempEmployee123!';
                    const hash = bcrypt.hashSync(tempPassword, 10);

                    const employees = [
                        { username: 'senior_doctor', role: 'SENIOR_DOCTOR' },
                        { username: 'permanent_doctor', role: 'PERMANENT_DOCTOR' },
                        { username: 'doctor', role: 'DOCTOR' },
                        { username: 'secretary', role: 'SECRETARY' }
                    ];

                    let completed = 0;
                    employees.forEach(emp => {
                        db.run(`
              INSERT OR IGNORE INTO employees (clinic_id, username, role, password_hash, active)
              VALUES (?, ?, ?, ?, 1)
            `, [clinicId, emp.username, emp.role, hash], (err) => {
                            if (err) return reject(err);
                            completed++;
                            if (completed === employees.length) {
                                console.log('Employees table created and seeded with demo employees');
                                console.log('Temporary password for all employees: TempEmployee123!');
                                console.log('Employees:', employees.map(e => e.username).join(', '));
                                resolve();
                            }
                        });
                    });
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
