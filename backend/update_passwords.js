const db = require('./db');
const bcrypt = require('bcryptjs');

// Random unguessable passwords - no hints about roles
const CLINIC_PASSWORD = 'Kx9#mP2$vL7!qR4@';
const EMPLOYEE_PASSWORDS = {
    senior_doctor: 'Nv3@wQ8#hT6!yU9$',
    permanent_doctor: 'Bm7$rK4@jX2#fW5!',
    doctor: 'Zp6!cN9@dL3#sY8$',
    secretary: 'Hg2#tV5!mR8@kJ4$'
};

async function updatePasswords() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Update clinic password
            const clinicHash = bcrypt.hashSync(CLINIC_PASSWORD, 12);
            db.run('UPDATE clinics SET password_hash = ? WHERE name = ?',
                [clinicHash, 'Arjana Clinic'],
                function (err) {
                    if (err) return reject(err);
                    console.log(`Updated Arjana Clinic password to: ${CLINIC_PASSWORD}`);
                }
            );

            // Update employee passwords
            let completed = 0;
            const total = Object.keys(EMPLOYEE_PASSWORDS).length;

            for (const [username, password] of Object.entries(EMPLOYEE_PASSWORDS)) {
                const hash = bcrypt.hashSync(password, 12);
                db.run('UPDATE employees SET password_hash = ? WHERE username = ?',
                    [hash, username],
                    function (err) {
                        if (err) return reject(err);
                        console.log(`Updated ${username} password to: ${password}`);
                        completed++;
                        if (completed === total) {
                            resolve();
                        }
                    }
                );
            }
        });
    });
}

updatePasswords().then(() => {
    console.log('\n✅ All passwords updated successfully!');
    console.log('\n--- CREDENTIALS ---');
    console.log('Clinic: Arjana Clinic');
    console.log(`Password: ${CLINIC_PASSWORD}`);
    console.log('\nEmployees:');
    for (const [user, pass] of Object.entries(EMPLOYEE_PASSWORDS)) {
        console.log(`  ${user}: ${pass}`);
    }
    process.exit(0);
}).catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
