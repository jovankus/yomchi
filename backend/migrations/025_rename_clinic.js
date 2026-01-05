/**
 * Database Migration: Rename Arjana Clinic to Yomchi Healthcare
 */
const db = require('../db');

async function up() {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE clinics SET name = 'Yomchi Healthcare' WHERE name = 'Arjana Clinic'`,
            function (err) {
                if (err) return reject(err);
                if (this.changes > 0) {
                    console.log('Renamed clinic from "Arjana Clinic" to "Yomchi Healthcare"');
                } else {
                    console.log('No clinic named "Arjana Clinic" found, or already renamed');
                }
                resolve();
            }
        );
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
