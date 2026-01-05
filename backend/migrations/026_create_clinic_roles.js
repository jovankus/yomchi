/**
 * Migration: Create clinic_roles table for role-based authentication
 * 
 * This replaces individual employee logins with role-level passwords.
 * Each clinic has passwords for each role (SENIOR_DOCTOR, PERMANENT_DOCTOR, DOCTOR, SECRETARY)
 */
const db = require('../db');
const bcrypt = require('bcryptjs');

async function up() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Create clinic_roles table
            db.run(`
                CREATE TABLE IF NOT EXISTS clinic_roles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    clinic_id INTEGER NOT NULL,
                    role TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    active INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (clinic_id) REFERENCES clinics(id),
                    UNIQUE(clinic_id, role)
                )
            `, (err) => {
                if (err) return reject(err);

                // Get Yomchi Healthcare clinic ID
                db.get('SELECT id FROM clinics WHERE name = ?', ['Yomchi Healthcare'], (err, clinic) => {
                    if (err) return reject(err);
                    if (!clinic) {
                        console.log('No clinic found named "Yomchi Healthcare". Checking for Arjana Clinic...');
                        db.get('SELECT id FROM clinics LIMIT 1', [], (err, anyClinic) => {
                            if (err) return reject(err);
                            if (!anyClinic) return reject(new Error('No clinics found in database'));
                            seedRoles(anyClinic.id, resolve, reject);
                        });
                        return;
                    }
                    seedRoles(clinic.id, resolve, reject);
                });
            });
        });
    });
}

function seedRoles(clinicId, resolve, reject) {
    // Temporary password - will be replaced in AUTH-PASS-1
    const tempPassword = 'TempRole123!';
    const hash = bcrypt.hashSync(tempPassword, 10);

    const roles = ['SENIOR_DOCTOR', 'PERMANENT_DOCTOR', 'DOCTOR', 'SECRETARY'];
    let completed = 0;

    roles.forEach(role => {
        db.run(`
            INSERT OR IGNORE INTO clinic_roles (clinic_id, role, password_hash, active)
            VALUES (?, ?, ?, 1)
        `, [clinicId, role, hash], (err) => {
            if (err) return reject(err);
            completed++;
            if (completed === roles.length) {
                console.log('clinic_roles table created and seeded');
                console.log('Temporary password for all roles: TempRole123!');
                console.log('Roles:', roles.join(', '));
                resolve();
            }
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
