/**
 * Migration: Add doctor_involvement_mode column to appointments table
 * Values: 'AUTO' (default), '20', '10', 'NOT_INVOLVED'
 */
const db = require('../db');

async function up() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Add doctor_involvement_mode column
            db.run(`ALTER TABLE appointments ADD COLUMN doctor_involvement_mode TEXT DEFAULT 'AUTO'`, (err) => {
                if (err) {
                    // Column may already exist
                    if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
                        console.log('doctor_involvement_mode column already exists, skipping.');
                    } else {
                        console.error('Error adding doctor_involvement_mode column:', err);
                        return reject(err);
                    }
                } else {
                    console.log('doctor_involvement_mode column added successfully.');
                }

                // Backfill existing rows: if doctor_involved = 0, set to NOT_INVOLVED
                db.run(`UPDATE appointments SET doctor_involvement_mode = 'NOT_INVOLVED' WHERE doctor_involved = 0`, (err) => {
                    if (err) {
                        console.error('Error backfilling doctor_involvement_mode:', err);
                        return reject(err);
                    }
                    console.log('Backfilled doctor_involvement_mode for existing rows.');
                    resolve();
                });
            });
        });
    });
}

module.exports = { up };

if (require.main === module) {
    up().then(() => {
        console.log('Migration 030 complete');
        process.exit(0);
    }).catch(err => {
        console.error('Migration 030 failed:', err);
        process.exit(1);
    });
}
