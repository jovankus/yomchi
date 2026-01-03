// Test script for Stock Movements Ledger
const baseUrl = 'http://localhost:3001';
let sessionCookie = '';

async function login() {
    const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    const cookies = res.headers.get('set-cookie');
    if (cookies) sessionCookie = cookies.split(';')[0];

    if (res.ok) {
        console.log('✓ Login successful');
        return true;
    } else {
        console.error('✗ Login failed');
        return false;
    }
}

async function testBatchCreatesMovement() {
    console.log('\n--- Test: Batch creation auto-creates RECEIVE movement ---');

    const batchData = {
        pharmacy_id: 4,
        item_id: 4,
        supplier_id: 4,
        batch_no: `TEST-${Date.now()}`,
        expiry_date: '2026-12-31',
        qty_received_units: 50,
        purchase_unit_price: 3.00,
        sale_unit_price: 7.50,
        notes: 'Test batch for movement verification'
    };

    const res = await fetch(`${baseUrl}/inventory/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify(batchData)
    });

    if (res.status === 201) {
        const batch = await res.json();
        console.log('✓ Batch created:', batch.id);
        console.log('  Movement ID:', batch.movement_id);
        console.log('  Qty on hand:', batch.qty_on_hand_units);

        // Verify movement was created
        const movRes = await fetch(`${baseUrl}/inventory/movements?pharmacy_id=4`, {
            headers: { 'Cookie': sessionCookie }
        });

        if (movRes.ok) {
            const movements = await movRes.json();
            const receiveMovement = movements.find(m => m.batch_id === batch.id && m.type === 'RECEIVE');

            if (receiveMovement) {
                console.log('✓ RECEIVE movement found');
                console.log('  Qty:', receiveMovement.qty_units);
                console.log('  Reference:', receiveMovement.reference);
            } else {
                console.log('✗ RECEIVE movement not found');
                console.log('  Total movements found:', movements.length);
            }
        }
        return batch.id; // Return batch ID regardless
    } else {
        console.log('✗ Batch creation failed');
        console.log('  Status:', res.status);
        const error = await res.json();
        console.log('  Error:', error.error);
    }
}

async function testNegativeStockPrevention(batchId) {
    console.log('\n--- Test: Negative stock prevention ---');

    // Try to waste more than available (should fail)
    const wasteData = {
        pharmacy_id: 4,
        item_id: 4,
        batch_id: batchId,
        type: 'WASTE',
        qty_units: -100, // More than the 50 available
        reference: 'Trying to waste too much'
    };

    const res = await fetch(`${baseUrl}/inventory/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify(wasteData)
    });

    const data = await res.json();

    if (res.status === 400 && data.error.includes('Insufficient stock')) {
        console.log('✓ Correctly rejected excessive waste');
        console.log('  Error:', data.error);
    } else {
        console.log('✗ Should have rejected excessive waste');
    }
}

async function testWasteMovement(batchId) {
    console.log('\n--- Test: WASTE movement ---');

    const wasteData = {
        pharmacy_id: 4,
        item_id: 4,
        batch_id: batchId,
        type: 'WASTE',
        qty_units: -20, // Waste 20 units
        reference: 'Damaged stock disposal'
    };

    const res = await fetch(`${baseUrl}/inventory/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify(wasteData)
    });

    if (res.status === 201) {
        const movement = await res.json();
        console.log('✓ WASTE movement created');
        console.log('  Movement ID:', movement.id);
        console.log('  Qty:', movement.qty_units);

        // Verify batch qty_on_hand updated
        const batchRes = await fetch(`${baseUrl}/inventory/batches?pharmacy_id=4`, {
            headers: { 'Cookie': sessionCookie }
        });

        if (batchRes.ok) {
            const batches = await batchRes.json();
            const batch = batches.find(b => b.id === batchId);

            if (batch) {
                console.log('✓ Batch qty_on_hand updated:', batch.qty_on_hand_units);
                console.log('  Expected: 30 (50 - 20)');

                if (batch.qty_on_hand_units === 30) {
                    console.log('✓ Quantity correctly calculated');
                } else {
                    console.log('✗ Quantity mismatch');
                }
            }
        }
    } else {
        console.log('✗ WASTE movement failed');
        const error = await res.json();
        console.log('  Error:', error.error);
    }
}

async function testAdjustMovement(batchId) {
    console.log('\n--- Test: ADJUST movement (positive) ---');

    const adjustData = {
        pharmacy_id: 4,
        item_id: 4,
        batch_id: batchId,
        type: 'ADJUST',
        qty_units: 10, // Add 10 units
        reference: 'Stock count correction'
    };

    const res = await fetch(`${baseUrl}/inventory/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify(adjustData)
    });

    if (res.status === 201) {
        const movement = await res.json();
        console.log('✓ ADJUST movement created');
        console.log('  Movement ID:', movement.id);
        console.log('  Qty:', movement.qty_units);

        // Verify batch qty_on_hand updated
        const batchRes = await fetch(`${baseUrl}/inventory/batches?pharmacy_id=4`, {
            headers: { 'Cookie': sessionCookie }
        });

        if (batchRes.ok) {
            const batches = await batchRes.json();
            const batch = batches.find(b => b.id === batchId);

            if (batch) {
                console.log('✓ Batch qty_on_hand updated:', batch.qty_on_hand_units);
                console.log('  Expected: 40 (30 + 10)');

                if (batch.qty_on_hand_units === 40) {
                    console.log('✓ Quantity correctly calculated');
                } else {
                    console.log('✗ Quantity mismatch');
                }
            }
        }
    } else {
        console.log('✗ ADJUST movement failed');
        const error = await res.json();
        console.log('  Error:', error.error);
    }
}

