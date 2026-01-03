/**
 * Password Rotation Script with Environment Variable Support
 * 
 * This script allows rotating passwords via environment variables.
 * Passwords are NEVER logged or stored in plaintext - only hashes are saved.
 * 
 * Environment Variables:
 * - CLINIC_PASSWORD: New password for clinic gate (20+ chars recommended)
 * - SENIOR_DOCTOR_PASSWORD: New password for senior_doctor
 * - PERMANENT_DOCTOR_PASSWORD: New password for permanent_doctor
 * - DOCTOR_PASSWORD: New password for doctor
 * - SECRETARY_PASSWORD: New password for secretary
 * 
 * Usage:
 *   set CLINIC_PASSWORD=YourNewStrongPassword && node rotate_passwords.js
 * 
 * Or for all at once:
 *   set CLINIC_PASSWORD=... && set SENIOR_DOCTOR_PASSWORD=... && node rotate_passwords.js
 */

require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Generate a strong random password
function generateStrongPassword(length = 20) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        password += chars[randomBytes[i] % chars.length];
    }
    return password;
}

// Validate password strength
function validatePassword(password, minLength, label) {
    if (!password || password.length < minLength) {
        console.error(`❌ ${label} must be at least ${minLength} characters`);
        return false;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
        console.error(`❌ ${label} must contain uppercase, lowercase, digits, and symbols`);
        return false;
    }

    return true;
}

async function rotatePasswords() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                 PASSWORD ROTATION UTILITY                      ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    const updates = [];

    // Check for clinic password update
    const clinicPassword = process.env.CLINIC_PASSWORD;
    if (clinicPassword) {
        if (!validatePassword(clinicPassword, 20, 'CLINIC_PASSWORD')) {
            process.exit(1);
        }

        const hash = bcrypt.hashSync(clinicPassword, 12);
        updates.push({
            type: 'clinic',
            name: 'Arjana Clinic',
            hash
        });
    }

    // Check for employee password updates
    const employeeEnvs = [
        { env: 'SENIOR_DOCTOR_PASSWORD', username: 'senior_doctor', minLength: 16 },
        { env: 'PERMANENT_DOCTOR_PASSWORD', username: 'permanent_doctor', minLength: 16 },
        { env: 'DOCTOR_PASSWORD', username: 'doctor', minLength: 16 },
        { env: 'SECRETARY_PASSWORD', username: 'secretary', minLength: 16 }
    ];

    for (const emp of employeeEnvs) {
        const password = process.env[emp.env];
        if (password) {
            if (!validatePassword(password, emp.minLength, emp.env)) {
                process.exit(1);
            }

            const hash = bcrypt.hashSync(password, 12);
            updates.push({
                type: 'employee',
                username: emp.username,
                hash
            });
        }
    }

    if (updates.length === 0) {
        console.log('No password environment variables detected.');
        console.log('');
        console.log('To rotate passwords, set environment variables:');
        console.log('  CLINIC_PASSWORD=<20+ char strong password>');
        console.log('  SENIOR_DOCTOR_PASSWORD=<16+ char strong password>');
        console.log('  PERMANENT_DOCTOR_PASSWORD=<16+ char strong password>');
        console.log('  DOCTOR_PASSWORD=<16+ char strong password>');
        console.log('  SECRETARY_PASSWORD=<16+ char strong password>');
        console.log('');
        console.log('Example:');
        console.log('  set CLINIC_PASSWORD=MyStr0ng!P@ssw0rd#2024 && node rotate_passwords.js');

        // Option to generate passwords
        if (process.argv.includes('--generate')) {
            console.log('');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('           GENERATED STRONG PASSWORDS (copy securely!)         ');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('');
            console.log('⚠️  SAVE THESE PASSWORDS SECURELY - THEY ARE SHOWN ONLY ONCE!');
            console.log('');
            console.log(`Clinic (20 chars):           ${generateStrongPassword(20)}`);
            console.log(`Senior Doctor (16 chars):    ${generateStrongPassword(16)}`);
            console.log(`Permanent Doctor (16 chars): ${generateStrongPassword(16)}`);
            console.log(`Doctor (16 chars):           ${generateStrongPassword(16)}`);
            console.log(`Secretary (16 chars):        ${generateStrongPassword(16)}`);
            console.log('');
        } else {
            console.log('');
            console.log('Tip: Run with --generate to create strong random passwords:');
            console.log('  node rotate_passwords.js --generate');
        }

        process.exit(0);
    }

    // Process updates
    console.log(`Processing ${updates.length} password update(s)...`);
    console.log('');

    for (const update of updates) {
        await new Promise((resolve, reject) => {
            if (update.type === 'clinic') {
                db.run(
                    'UPDATE clinics SET password_hash = ? WHERE name = ?',
                    [update.hash, update.name],
                    function (err) {
                        if (err) reject(err);
                        else {
                            console.log(`✅ ${update.name} password updated (hash stored)`);
                            resolve();
                        }
                    }
                );
            } else {
                db.run(
                    'UPDATE employees SET password_hash = ? WHERE username = ?',
                    [update.hash, update.username],
                    function (err) {
                        if (err) reject(err);
                        else {
                            console.log(`✅ ${update.username} password updated (hash stored)`);
                            resolve();
                        }
                    }
                );
            }
        });
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Password rotation complete. Only bcrypt hashes have been stored.');
    console.log('The original passwords were NOT logged or saved anywhere.');
    console.log('═══════════════════════════════════════════════════════════════');

    process.exit(0);
}

rotatePasswords().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
