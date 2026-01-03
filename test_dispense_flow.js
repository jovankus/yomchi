// Test script for Dispense/Sale Flow with FIFO
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

// Create test batches with different expiry dates
async function createTestBatches() {
    console.log('\n--- Setting up test batches ---');

    const batches = [
        {
            pharmacy_id: 4,
            item_id: 4,
            supplier_id: 4,
            batch_no: `FIFO-A-${Date.now()}`,
            expiry_date: '2025-06-30', // Expires soonest
            qty_received_units: 30,
            purchase_unit_price: 2.50,
            sale_unit_price: 6.00
        },
        {
            pharmacy_id: 4,
            item_id: 4,
            supplier_id: 4,
            batch_no: `FIFO-B-${Date.now()}`,
            expiry_date: '2025-12-31', // Expires later
            qty_received_units: 50,
            purchase_unit_price: 2.50,
            sale_unit_price: 6.00
        }
    ];

    const createdBatches = [];

    for (const batchData of batches) {
        const res = await fetch(`${baseUrl}/inventory/batches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
            body: JSON.stringify(batchData)
        });

        if (res.ok) {
            const batch = await res.json();
            createdBatches.push({ ...batch, batch_no: batchData.batch_no, expiry_date: batchData.expiry_date });
            console.log(`✓ Created batch: ${batchData.batch_no} (expires: ${batchData.expiry_date}, qty: ${batchData.qty_received_units})`);
        } else {
            console.log(`✗ Failed to create batch: ${batchData.batch_no}`);
            const error = await res.json();
            console.log('  Error:', error.error);
        }
    }

    return createdBatches;
}

async function testSingleBatchFIFO() {
    console.log('\n--- Test: Single batch dispense (uses earliest expiry) ---');

    const dispenseData = {
        pharmacy_id: 4,
        item_id: 4,
        quantity: 10, // Less than first batch
        patient_id: 1,
        notes: 'Test FIFO with single batch'
    };

    const res = await fetch(`${baseUrl}/inventory/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify(dispenseData)
    });

    if (res.ok) {
        const result = await res.json();
        console.log('✓ Dispense successful');
        console.log('  Total quantity:', result.total_quantity);
        console.log('  Type:', result.type);
        console.log('  Allocations:', result.allocations.length);

        if (result.allocations.length === 1) {
            console.log('✓ Used single batch (as expected)');
            console.log('  Batch:', result.allocations[0].batch_no);
            console.log('  Expiry:', result.allocations[0].expiry_date);
            console.log('  Qty allocated:', result.allocations[0].qty_allocated);
        } else {
            console.log('✗ Expected single batch allocation');
        }
    } else {
        console.log('✗ Dispense failed');
        const error = await res.json();
        console.log('  Error:', error.error);
    }
}

async function testMultiBatchFIFO(batches) {
    console.log('\n--- Test: Multi-batch dispense (FIFO across batches) ---');

    // Dispense more than the first batch has (30 units), forcing second batch use
    const dispenseData = {
        pharmacy_id: 4,
        item_id: 4,
        quantity: 50, // First batch has 20 left (30-10), need 30 more from second
        notes: 'Test FIFO multi-batch allocation'
    };

    const res = await fetch(`${baseUrl}/inventory/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify(dispenseData)
    });

    if (res.ok) {
        const result = await res.json();
        console.log('✓ Multi-batch dispense successful');
        console.log('  Total quantity:', result.total_quantity);
        console.log('  Type:', result.type);
        console.log('  Number of batches used:', result.allocations.length);

        if (result.allocations.length === 2) {
            console.log('✓ Used two batches (as expected)');
            console.log('\n  Allocation 1:');
            console.log('    Batch:', result.allocations[0].batch_no);
            console.log('    Expiry:', result.allocations[0].expiry_date);
            console.log('    Qty:', result.allocations[0].qty_allocated);

            console.log('\n  Allocation 2:');
            console.log('    Batch:', result.allocations[1].batch_no);
            console.log('    Expiry:', result.allocations[1].expiry_date);
            console.log('    Qty:', result.allocations[1].qty_allocated);

            // Verify FIFO order (first allocation should have earlier expiry)
            const expiry1 = new Date(result.allocations[0].expiry_date);
            const expiry2 = new Date(result.allocations[1].expiry_date);

            if (expiry1 < expiry2) {
                console.log('\n✓ FIFO order verified (earliest expiry used first)');
            } else {
                console.log('\n✗ FIFO order incorrect');
            }
        } else {
            console.log('✗ Expected two batch allocations');
        }
    } else {
        console.log('✗ Multi-batch dispense failed');
        const error = await res.json();
        console.log('  Error:', error.error);
    }
}

async function testInsufficientStock() {
    console.log('\n--- Test: Insufficient stock rejection ---');

    const dispenseData = {
        pharmacy_id: 4,
        item_id: 4,
        quantity: 1000, // Much more than available
        notes: 'Test insufficient stock'
    };

    const res = await fetch(`${baseUrl}/inventory/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify(dispenseData)
    });

    const data = await res.json();

    if (res.status === 400 && data.error.includes('Insufficient stock')) {
        console.log('✓ Correctly rejected insufficient stock');
        console.log('  Error:', data.error);
    } else {
        console.log('✗ Should have rejected for insufficient stock');
        console.log('  Status:', res.status);
        console.log('  Response:', data);
    }
}

