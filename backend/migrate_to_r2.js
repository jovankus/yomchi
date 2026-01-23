/**
 * Enhanced Migration Script: Local Files to Cloudflare R2
 * Migrates existing documents from local disk to R2 with progress tracking and rollback support
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { uploadToR2, fileExistsInR2 } = require('./services/r2-storage');
const readline = require('readline');

const UPLOADS_DIR = path.join(__dirname, 'uploads', 'documents');
const BACKUP_FILE = path.join(__dirname, 'migration_backup.json');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function performMigration(options = {}) {
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
        console.log('  R2_PUBLIC_URL=https://... (optional)');
        return false;
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
        return true;
    }

    // Filter documents that need migration
    const toMigrate = documents.filter(doc => {
        return !doc.file_path.startsWith('http://') && !doc.file_path.startsWith('https://');
    });

    console.log(`Documents to migrate: ${toMigrate.length}`);
    console.log(`Already in cloud: ${documents.length - toMigrate.length}\n`);

    if (toMigrate.length === 0) {
        console.log('All documents are already in cloud storage. ✓');
        return true;
    }

    // Confirm migration unless auto-confirmed
    if (!options.autoConfirm) {
        const answer = await question(`Proceed with migration of ${toMigrate.length} files? (yes/no): `);
        if (answer.toLowerCase() !== 'yes') {
            console.log('Migration cancelled.');
            return false;
        }
        console.log();
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const backupData = [];

    for (const doc of toMigrate) {
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

            // Store backup data
            backupData.push({
                id: doc.id,
                oldPath: doc.file_path,
                newUrl: r2Url
            });

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

            // Save backup after each successful migration
            fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupData, null, 2));

        } catch (err) {
            console.error(`✗ Error: ${doc.original_name} - ${err.message}`);
            errors++;
        }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`✓ Migrated: ${migrated}`);
    console.log(`⊘ Skipped:  ${skipped}`);
    console.log(`✗ Errors:   ${errors}`);

    if (migrated > 0) {
        console.log('\n✅ Files successfully migrated to R2!');
        console.log(`📋 Backup file saved: ${BACKUP_FILE}`);
        console.log('💡 You can now safely delete the local uploads/ directory');
        console.log('   (after verifying files are accessible in production)');
        console.log('\n⚠️  To rollback: node rollback_migration.js');
    }

    return errors === 0;
}

// Run migration
performMigration({ autoConfirm: false })
    .then(success => {
        rl.close();
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('Migration failed:', err);
        rl.close();
        process.exit(1);
    });
