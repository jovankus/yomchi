/**
 * Rollback Migration Script
 * Reverts R2 migration by restoring original file paths from backup
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');
const readline = require('readline');

const BACKUP_FILE = path.join(__dirname, 'migration_backup.json');

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function rollbackMigration() {
    console.log('=== Rollback R2 Migration ===\n');

    // Check if backup file exists
    if (!fs.existsSync(BACKUP_FILE)) {
        console.error('❌ No backup file found.');
        console.log(`Expected: ${BACKUP_FILE}`);
        console.log('\nCannot rollback without backup data.');
        return false;
    }

    // Load backup data
    const backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
    console.log(`Found backup with ${backupData.length} entries\n`);

    if (backupData.length === 0) {
        console.log('No entries to rollback.');
        return true;
    }

    // Confirm rollback
    const answer = await question(`Rollback ${backupData.length} documents to local paths? (yes/no): `);
    if (answer.toLowerCase() !== 'yes') {
        console.log('Rollback cancelled.');
        return false;
    }
    console.log();

    let rolledBack = 0;
    let errors = 0;

    for (const entry of backupData) {
        try {
            // Restore original file path in database
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE patient_documents SET file_path = ? WHERE id = ?',
                    [entry.oldPath, entry.id],
                    (err) => err ? reject(err) : resolve()
                );
            });

            console.log(`✓ Rolled back ID ${entry.id}: ${entry.newUrl} → ${entry.oldPath}`);
            rolledBack++;

        } catch (err) {
            console.error(`✗ Error rolling back ID ${entry.id}: ${err.message}`);
            errors++;
        }
    }

    console.log('\n=== Rollback Complete ===');
    console.log(`✓ Rolled back: ${rolledBack}`);
    console.log(`✗ Errors:      ${errors}`);

    if (rolledBack > 0) {
        console.log('\n✅ Migration rolled back successfully!');
        console.log('💡 Local file paths have been restored.');
        console.log('⚠️  Note: Files remain in R2 - delete manually if needed.');

        // Rename backup file
        const archivedBackup = BACKUP_FILE.replace('.json', '_archived.json');
        fs.renameSync(BACKUP_FILE, archivedBackup);
        console.log(`📋 Backup archived: ${archivedBackup}`);
    }

    return errors === 0;
}

// Run rollback
rollbackMigration()
    .then(success => {
        rl.close();
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('Rollback failed:', err);
        rl.close();
        process.exit(1);
    });
