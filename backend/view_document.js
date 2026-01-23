/**
 * Quick Document Viewer
 * Opens uploaded documents in browser for testing
 */

require('dotenv').config();
const db = require('./db');

console.log('=== Quick Document Viewer ===\n');

// Get document info
db.get('SELECT * FROM patient_documents WHERE id = 1', (err, doc) => {
    if (err) {
        console.error('Error:', err);
        return;
    }

    if (!doc) {
        console.log('No document found with ID 1');
        return;
    }

    console.log('Document Information:');
    console.log('---------------------');
    console.log(`ID: ${doc.id}`);
    console.log(`Patient ID: ${doc.patient_id}`);
    console.log(`Type: ${doc.doc_type}`);
    console.log(`Filename: ${doc.original_name}`);
    console.log(`Uploaded: ${doc.uploaded_at}`);
    console.log();

    const path = require('path');
    const filePath = path.join(__dirname, 'uploads', doc.file_path);

    console.log('File Location:');
    console.log('--------------');
    console.log(filePath);
    console.log();

    // Check if file exists
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log('File Details:');
        console.log('-------------');
        console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`Exists: ✓ YES`);
        console.log();

        console.log('How to View:');
        console.log('------------');
        console.log('1. Open File Explorer and navigate to:');
        console.log(`   ${filePath}`);
        console.log();
        console.log('2. Via Frontend (when servers running):');
        console.log('   http://localhost:5173/patients (edit patient to see documents)');
        console.log();
        console.log('3. Via API (when backend running):');
        console.log('   http://localhost:3000/documents/1/file');
    } else {
        console.log('✗ File not found on disk!');
    }
});
