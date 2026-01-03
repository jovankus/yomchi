// Test script for Inventory Batches API endpoints
const baseUrl = 'http://localhost:3001';

// Helper function to make requests with session cookie
let sessionCookie = '';

async function login() {
    const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    const cookies = res.headers.get('set-cookie');
    if (cookies) {
        sessionCookie = cookies.split(';')[0];
    }

    if (res.ok) {
        console.log('✓ Login successful');
        return true;
    } else {
        console.error('✗ Login failed');
        return false;
    }
}

async function testGetBatchesWithoutPharmacyId() {
    console.log('\n--- Test: GET /inventory/batches without pharmacy_id ---');
    const res = await fetch(`${baseUrl}/inventory/batches`, {
        headers: { 'Cookie': sessionCookie }
    });

    const data = await res.json();
    if (res.status === 400 && data.error) {
        console.log('✓ Returns 400 error when pharmacy_id is missing');
        console.log('  Error:', data.error);
    } else {
        console.log('✗ Expected 400 error');
    }
}

async function testGetBatchesForPharmacy(pharmacyId) {
    console.log(`\n--- Test: GET /inventory/batches?pharmacy_id=${pharmacyId} ---`);
    const res = await fetch(`${baseUrl}/inventory/batches?pharmacy_id=${pharmacyId}`, {
        headers: { 'Cookie': sessionCookie }
    });

    if (res.ok) {
        const data = await res.json();
        console.log('✓ GET batches successful');
        console.log(`  Found ${data.length} batches`);
        if (data.length > 0) {
            console.log('  Sample batch:', {
                id: data[0].id,
                batch_no: data[0].batch_no,
                generic_name: data[0].generic_name,
                qty_on_hand: data[0].qty_on_hand_units
            });
        }
        return data;
    } else {
        console.log('✗ GET batches failed');
        console.log('  Status:', res.status);
    }
}

async function testCreateBatch(batchData) {
    console.log('\n--- Test: POST /inventory/batches ---');
    console.log('  Sending:', batchData);

    const res = await fetch(`${baseUrl}/inventory/batches`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        },
        body: JSON.stringify(batchData)
    });

    const data = await res.json();

    if (res.status === 201) {
        console.log('✓ Batch created successfully');
        console.log('  Batch ID:', data.id);
        console.log('  Qty On Hand:', data.qty_on_hand_units, '(should equal qty_received_units)');
        return data;
    } else {
        console.log('✗ Batch creation failed');
        console.log('  Status:', res.status);
        console.log('  Error:', data.error || data);
    }
}

async function testCreateBatchWithMissingFields() {
    console.log('\n--- Test: POST /inventory/batches with missing fields ---');

    const res = await fetch(`${baseUrl}/inventory/batches`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        },
        body: JSON.stringify({ batch_no: 'TEST' }) // Missing required fields
    });

    const data = await res.json();

    if (res.status === 400 && data.error) {
        console.log('✓ Returns 400 error for missing fields');
        console.log('  Error:', data.error);
    } else {
        console.log('✗ Expected 400 error');
    }
}

async function testCreateBatchWithInvalidQty() {
    console.log('\n--- Test: POST /inventory/batches with invalid quantity ---');

    const res = await fetch(`${baseUrl}/inventory/batches`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        },
        body: JSON.stringify({
            pharmacy_id: 4,
            item_id: 4,
            supplier_id: 4,
            batch_no: 'TEST',
            qty_received_units: 0 // Invalid: must be > 0
        })
    });

    const data = await res.json();

    if (res.status === 400 && data.error) {
        console.log('✓ Returns 400 error for invalid quantity');
        console.log('  Error:', data.error);
    } else {
        console.log('✗ Expected 400 error');
    }
}

// Main test runner
async function runTests() {
    console.log('=== INVENTORY BATCHES API TESTS ===\n');

    // Login first
    const loggedIn = await login();
    if (!loggedIn) {
        console.error('Cannot proceed without login');
        return;
    }

    // Run tests
    await testGetBatchesWithoutPharmacyId();
    await testGetBatchesForPharmacy(4); // Using seeded pharmacy

    await testCreateBatchWithMissingFields();
    await testCreateBatchWithInvalidQty();

    // Create a valid batch
    const newBatch = await testCreateBatch({
        pharmacy_id: 4,
        item_id: 4,
        supplier_id: 4,
        batch_no: `BATCH-${Date.now()}`,
        expiry_date: '2026-12-31',
        qty_received_units: 100,
        purchase_unit_price: 5.50,
        sale_unit_price: 12.00,
        notes: 'Test batch created by automated test'
    });

    // Fetch batches again to verify
    if (newBatch) {
        console.log('\n--- Verifying batch was created ---');
        await testGetBatchesForPharmacy(4);
    }

    console.log('\n=== TESTS COMPLETE ===');
}

runTests().catch(console.error);
