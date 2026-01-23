/**
 * Document Upload Utility
 * Provides comprehensive tools for testing document uploads with both local and R2 storage
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

console.log('=== Document Upload Utility ===\n');

// Display current configuration
console.log('Configuration:');
console.log('--------------');
console.log(`Environment: ${process.env.DATABASE_URL ? 'Production' : 'Development'}`);
console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
console.log(`Storage: ${process.env.R2_ACCOUNT_ID ? 'Cloudflare R2 (if production)' : 'Local Disk'}\n`);

// Function to list all documents
function listDocuments() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM patient_documents ORDER BY uploaded_at DESC LIMIT 20', (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

// Function to get document statistics
function getDocumentStats() {
    return new Promise((resolve, reject) => {
        const queries = {
            total: 'SELECT COUNT(*) as count FROM patient_documents',
            byType: 'SELECT doc_type, COUNT(*) as count FROM patient_documents GROUP BY doc_type',
            cloudFiles: `SELECT COUNT(*) as count FROM patient_documents WHERE file_path LIKE 'http%'`,
            localFiles: `SELECT COUNT(*) as count FROM patient_documents WHERE file_path NOT LIKE 'http%'`
        };

        const stats = {};

        db.get(queries.total, (err, row) => {
            if (err) return reject(err);
            stats.total = row.count;

            db.all(queries.byType, (err, rows) => {
                if (err) return reject(err);
                stats.byType = rows;

                db.get(queries.cloudFiles, (err, row) => {
                    if (err) return reject(err);
                    stats.cloudFiles = row.count;

                    db.get(queries.localFiles, (err, row) => {
                        if (err) return reject(err);
                        stats.localFiles = row.count;
                        resolve(stats);
                    });
                });
            });
        });
    });
}

// Function to find orphaned files (files in DB but not on disk)
async function findOrphanedFiles() {
    const docs = await listDocuments();
    const orphaned = [];

    for (const doc of docs) {
        // Skip cloud URLs
        if (doc.file_path.startsWith('http://') || doc.file_path.startsWith('https://')) {
            continue;
        }

        const filePath = path.join(__dirname, 'uploads', doc.file_path);
        if (!fs.existsSync(filePath)) {
            orphaned.push({
                id: doc.id,
                patient_id: doc.patient_id,
                original_name: doc.original_name,
                file_path: doc.file_path
            });
        }
    }

    return orphaned;
}

// Function to find loose files (files on disk but not in DB)
async function findLooseFiles() {
    const docs = await listDocuments();
    const dbFiles = new Set(docs.map(d => d.file_path));
    const loose = [];

    const uploadsDir = path.join(__dirname, 'uploads', 'documents');
    if (!fs.existsSync(uploadsDir)) {
        return loose;
    }

    const scanDirectory = (dir, relativePath = '') => {
        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
            const itemPath = path.join(dir, item.name);
            const relPath = path.join(relativePath, item.name);

            if (item.isFile()) {
                const dbPath = path.join('documents', relPath);
                if (!dbFiles.has(dbPath)) {
                    loose.push({
                        path: itemPath,
                        relativePath: dbPath,
                        size: fs.statSync(itemPath).size
                    });
                }
            } else if (item.isDirectory()) {
                scanDirectory(itemPath, relPath);
            }
        }
    };

    scanDirectory(uploadsDir);
    return loose;
}

// Main function
async function main() {
    try {
        // Get statistics
        console.log('Document Statistics:');
        console.log('-------------------');
        const stats = await getDocumentStats();
        console.log(`Total Documents: ${stats.total}`);
        console.log(`Cloud Storage: ${stats.cloudFiles}`);
        console.log(`Local Storage: ${stats.localFiles}\n`);

        if (stats.byType.length > 0) {
            console.log('By Type:');
            stats.byType.forEach(({ doc_type, count }) => {
                console.log(`  ${doc_type}: ${count}`);
            });
            console.log();
        }

        // Recent documents
        console.log('Recent Documents (Last 20):');
        console.log('---------------------------');
        const docs = await listDocuments();
        if (docs.length === 0) {
            console.log('No documents found.\n');
        } else {
            docs.slice(0, 10).forEach(doc => {
                const isCloud = doc.file_path.startsWith('http');
                const location = isCloud ? '☁️' : '💾';
                console.log(`${location} ID ${doc.id}: ${doc.original_name} (${doc.doc_type})`);
            });
            if (docs.length > 10) {
                console.log(`... and ${docs.length - 10} more\n`);
            } else {
                console.log();
            }
        }

        // Find orphaned files
        console.log('Orphaned Files Check:');
        console.log('--------------------');
        const orphaned = await findOrphanedFiles();
        if (orphaned.length === 0) {
            console.log('✓ No orphaned files found (DB entries without files)\n');
        } else {
            console.log(`⚠️  Found ${orphaned.length} orphaned files:`);
            orphaned.forEach(file => {
                console.log(`  ID ${file.id}: ${file.original_name}`);
            });
            console.log();
        }

        // Find loose files
        console.log('Loose Files Check:');
        console.log('-----------------');
        const loose = await findLooseFiles();
        if (loose.length === 0) {
            console.log('✓ No loose files found (files without DB entries)\n');
        } else {
            console.log(`⚠️  Found ${loose.length} loose files:`);
            loose.forEach(file => {
                const sizeKb = (file.size / 1024).toFixed(2);
                console.log(`  ${file.relativePath} (${sizeKb} KB)`);
            });
            console.log();
        }

        console.log('=== Utility Complete ===\n');

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
