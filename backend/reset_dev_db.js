/**
 * Development Database Reset Script
 * 
 * This script will:
 * 1. Delete the existing database
 * 2. Run all migrations
 * 3. Seed sample data for testing
 * 
 * Usage: node backend/reset_dev_db.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const SESSIONS_DB_PATH = path.join(__dirname, 'sessions.db');

console.log('╔════════════════════════════════════════╗');
console.log('║   PracticeClone Dev Database Reset     ║');
console.log('╚════════════════════════════════════════╝\n');

// Step 1: Delete existing databases
console.log('Step 1: Removing existing databases...');
try {
    if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
        console.log('  ✓ Deleted database.sqlite');
    } else {
        console.log('  ○ database.sqlite not found (clean start)');
    }

    if (fs.existsSync(SESSIONS_DB_PATH)) {
        fs.unlinkSync(SESSIONS_DB_PATH);
        console.log('  ✓ Deleted sessions.db');
    }
} catch (err) {
    console.error('  ✗ Error deleting databases:', err.message);
    process.exit(1);
}

// Step 2: Run all migrations
console.log('\nStep 2: Running migrations...');
const migrationsDir = path.join(__dirname, 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js') && f !== 'migrate.js' && f !== 'seed_admin.js')
    .sort();

for (const file of migrationFiles) {
    try {
        console.log(`  Running ${file}...`);
        require(path.join(migrationsDir, file));
    } catch (err) {
        console.error(`  ✗ Error in ${file}:`, err.message);
    }
}

// Allow time for async operations
setTimeout(() => {
    console.log('\nStep 3: Seeding admin user...');
    try {
        require(path.join(migrationsDir, 'seed_admin.js'));
        console.log('  ✓ Admin user seeded');
    } catch (err) {
        console.error('  ✗ Error seeding admin:', err.message);
    }

    // Seed sample data
    setTimeout(() => {
        console.log('\nStep 4: Seeding sample data...');
        seedSampleData();
    }, 1000);
}, 2000);

function seedSampleData() {
    const db = require('./db');

    // Sample pharmacies
    db.run(`INSERT INTO pharmacies (name, address, phone, active) VALUES 
        ('Main Clinic Pharmacy', 'Building A, Ground Floor', '07701234567', 1),
        ('North Branch Pharmacy', 'North Medical Center', '07709876543', 1)`);
    console.log('  ✓ Sample pharmacies created');

    // Sample suppliers
    db.run(`INSERT INTO suppliers (name, contact_name, phone, email, address, active) VALUES 
        ('MedPharm Distributors', 'Ahmad Hassan', '07701112233', 'orders@medpharm.iq', 'Industrial Zone, Baghdad', 1),
        ('Global Pharma', 'Sara Ali', '07704445566', 'sales@globalpharma.iq', 'Commercial District, Erbil', 1)`);
    console.log('  ✓ Sample suppliers created');

    // Sample inventory items
    db.run(`INSERT INTO inventory_items (generic_name, brand_name, manufacturer, form, strength_mg, strength_unit, pack_size, reorder_level, active) VALUES 
        ('Paracetamol', 'Panadol', 'GSK', 'Tablet', 500, 'mg', 20, 100, 1),
        ('Amoxicillin', 'Amoxil', 'Pfizer', 'Capsule', 500, 'mg', 21, 50, 1),
        ('Omeprazole', 'Losec', 'AstraZeneca', 'Capsule', 20, 'mg', 28, 30, 1),
        ('Sertraline', 'Zoloft', 'Pfizer', 'Tablet', 50, 'mg', 30, 20, 1),
        ('Risperidone', 'Risperdal', 'Janssen', 'Tablet', 2, 'mg', 30, 15, 1)`);
    console.log('  ✓ Sample inventory items created');

    // Sample patients
    db.run(`INSERT INTO patients (first_name, last_name, date_of_birth, phone, gender, referral_source) VALUES 
        ('Ahmad', 'Al-Rashid', '1985-03-15', '07701234001', 'male', 'doctor_referral'),
        ('Fatima', 'Hassan', '1992-07-22', '07701234002', 'female', 'self'),
        ('Mohammed', 'Ibrahim', '1978-11-08', '07701234003', 'male', 'hospital'),
        ('Zainab', 'Ali', '2015-05-30', '07701234004', 'female', 'school')`);
    console.log('  ✓ Sample patients created');

    setTimeout(() => {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║   Database Reset Complete!             ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('\nYou can now start the backend with: npm start');
        console.log('Default login: admin / admin123\n');
        process.exit(0);
    }, 1000);
}