async function testSaleVsDispense() {
    console.log('\n--- Test: SALE vs DISPENSE types ---');

    // Test DISPENSE (with patient)
    console.log('\nTesting DISPENSE (with patient_id)...');
    const dispenseRes = await fetch(`${baseUrl}/inventory/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify({
            pharmacy_id: 4,
            item_id: 4,
            quantity: 5,
            patient_id: 1,
            notes: 'Prescribed medication'
        })
    });

    if (dispenseRes.ok) {
        const result = await dispenseRes.json();
        if (result.type === 'DISPENSE') {
            console.log('✓ Type is DISPENSE');
            console.log('  Patient ID:', result.patient_id);
        } else {
            console.log('✗ Expected type DISPENSE, got:', result.type);
        }
    }

    // Test SALE (without patient)
    console.log('\nTesting SALE (without patient_id)...');
    const saleRes = await fetch(`${baseUrl}/inventory/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify({
            pharmacy_id: 4,
            item_id: 4,
            quantity: 5,
            notes: 'Over-the-counter sale'
        })
    });

    if (saleRes.ok) {
        const result = await saleRes.json();
        if (result.type === 'SALE') {
            console.log('✓ Type is SALE');
            console.log('  Patient ID:', result.patient_id || 'null (as expected)');
        } else {
            console.log('✗ Expected type SALE, got:', result.type);
        }
    }
}

async function testMovementsCreated() {
    console.log('\n--- Test: Verify movements created ---');

    const res = await fetch(`${baseUrl}/inventory/movements?pharmacy_id=4`, {
        headers: { 'Cookie': sessionCookie }
    });

    if (res.ok) {
        const movements = await res.json();
        const dispenseMovements = movements.filter(m => m.type === 'DISPENSE');
        const saleMovements = movements.filter(m => m.type === 'SALE');

        console.log('✓ Retrieved movements');
        console.log('  Total movements:', movements.length);
        console.log('  DISPENSE movements:', dispenseMovements.length);
        console.log('  SALE movements:', saleMovements.length);

        if (dispenseMovements.length > 0) {
            console.log('\n  Sample DISPENSE movement:');
            const sample = dispenseMovements[0];
            console.log('    ID:', sample.id);
            console.log('    Qty:', sample.qty_units);
            console.log('    Batch:', sample.batch_no);
            console.log('    Patient ID:', sample.patient_id);
        }
    } else {
        console.log('✗ Failed to retrieve movements');
    }
}

async function testStockDepletion() {
    console.log('\n--- Test: Verify stock depletion ---');

    const res = await fetch(`${baseUrl}/inventory/batches?pharmacy_id=4`, {
        headers: { 'Cookie': sessionCookie }
    });

    if (res.ok) {
        const batches = await res.json();
        const testBatches = batches.filter(b => b.batch_no.startsWith('FIFO-'));

        console.log('✓ Retrieved batches');
        testBatches.forEach(batch => {
            const depleted = batch.qty_received_units - batch.qty_on_hand_units;
            console.log(`\n  Batch: ${batch.batch_no}`);
            console.log(`    Received: ${batch.qty_received_units}`);
            console.log(`    On hand: ${batch.qty_on_hand_units}`);
            console.log(`    Depleted: ${depleted}`);
        });
    } else {
        console.log('✗ Failed to retrieve batches');
    }
}

// Main test runner
async function runTests() {
    console.log('=== FIFO DISPENSE/SALE FLOW TESTS ===\n');

    const loggedIn = await login();
    if (!loggedIn) {
        console.error('Cannot proceed without login');
        return;
    }

    // Setup: Create test batches with different expiry dates
    const batches = await createTestBatches();

    if (batches.length < 2) {
        console.error('Failed to create test batches');
        return;
    }

    // Test 1: Single batch FIFO
    await testSingleBatchFIFO();

    // Test 2: Multi-batch FIFO
    await testMultiBatchFIFO(batches);

    // Test 3: Insufficient stock
    await testInsufficientStock();

    // Test 4: SALE vs DISPENSE
    await testSaleVsDispense();

    // Test 5: Verify movements created
    await testMovementsCreated();

    // Test 6: Verify stock depletion
    await testStockDepletion();

    console.log('\n=== TESTS COMPLETE ===');
}

runTests().catch(console.error);