async function testAdjustNegative(batchId) {
    console.log('\n--- Test: ADJUST movement (negative) ---');

    const adjustData = {
        pharmacy_id: 4,
        item_id: 4,
        batch_id: batchId,
        type: 'ADJUST',
        qty_units: -5, // Remove 5 units
        reference: 'Stock reconciliation'
    };

    const res = await fetch(`${baseUrl}/inventory/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify(adjustData)
    });

    if (res.status === 201) {
        console.log('✓ Negative ADJUST movement created');

        // Verify final quantity
        const batchRes = await fetch(`${baseUrl}/inventory/batches?pharmacy_id=4`, {
            headers: { 'Cookie': sessionCookie }
        });

        if (batchRes.ok) {
            const batches = await batchRes.json();
            const batch = batches.find(b => b.id === batchId);

            if (batch) {
                console.log('✓ Final qty_on_hand:', batch.qty_on_hand_units);
                console.log('  Expected: 35 (40 - 5)');
            }
        }
    } else {
        console.log('✗ Negative ADJUST failed');
    }
}

async function testGetMovements() {
    console.log('\n--- Test: GET movements for pharmacy ---');

    const res = await fetch(`${baseUrl}/inventory/movements?pharmacy_id=4`, {
        headers: { 'Cookie': sessionCookie }
    });

    if (res.ok) {
        const movements = await res.json();
        console.log('✓ Retrieved movements:', movements.length);

        if (movements.length > 0) {
            console.log('  Sample movement:', {
                type: movements[0].type,
                qty: movements[0].qty_units,
                item: movements[0].generic_name,
                created_at: movements[0].created_at
            });

            // Count by type
            const types = movements.reduce((acc, m) => {
                acc[m.type] = (acc[m.type] || 0) + 1;
                return acc;
            }, {});

            console.log('  Movement types:', types);
        }
    } else {
        console.log('✗ Failed to retrieve movements');
    }
}

async function testWastePositiveQuantity() {
    console.log('\n--- Test: WASTE with positive qty (should fail) ---');

    const wasteData = {
        pharmacy_id: 4,
        item_id: 4,
        batch_id: 1,
        type: 'WASTE',
        qty_units: 10, // Positive (should fail)
        reference: 'Invalid waste'
    };

    const res = await fetch(`${baseUrl}/inventory/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify(wasteData)
    });

    const data = await res.json();

    if (res.status === 400 && data.error.includes('must be negative')) {
        console.log('✓ Correctly rejected positive WASTE quantity');
        console.log('  Error:', data.error);
    } else {
        console.log('✗ Should have rejected positive WASTE');
    }
}

// Main test runner
async function runTests() {
    console.log('=== STOCK MOVEMENTS LEDGER TESTS ===\n');

    const loggedIn = await login();
    if (!loggedIn) {
        console.error('Cannot proceed without login');
        return;
    }

    // Test 1: Batch creation creates RECEIVE movement
    const batchId = await testBatchCreatesMovement();

    if (!batchId) {
        console.error('Cannot continue tests without batch');
        return;
    }

    // Test 2: Negative stock prevention
    await testNegativeStockPrevention(batchId);

    // Test 3: WASTE movement
    await testWasteMovement(batchId);

    // Test 4: ADJUST movement (positive)
    await testAdjustMovement(batchId);

    // Test 5: ADJUST movement (negative)
    await testAdjustNegative(batchId);

    // Test 6: WASTE validation (must be negative)
    await testWastePositiveQuantity();

    // Test 7: Get all movements
    await testGetMovements();

    console.log('\n=== TESTS COMPLETE ===');
}

runTests().catch(console.error);
