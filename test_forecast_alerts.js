// Test script for Smart Forecast Alerts
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
    console.log('\n--- Setting up test batches for forecast alerts ---');

    const now = new Date();
    const batches = [
        {
            pharmacy_id: 4,
            item_id: 4,
            supplier_id: 4,
            batch_no: `FORECAST-A-${Date.now()}`,
            expiry_date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days
            qty_received_units: 100,
            purchase_unit_price: 2.50,
            sale_unit_price: 6.00
        },
        {
            pharmacy_id: 4,
            item_id: 4,
            supplier_id: 4,
            batch_no: `FORECAST-B-${Date.now()}`,
            expiry_date: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 120 days
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
            createdBatches.push(batch);
            console.log(`✓ Created batch: ${batchData.batch_no} (expires: ${batchData.expiry_date}, qty: ${batchData.qty_received_units})`);
        } else {
            console.log(`✗ Failed to create batch: ${batchData.batch_no}`);
        }
    }

    return createdBatches;
}

// Create dispense movements to establish usage pattern
async function createDispenseMovements() {
    console.log('\n--- Creating dispense movements to establish usage pattern ---');

    // Simulate dispensing 1 unit per day for 30 days = 30 units total
    // This gives us avg_daily_usage = 30/90 = 0.33 units/day
    const dispenseData = {
        pharmacy_id: 4,
        item_id: 4,
        quantity: 30,
        patient_id: 1,
        notes: 'Test dispense for forecast alerts'
    };

    const res = await fetch(`${baseUrl}/inventory/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify(dispenseData)
    });

    if (res.ok) {
        const result = await res.json();
        console.log(`✓ Dispensed ${result.total_quantity} units`);
        console.log(`  Expected avg daily usage: ~${(30 / 90).toFixed(2)} units/day`);
    } else {
        console.log('✗ Failed to create dispense movements');
        const error = await res.json();
        console.log('  Error:', error.error);
    }
}

async function testForecastAlertsAPI() {
    console.log('\n--- Test: Forecast Alerts API ---');

    const res = await fetch(`${baseUrl}/inventory/forecast-alerts?pharmacy_id=4`, {
        headers: { 'Cookie': sessionCookie }
    });

    if (res.ok) {
        const data = await res.json();
        console.log('✓ Forecast alerts API successful');
        console.log('  Total forecast alerts:', data.summary.total_alerts);
        console.log('  Critical:', data.summary.critical);
        console.log('  Warning:', data.summary.warning);
        console.log('  Info:', data.summary.info);

        if (data.forecast_alerts.length > 0) {
            console.log('\n  Sample Alert:');
            const alert = data.forecast_alerts[0];
            console.log('    Item:', alert.generic_name);
            console.log('    Batch:', alert.batch_no);
            console.log('    Days to expiry:', alert.days_to_expiry);
            console.log('    Qty on hand:', alert.qty_on_hand_units);
            console.log('    Avg daily usage:', alert.avg_daily_usage);
            console.log('    Projected usage:', alert.projected_usage_until_expiry);
            console.log('    Risk units:', alert.risk_units);
            console.log('    Message:', alert.message);
            console.log('    Suggested actions:', alert.suggested_actions);
            console.log('    Severity:', alert.severity);

            // Verify calculations
            const expectedProjected = alert.avg_daily_usage * alert.days_to_expiry;
            const expectedRisk = alert.qty_on_hand_units - expectedProjected;

            console.log('\n  Calculation verification:');
            console.log('    Expected projected usage:', expectedProjected.toFixed(1));
            console.log('    Actual projected usage:', alert.projected_usage_until_expiry);
            console.log('    Expected risk units:', Math.round(expectedRisk));
            console.log('    Actual risk units:', alert.risk_units);

            const projectedMatch = Math.abs(expectedProjected - alert.projected_usage_until_expiry) < 0.5;
            const riskMatch = Math.abs(expectedRisk - alert.risk_units) < 1;

            if (projectedMatch && riskMatch) {
                console.log('    ✓ Calculations are correct');
            } else {
                console.log('    ✗ Calculation mismatch detected');
            }
        } else {
            console.log('\n  Note: No forecast alerts triggered (this is okay if usage is high or batches are far from expiry)');
        }
    } else {
        console.log('✗ Forecast alerts API failed');
        const error = await res.json();
        console.log('  Error:', error.error);
    }
}

async function testEdgeCases() {
    console.log('\n--- Test: Edge Cases ---');

    // Test with non-existent pharmacy
    console.log('\nTesting with invalid pharmacy_id...');
    const res1 = await fetch(`${baseUrl}/inventory/forecast-alerts?pharmacy_id=99999`, {
        headers: { 'Cookie': sessionCookie }
    });

    if (res1.ok) {
        const data = await res1.json();
        if (data.forecast_alerts.length === 0) {
            console.log('✓ Correctly returns empty array for non-existent pharmacy');
        }
    }

    // Test missing pharmacy_id
    console.log('\nTesting without pharmacy_id...');
    const res2 = await fetch(`${baseUrl}/inventory/forecast-alerts`, {
        headers: { 'Cookie': sessionCookie }
    });

    if (res2.status === 400) {
        console.log('✓ Correctly rejects request without pharmacy_id');
    } else {
        console.log('✗ Should reject request without pharmacy_id');
    }
}

// Main test runner
async function runTests() {
    console.log('=== SMART FORECAST ALERTS TESTS ===\n');

    const loggedIn = await login();
    if (!loggedIn) {
        console.error('Cannot proceed without login');
        return;
    }

    // Setup: Create test batches
    const batches = await createTestBatches();

    if (batches.length < 2) {
        console.error('Failed to create test batches');
        return;
    }

    // Create dispense movements to establish usage pattern
    await createDispenseMovements();

    // Test 1: Forecast Alerts API
    await testForecastAlertsAPI();

    // Test 2: Edge cases
    await testEdgeCases();

    console.log('\n=== TESTS COMPLETE ===');
    console.log('\nNext steps:');
    console.log('1. Start backend: cd backend && npm run dev');
    console.log('2. Start frontend: cd frontend && npm run dev');
    console.log('3. Navigate to Inventory Alerts page');
    console.log('4. Verify Smart Forecast Alerts section displays correctly');
}

runTests().catch(console.error);
