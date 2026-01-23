require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')
        ? { rejectUnauthorized: false }
        : false
});

async function testSchema() {
    try {
        console.log('Testing patient_documents table schema...\n');

        // Check table schema
        const schemaQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'patient_documents'
            ORDER BY ordinal_position;
        `;

        const schema = await pool.query(schemaQuery);
        console.log('Table schema:');
        console.table(schema.rows);

        // Check for any existing records
        const countQuery = 'SELECT COUNT(*) as count FROM patient_documents';
        const count = await pool.query(countQuery);
        console.log(`\nTotal records: ${count.rows[0].count}`);

        // If there are records, show the most recent
        if (count.rows[0].count > 0) {
            const recentQuery = `
                SELECT * FROM patient_documents 
                ORDER BY id DESC 
                LIMIT 5
            `;
            const recent = await pool.query(recentQuery);
            console.log('\nMost recent uploads:');
            console.table(recent.rows);
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

testSchema();
