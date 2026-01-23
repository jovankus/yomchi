/**
 * PostgreSQL Migration Script for Yomchi
 * Run with: npm run migrate:pg
 * Requires DATABASE_URL environment variable
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase')
        ? { rejectUnauthorized: false }
        : false
});

const migrations = [
    // 001 - Users table
    `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 002 - Patients table
    `CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        place_of_living TEXT,
        education_level TEXT,
        marital_status TEXT,
        occupation TEXT,
        living_with TEXT,
        has_asd INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 003 - Appointments table
    `CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        clinician_id INTEGER REFERENCES users(id),
        start_at TEXT NOT NULL,
        end_at TEXT,
        status TEXT DEFAULT 'SCHEDULED',
        session_type TEXT DEFAULT 'IN_CLINIC',
        payment_status TEXT DEFAULT 'PENDING',
        free_return_reason TEXT,
        doctor_cut_percent REAL,
        doctor_involved INTEGER DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 004 - Clinical Notes table
    `CREATE TABLE IF NOT EXISTS clinical_notes (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        author_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        note_type TEXT DEFAULT 'PROGRESS',
        follow_up_date TEXT,
        follow_up_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 005 - Financial Events table
    `CREATE TABLE IF NOT EXISTS financial_events (
        id SERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT,
        description TEXT,
        related_appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
        reference_type TEXT,
        reference_id INTEGER,
        event_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 005b - Pharmacies table
    `CREATE TABLE IF NOT EXISTS pharmacies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 006 - Inventory Items table
    `CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        description TEXT,
        unit TEXT DEFAULT 'unit',
        reorder_level INTEGER DEFAULT 10,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 007 - Suppliers table
    `CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        contact_name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 008 - Inventory Batches table
    `CREATE TABLE IF NOT EXISTS inventory_batches (
        id SERIAL PRIMARY KEY,
        item_id INTEGER REFERENCES inventory_items(id),
        pharmacy_id INTEGER REFERENCES pharmacies(id),
        supplier_id INTEGER REFERENCES suppliers(id),
        batch_number TEXT,
        quantity INTEGER NOT NULL,
        remaining_quantity INTEGER NOT NULL,
        unit_cost REAL,
        expiry_date TEXT,
        received_date TEXT DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 009 - Stock Movements table
    `CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER REFERENCES inventory_batches(id),
        movement_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        patient_id INTEGER REFERENCES patients(id),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 011 - Integrations table
    `CREATE TABLE IF NOT EXISTS integrations (
        id SERIAL PRIMARY KEY,
        integration_type TEXT NOT NULL,
        name TEXT NOT NULL,
        config TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 012 - Integration Events table
    `CREATE TABLE IF NOT EXISTS integration_events (
        id SERIAL PRIMARY KEY,
        integration_id INTEGER REFERENCES integrations(id),
        event_type TEXT NOT NULL,
        payload TEXT,
        status TEXT DEFAULT 'PENDING',
        response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 014 - Psychiatric Profile table
    `CREATE TABLE IF NOT EXISTS patient_psychiatric_profile (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER UNIQUE REFERENCES patients(id),
        chief_complaint TEXT,
        history_of_present_illness TEXT,
        past_psychiatric_history TEXT,
        past_medical_history TEXT,
        family_history TEXT,
        social_history TEXT,
        mental_status_exam TEXT,
        assessment TEXT,
        plan TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES users(id)
    )`,

    // 015 - Patient Symptoms table
    `CREATE TABLE IF NOT EXISTS patient_symptoms (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        symptom_name TEXT NOT NULL,
        severity TEXT,
        onset_date TEXT,
        notes TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 016 - Patient Documents table
    `CREATE TABLE IF NOT EXISTS patient_documents (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        doc_type TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT,
        mime_type TEXT,
        file_path TEXT NOT NULL,
        notes TEXT,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 018 - ASD Profile table
    `CREATE TABLE IF NOT EXISTS patient_asd_profile (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER UNIQUE REFERENCES patients(id),
        diagnosed INTEGER DEFAULT 0,
        diagnosis_source TEXT,
        severity_level TEXT,
        language_level TEXT,
        notes TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES users(id)
    )`,

    // 019 - ASD Forms table
    `CREATE TABLE IF NOT EXISTS patient_asd_forms (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        form_type TEXT NOT NULL,
        form_data TEXT,
        score REAL,
        administered_by INTEGER REFERENCES users(id),
        administered_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 020 - Clinics table
    `CREATE TABLE IF NOT EXISTS clinics (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 021 - Employees table
    `CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER REFERENCES clinics(id),
        user_id INTEGER REFERENCES users(id),
        role TEXT DEFAULT 'staff',
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(clinic_id, user_id)
    )`,

    // 024 - Doctor Payouts table
    `CREATE TABLE IF NOT EXISTS doctor_payouts (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES users(id),
        month TEXT NOT NULL,
        amount REAL NOT NULL,
        notes TEXT,
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
    )`,

    // 026 - Clinic Roles table (for role-based authentication)
    `CREATE TABLE IF NOT EXISTS clinic_roles (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL REFERENCES clinics(id),
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(clinic_id, role)
    )`,

    // 027 - Device Sessions table (for Remember Me functionality)
    `CREATE TABLE IF NOT EXISTS device_sessions (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL REFERENCES clinics(id),
        role TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        device_name TEXT,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Migrations tracking table
    `CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
];

// Alter table migrations for fixing existing tables
const alterMigrations = [
    // Add clinician_id to appointments if it doesn't exist
    {
        name: 'add_clinician_id_to_appointments',
        sql: `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinician_id INTEGER REFERENCES users(id)`
    },
    // Add reference_type to financial_events if it doesn't exist
    {
        name: 'add_reference_type_to_financial_events',
        sql: `ALTER TABLE financial_events ADD COLUMN IF NOT EXISTS reference_type TEXT`
    },
    // Add reference_id to financial_events if it doesn't exist
    {
        name: 'add_reference_id_to_financial_events',
        sql: `ALTER TABLE financial_events ADD COLUMN IF NOT EXISTS reference_id INTEGER`
    },
    // Fix foreign key constraint on related_appointment_id to allow cascade delete
    {
        name: 'fix_related_appointment_id_cascade',
        sql: `
            DO $$ 
            BEGIN
                -- Drop existing constraint if it exists
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'financial_events_related_appointment_id_fkey' 
                    AND table_name = 'financial_events'
                ) THEN
                    ALTER TABLE financial_events 
                    DROP CONSTRAINT financial_events_related_appointment_id_fkey;
                END IF;
                
                -- Recreate with ON DELETE CASCADE
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'financial_events_related_appointment_id_fkey_cascade' 
                    AND table_name = 'financial_events'
                ) THEN
                    ALTER TABLE financial_events 
                    ADD CONSTRAINT financial_events_related_appointment_id_fkey_cascade 
                    FOREIGN KEY (related_appointment_id) 
                    REFERENCES appointments(id) ON DELETE CASCADE;
                END IF;
            END $$;
        `
    },
    // Add uploaded_at column to patient_documents if it doesn't exist
    {
        name: 'add_uploaded_at_to_patient_documents',
        sql: `ALTER TABLE patient_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
    },
    // Add doc_date column to patient_documents if it doesn't exist
    {
        name: 'add_doc_date_to_patient_documents',
        sql: `ALTER TABLE patient_documents ADD COLUMN IF NOT EXISTS doc_date DATE`
    }
];

async function runMigrations() {
    console.log('Running PostgreSQL migrations...\n');

    try {
        // Create tables
        for (let i = 0; i < migrations.length; i++) {
            const sql = migrations[i];
            const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || `migration_${i}`;

            try {
                await pool.query(sql);
                console.log(`✓ Created table: ${tableName}`);
            } catch (err) {
                if (err.code === '42P07') {
                    // Table already exists
                    console.log(`- Table exists: ${tableName}`);
                } else {
                    console.error(`✗ Error creating ${tableName}:`, err.message);
                }
            }
        }

        // Run alter migrations
        console.log('\nRunning schema alterations...');
        for (const alter of alterMigrations) {
            try {
                await pool.query(alter.sql);
                console.log(`✓ Applied: ${alter.name}`);
            } catch (err) {
                if (err.code === '42701') {
                    // Column already exists
                    console.log(`- Already applied: ${alter.name}`);
                } else {
                    console.error(`✗ Error in ${alter.name}:`, err.message);
                }
            }
        }

        console.log('\n✓ PostgreSQL migrations completed successfully!');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await pool.end();
    }
}

runMigrations();

