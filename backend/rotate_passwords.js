/**
 * Password Rotation Script for Yomchi Healthcare
 * 
 * This script allows rotating passwords via environment variables OR auto-generating them.
 * Passwords are printed ONCE to console and then only hashes are saved.
 * 
 * Environment Variables (optional - if not set, will auto-generate):
 * - CLINIC_PASSWORD: New password for clinic gate (20+ chars)
 * - SENIOR_DOCTOR_PASSWORD: New password for SENIOR_DOCTOR role (16+ chars)
 * - PERMANENT_DOCTOR_PASSWORD: New password for PERMANENT_DOCTOR role (16+ chars)
 * - DOCTOR_PASSWORD: New password for DOCTOR role (16+ chars)
 * - SECRETARY_PASSWORD: New password for SECRETARY role (16+ chars)
 * 
 * Usage:
 *   node rotate_passwords.js              # Show help
 *   node rotate_passwords.js --generate   # Generate and save strong passwords
 *   node rotate_passwords.js --apply      # Apply passwords from env vars
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

async function runDbQuery(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

async function rotatePasswords() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('       YOMCHI HEALTHCARE - PASSWORD ROTATION UTILITY           ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    const generateMode = process.argv.includes('--generate');
    const applyMode = process.argv.includes('--apply');

    if (!generateMode && !applyMode) {
        console.log('Usage:');
        console.log('  node rotate_passwords.js --generate    Generate and save new passwords');
        console.log('  node rotate_passwords.js --apply       Apply passwords from env vars');
        console.log('');
        console.log('The --generate option will:');
        console.log('  1. Generate strong random passwords');
        console.log('  2. Print them ONCE to console (save them securely!)');
        console.log('  3. Save only the hashes to the database');
        console.log('');
        process.exit(0);
    }

    const passwords = {};

    if (generateMode) {
        // Generate all passwords
        passwords.clinic = generateStrongPassword(24);
        passwords.SENIOR_DOCTOR = generateStrongPassword(20);
        passwords.PERMANENT_DOCTOR = generateStrongPassword(20);
        passwords.DOCTOR = generateStrongPassword(18);
        passwords.SECRETARY = generateStrongPassword(18);
    } else {
        // Use env vars
        passwords.clinic = process.env.CLINIC_PASSWORD;
        passwords.SENIOR_DOCTOR = process.env.SENIOR_DOCTOR_PASSWORD;
        passwords.PERMANENT_DOCTOR = process.env.PERMANENT_DOCTOR_PASSWORD;
        passwords.DOCTOR = process.env.DOCTOR_PASSWORD;
        passwords.SECRETARY = process.env.SECRETARY_PASSWORD;

        // Validate
        let valid = true;
        if (passwords.clinic && !validatePassword(passwords.clinic, 20, 'CLINIC_PASSWORD')) valid = false;
        if (passwords.SENIOR_DOCTOR && !validatePassword(passwords.SENIOR_DOCTOR, 16, 'SENIOR_DOCTOR_PASSWORD')) valid = false;
        if (passwords.PERMANENT_DOCTOR && !validatePassword(passwords.PERMANENT_DOCTOR, 16, 'PERMANENT_DOCTOR_PASSWORD')) valid = false;
        if (passwords.DOCTOR && !validatePassword(passwords.DOCTOR, 16, 'DOCTOR_PASSWORD')) valid = false;
        if (passwords.SECRETARY && !validatePassword(passwords.SECRETARY, 16, 'SECRETARY_PASSWORD')) valid = false;

        if (!valid) process.exit(1);

        const hasAny = Object.values(passwords).some(p => p);
        if (!hasAny) {
            console.log('No password environment variables set.');
            console.log('Use --generate to auto-generate passwords.');
            process.exit(0);
        }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   ⚠️  SAVE THESE PASSWORDS - THEY ARE SHOWN ONLY ONCE!  ⚠️   ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    // Update clinic password
    if (passwords.clinic) {
        console.log(`📋 CLINIC: Yomchi Healthcare`);
        console.log(`   Password: ${passwords.clinic}`);
        console.log('');

        const hash = bcrypt.hashSync(passwords.clinic, 12);
        // Try updating with new name first, then old name as fallback
        let changes = await runDbQuery(
            'UPDATE clinics SET password_hash = ? WHERE name = ?',
            [hash, 'Yomchi Healthcare']
        );
        if (changes === 0) {
            changes = await runDbQuery(
                'UPDATE clinics SET password_hash = ? WHERE name = ?',
                [hash, 'Arjana Clinic']
            );
        }
        console.log(`   ✅ Clinic password updated (${changes} row(s))`);
        console.log('');
    }

    // Update role passwords in clinic_roles table
    const roles = ['SENIOR_DOCTOR', 'PERMANENT_DOCTOR', 'DOCTOR', 'SECRETARY'];
    for (const role of roles) {
        if (passwords[role]) {
            const displayRole = role.replace('_', ' ');
            console.log(`📋 ${displayRole}`);
            console.log(`   Password: ${passwords[role]}`);

            const hash = bcrypt.hashSync(passwords[role], 12);
            const changes = await runDbQuery(
                'UPDATE clinic_roles SET password_hash = ? WHERE role = ?',
                [hash, role]
            );
            console.log(`   ✅ ${role} password updated (${changes} row(s))`);
            console.log('');
        }
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Password rotation complete.');
    console.log('Only bcrypt hashes have been saved to the database.');
    console.log('COPY THE PASSWORDS ABOVE AND STORE THEM SECURELY!');
    console.log('═══════════════════════════════════════════════════════════════');

    process.exit(0);
}

rotatePasswords().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
