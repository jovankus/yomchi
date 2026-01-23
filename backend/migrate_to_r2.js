/**
 * Migration script: Local files to Cloudflare R2
 * Migrates existing prescription uploads from local disk to R2
 * 
 * Run AFTER setting up R2 credentials:
 * 1. Set R2 environment variables
 * 2. Run: node migrate_to_r2.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { uploadToR2 } = require('./services/r2-storage');

const UPLOADS_DIR = path.join(__dirname, 'uploads', 'documents');

async function migrateFiles() {
    console.log('=== R2 Migration: Local Files → Cloudflare R2 ===\n');
    
    // Check R2 configuration
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || 
        !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
        console.error('❌ R2 credentials not configured');
        console.log('\nAdd to .env:');
        console.log('  R2_ACCOUNT_ID=...');
        console.log('  R2_ACCESS_KEY_ID=...');
        console.log('  R2_SECRET_ACCESS_KEY=...');
        console.log('  R2_BUCKET_NAME=yomchi-prescriptions');
        console.log('  R2_PUBLIC_URL=https://...');
        process.exit(1);
    }
    
    console.log('✓ R2 credentials found\n');
    
    // Get all documents from database
    const documents = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM patient_documents ORDER BY id', (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
    
    console.log(`Found ${documents.length} documents in database\n`);
    
    if (documents.length === 0) {
        console.log('No documents to migrate. ✓');
        process.exit(0);
    }
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const doc of documents) {
        // Skip if already using cloud URL
        if (doc.file_path.startsWith('http://') || doc.file_path.startsWith('https://')) {
            console.log(`⊘ Skip: ${doc.original_name} (already in cloud)`);
            skipped++;
            continue;
        }
        
        // Construct local file path
        const localPath = path.join(__dirname, 'uploads', doc.file_path);
        
        // Check if file exists
        if (!fs.existsSync(localPath)) {
            console.log(`✗ Missing: ${doc.original_name} (ID ${doc.id})`);
            errors++;
            continue;
        }
        
        try {
            // Read file
            const fileBuffer = fs.readFileSync(localPath);
            
            // Determine content type
            const ext = path.extname(doc.original_name).toLowerCase();
            const contentTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.webp': 'image/webp',
                '.pdf': 'application/pdf'
            };
            const contentType = contentTypes[ext] || 'application/octet-stream';
            
            // Upload to R2 (reuse same path structure)
            const r2Url = await uploadToR2(fileBuffer, doc.file_path, contentType);
            
            // Update database with R2 URL
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE patient_documents SET file_path = ? WHERE id = ?',
                    [r2Url, doc.id],
                    (err) => err ? reject(err) : resolve()
                );
            });
            
            console.log(`✓ Migrated: ${doc.original_name} → ${r2Url}`);
            migrated++;
            
        } catch (err) {
            console.error(`✗ Error: ${doc.original_name} - ${err.message}`);
            errors++;
        }
    }
    
    console.log('\n=== Migration Complete ===');
    console.log(`✓ Migrated: ${migrated}`);
    console.log(`⊘ Skipped:  ${skipped} (already in cloud)`);
    console.log(`✗ Errors:   ${errors}`);
    
    if (migrated > 0) {
        console.log('\n✅ Files successfully migrated to R2!');
        console.log('💡 You can now safely delete the local uploads/ directory');
        console.log('   (after verifying files are accessible in production)');
    }
    
    process.exit(errors > 0 ? 1 : 0);
}

// Run migration
migrateFiles().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
