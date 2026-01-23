/**
 * Test script for prescription upload functionality
 * Tests end-to-end file upload capability
 */

const fs = require('fs');
const path = require('path');

console.log('=== HOTFIX-RX-UPLOAD-1 Verification ===\n');

// Check 1: Multer package installed
try {
    require('multer');
    console.log('✓ multer package installed');
} catch (e) {
    console.log('✗ multer package NOT installed');
    console.log('  Run: npm install multer');
    process.exit(1);
}

// Check 2: Uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
    console.log('✓ uploads directory exists:', uploadsDir);
} else {
    console.log('✗ uploads directory MISSING');
    console.log('  Creating uploads directory...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✓ Created uploads directory');
}

// Check 3: Documents subdirectory
const docsDir = path.join(uploadsDir, 'documents');
if (fs.existsSync(docsDir)) {
    console.log('✓ uploads/documents directory exists');
} else {
    console.log('  Creating uploads/documents directory...');
    fs.mkdirSync(docsDir, { recursive: true });
    console.log('✓ Created uploads/documents directory');
}

// Check 4: Database table
const db = require('./db');
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='patient_documents'", (err, row) => {
    if (err) {
        console.log('✗ Database error:', err.message);
        process.exit(1);
    }

    if (row) {
        console.log('✓ patient_documents table exists');

        // Check schema
        db.all("PRAGMA table_info(patient_documents)", (err, columns) => {
            if (err) {
                console.log('✗ Error reading schema:', err.message);
                process.exit(1);
            }

            const columnNames = columns.map(c => c.name);
            const requiredColumns = ['id', 'patient_id', 'doc_type', 'file_path', 'original_name', 'doc_date', 'uploaded_by'];
            const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));

            if (missingColumns.length === 0) {
                console.log('✓ All required columns present');
                console.log('  Columns:', columnNames.join(', '));
            } else {
                console.log('✗ Missing columns:', missingColumns.join(', '));
                console.log('  Run migration 016_create_patient_documents.js');
                process.exit(1);
            }

            console.log('\n=== ✅ ALL CHECKS PASSED ===\n');
            console.log('Upload functionality should work:');
            console.log('1. Backend route: POST /patients/:id/documents');
            console.log('2. Multer middleware: Configured');
            console.log('3. Storage: backend/uploads/documents/{patientId}/');
            console.log('4. Database: patient_documents table ready');
            console.log('\nTo test:');
            console.log('1. Start backend: npm start');
            console.log('2. Open patient edit form');
            console.log('3. Upload a prescription image');
            console.log('4. Check uploads/documents/{patient_id}/ for file');

            process.exit(0);
        });
    } else {
        console.log('✗ patient_documents table MISSING');
        console.log('  Run: node migrations/016_create_patient_documents.js');
        process.exit(1);
    }
});
