/**
 * Test script for R2 Storage Service
 * Tests the cloud storage functionality for document uploads
 */

require('dotenv').config();
const { uploadToR2, getSignedUrlFromR2, isR2Available } = require('./services/r2-storage');
const fs = require('fs');
const path = require('path');

console.log('=== R2 Storage Test ===\n');

// Test 1: Check R2 Configuration
console.log('Test 1: R2 Configuration Check');
console.log('-------------------------------');
console.log(`R2_ACCOUNT_ID: ${process.env.R2_ACCOUNT_ID ? '✓ Set' : '✗ Not set'}`);
console.log(`R2_ACCESS_KEY_ID: ${process.env.R2_ACCESS_KEY_ID ? '✓ Set' : '✗ Not set'}`);
console.log(`R2_SECRET_ACCESS_KEY: ${process.env.R2_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Not set'}`);
console.log(`R2_BUCKET_NAME: ${process.env.R2_BUCKET_NAME || '✗ Not set'}`);
console.log(`R2_PUBLIC_URL: ${process.env.R2_PUBLIC_URL || '(optional)'}`);
console.log(`\nR2 Available: ${isR2Available() ? '✓ YES' : '✗ NO'}\n`);

if (!isR2Available()) {
    console.log('⚠️  R2 is not configured - skipping upload tests');
    console.log('\nTo configure R2, add to .env:');
    console.log('  R2_ACCOUNT_ID=your_account_id');
    console.log('  R2_ACCESS_KEY_ID=your_access_key');
    console.log('  R2_SECRET_ACCESS_KEY=your_secret_key');
    console.log('  R2_BUCKET_NAME=yomchi-prescriptions');
    console.log('  R2_PUBLIC_URL=https://prescriptions.yourdomain.com (optional)');
    process.exit(0);
}

// Test 2: Upload a test file
console.log('Test 2: Upload Test File');
console.log('------------------------');

async function testUpload() {
    try {
        // Create a simple test file buffer
        const testContent = `R2 Storage Test - ${new Date().toISOString()}`;
        const testBuffer = Buffer.from(testContent, 'utf-8');
        const testKey = `test/test-${Date.now()}.txt`;

        console.log(`Uploading test file: ${testKey}`);
        const url = await uploadToR2(testBuffer, testKey, 'text/plain');

        console.log('✓ Upload successful!');
        console.log(`  URL: ${url}\n`);

        return testKey;
    } catch (error) {
        console.error('✗ Upload failed:', error.message);
        console.error('  Full error:', error);
        throw error;
    }
}

// Test 3: Generate signed URL
console.log('Test 3: Generate Signed URL');
console.log('---------------------------');

async function testSignedUrl(key) {
    try {
        console.log(`Generating signed URL for: ${key}`);
        const signedUrl = await getSignedUrlFromR2(key, 300); // 5 minutes

        console.log('✓ Signed URL generated!');
        console.log(`  URL: ${signedUrl.substring(0, 100)}...`);
        console.log(`  Expires in: 300 seconds\n`);

        return signedUrl;
    } catch (error) {
        console.error('✗ Signed URL generation failed:', error.message);
        throw error;
    }
}

// Test 4: Upload image file (if exists in uploads)
console.log('Test 4: Upload Sample Image');
console.log('----------------------------');

async function testImageUpload() {
    const uploadsDir = path.join(__dirname, 'uploads', 'documents');

    // Check if there are any existing files to test with
    if (!fs.existsSync(uploadsDir)) {
        console.log('⊘ No uploads directory found - skipping image test\n');
        return;
    }

    // Find a test file
    const findTestFile = (dir) => {
        if (!fs.existsSync(dir)) return null;
        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isFile() && /\.(jpg|jpeg|png|pdf)$/i.test(item.name)) {
                return fullPath;
            }
            if (item.isDirectory()) {
                const found = findTestFile(fullPath);
                if (found) return found;
            }
        }
        return null;
    };

    const testFilePath = findTestFile(uploadsDir);

    if (!testFilePath) {
        console.log('⊘ No test files found in uploads - skipping image test\n');
        return;
    }

    try {
        console.log(`Found test file: ${path.basename(testFilePath)}`);
        const fileBuffer = fs.readFileSync(testFilePath);
        const ext = path.extname(testFilePath).toLowerCase();

        const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.pdf': 'application/pdf'
        };
        const contentType = contentTypes[ext] || 'application/octet-stream';

        const testKey = `test/sample-image-${Date.now()}${ext}`;
        console.log(`Uploading to R2: ${testKey}`);

        const url = await uploadToR2(fileBuffer, testKey, contentType);

        console.log('✓ Image upload successful!');
        console.log(`  Size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
        console.log(`  URL: ${url}\n`);

    } catch (error) {
        console.error('✗ Image upload failed:', error.message);
    }
}

// Run all tests
async function runTests() {
    try {
        const testKey = await testUpload();
        await testSignedUrl(testKey);
        await testImageUpload();

        console.log('=== All Tests Complete ===');
        console.log('✅ R2 storage is working correctly!\n');

    } catch (error) {
        console.error('\n=== Tests Failed ===');
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

runTests();
