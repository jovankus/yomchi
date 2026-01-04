/**
 * Seed Production Database with Initial Data
 * Run with: node migrations/postgres/seed.js
 * Requires DATABASE_URL environment variable
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') || DATABASE_URL.includes('pooler')
        ? { rejectUnauthorized: false }
        : false
});

async function seed() {
    console.log('Seeding production database...\n');

    try {
        // Hash passwords
        const clinicPasswordHash = await bcrypt.hash('Kx9#mP2$vL7!qR4@', 10);

        const employeePasswords = {
            senior_doctor: await bcrypt.hash('Nv3@wQ8#hT6!yU9$', 10),
            permanent_doctor: await bcrypt.hash('Bm7$rK4@jX2#fW5!', 10),
            doctor: await bcrypt.hash('Zp6!cN9@dL3#sY8$', 10),
            secretary: await bcrypt.hash('Hg2#tV5!mR8@kJ4$', 10)
        };

        // 1. Create clinic
        console.log('Creating clinic...');
        const clinicResult = await pool.query(`
            INSERT INTO clinics (name, code, password_hash, address, phone, active)
            VALUES ($1, $2, $3, $4, $5, 1)
            ON CONFLICT (code) DO UPDATE SET password_hash = $3
            RETURNING id
        `, ['Arjana Clinic', 'arjana-clinic', clinicPasswordHash, 'Iraq', '']);

        const clinicId = clinicResult.rows[0].id;
        console.log(`✓ Clinic created with ID: ${clinicId}`);

        // 2. Create users
        console.log('\nCreating users...');
        const users = [
            { username: 'senior_doctor', role: 'admin', password: employeePasswords.senior_doctor },
            { username: 'permanent_doctor', role: 'doctor', password: employeePasswords.permanent_doctor },
            { username: 'doctor', role: 'doctor', password: employeePasswords.doctor },
            { username: 'secretary', role: 'staff', password: employeePasswords.secretary }
        ];

        for (const user of users) {
            const userResult = await pool.query(`
                INSERT INTO users (username, password_hash, role)
                VALUES ($1, $2, $3)
                ON CONFLICT (username) DO UPDATE SET password_hash = $2, role = $3
                RETURNING id
            `, [user.username, user.password, user.role]);

            const userId = userResult.rows[0].id;
            console.log(`✓ User created: ${user.username} (${user.role}) - ID: ${userId}`);

            // 3. Link user to clinic as employee
            await pool.query(`
                INSERT INTO employees (clinic_id, user_id, role, active)
                VALUES ($1, $2, $3, 1)
                ON CONFLICT (clinic_id, user_id) DO UPDATE SET role = $3, active = 1
            `, [clinicId, userId, user.role]);
            console.log(`  → Linked to clinic as employee`);
        }

        console.log('\n✓ Database seeded successfully!');
        console.log('\n--- Login Credentials ---');
        console.log('Clinic: Arjana Clinic');
        console.log('Password: Kx9#mP2$vL7!qR4@');
        console.log('\nEmployees:');
        console.log('  senior_doctor / Nv3@wQ8#hT6!yU9$');
        console.log('  permanent_doctor / Bm7$rK4@jX2#fW5!');
        console.log('  doctor / Zp6!cN9@dL3#sY8$');
        console.log('  secretary / Hg2#tV5!mR8@kJ4$');

    } catch (err) {
        console.error('Seed error:', err);
    } finally {
        await pool.end();
    }
}

seed();
