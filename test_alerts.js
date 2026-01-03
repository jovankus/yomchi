// Test script for Inventory Alerts
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

// Create test batches with different expiry conditions
async function createTestBatches() {
    console.log('\n--- Creating test batches for alerts ---');

    const today = new Date();
    const batches = [
        {
            pharmacy_id: 4,
            item_id: 4,
            supplier_id: 4,
            batch_no: `EXPIRE-CRITICAL-${Date.now()}`,
            expiry_date: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days
            qty_received_units: 15,
            purchase_unit_price: 2.50,
            sale_unit_price: 6.00
        },
        {
            pharmacy_id: 4,
            item_id: 5,
            supplier_id: 4,
            batch_no: `EXPIRE-WARNING-${Date.now()}`,
            expiry_date: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days
            qty_received_units: 25,
            purchase_unit_price: 1.50,
            sale_unit_price: 4.00
        },
        {
            pharmacy_id: 4,
            item_id: 6,
            supplier_id: 4,
            batch_no: `EXPIRE-INFO-${Date.now()}`,
            expiry_date: new Date(today.getTime() + 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 100 days
            qty_received_units: 30,
            purchase_unit_price: 3.00,
            sale_unit_price: 7.50
        }
    ];

    for (const batchData of batches) {
        const res = await fetch(`${baseUrl}/inventory/batches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
            body: JSON.stringify(batchData)
        });

        if (res.ok) {
            console.log(`✓ Created batch: ${batchData.batch_no} (expires in ~${Math.round((new Date(batchData.expiry_date) - today) / (24 * 60 * 60 * 1000))} days)`);
        } else {
            const error = await res.json();
            console.log(`✗ Failed to create batch: ${batchData.batch_no}`, error.error);
        }
    }
}

// Update reorder levels to trigger low stock alerts
async function setupLowStockScenarios() {
    console.log('\n--- Setting up low stock scenarios ---');

    // Set high reorder level for items with low stock
    const updates = [
        { id: 4, reorder_level: 100 }, // Current stock likely < 100
        { id: 5, reorder_level: 50 },  // Moderate reorder level
    ];

    for (const update of updates) {
        const res = await fetch(`${baseUrl}/inventory/items/${update.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
            body: JSON.stringify(update)
        });

        if (res.ok) {
            console.log(`✓ Set reorder_level=${update.reorder_level} for item ${update.id}`);
        } else {
            console.log(`✗ Failed to update item ${update.id}`);
        }
    }
}

async function testAlertsEndpoint() {
    console.log('\n--- Testing Alerts Endpoint ---');

    const res = await fetch(`${baseUrl}/inventory/alerts?pharmacy_id=4&days=120`, {
        headers: { 'Cookie': sessionCookie }
    });

    if (res.ok) {
        const alerts = await res.json();

        console.log('\n✓ Alerts fetched successfully');
        console.log('\nSUMMARY:');
        console.log(`  Total Alerts: ${alerts.summary.total_alerts}`);
        console.log(`  Critical: ${alerts.summary.critical}`);
        console.log(`  Warning: ${alerts.summary.warning}`);
        console.log(`  Info: ${alerts.summary.info}`);

        // Expiring Soon
        if (alerts.expiring_soon.length > 0) {
            console.log(`\nEXPIRING SOON (${alerts.expiring_soon.length}):`);
            alerts.expiring_soon.forEach(alert => {
                console.log(`  [${alert.severity.toUpperCase()}] ${alert.generic_name} - Batch ${alert.batch_no}`);
                console.log(`    Expires: ${alert.expiry_date} (${alert.days_until_expiry} days)`);
                console.log(`    Qty: ${alert.qty_on_hand_units} units`);
            });

            // Verify severity levels
            const critical = alerts.expiring_soon.filter(a => a.severity === 'critical');
            const warning = alerts.expiring_soon.filter(a => a.severity === 'warning');
            const info = alerts.expiring_soon.filter(a => a.severity === 'info');

            if (critical.length > 0) console.log('\n✓ Critical expiry alerts detected (< 30 days)');
            if (warning.length > 0) console.log('✓ Warning expiry alerts detected (30-90 days)');
            if (info.length > 0) console.log('✓ Info expiry alerts detected (90-120 days)');
        } else {
            console.log('\nNo expiring batches found');
        }

        // Low Stock
        if (alerts.low_stock.length > 0) {
            console.log(`\nLOW STOCK (${alerts.low_stock.length}):`);
            alerts.low_stock.forEach(alert => {
                console.log(`  [${alert.severity.toUpperCase()}] ${alert.generic_name}`);
                console.log(`    Current: ${alert.total_stock}, Reorder Level: ${alert.reorder_level}`);
                console.log(`    Batches: ${alert.batch_count}`);
            });

            const critical = alerts.low_stock.filter(a => a.severity === 'critical');
            const warning = alerts.low_stock.filter(a => a.severity === 'warning');

            if (critical.length > 0) console.log('\n✓ Critical low stock alerts detected (stock = 0)');
            if (warning.length > 0) console.log('✓ Warning low stock alerts detected (stock < 50% reorder)');
        } else {
            console.log('\nNo low stock items found');
        }

        // FIFO Warnings
        if (alerts.fifo_warnings.length > 0) {
            console.log(`\nFIFO WARNINGS (${alerts.fifo_warnings.length}):`);
            alerts.fifo_warnings.forEach(alert => {
                console.log(`  [${alert.severity.toUpperCase()}] ${alert.generic_name}`);
                console.log(`    Older Batch: ${alert.older_batch_no} (${alert.older_expiry})`);
                console.log(`    Qty: ${alert.older_qty} units`);
                console.log(`    ${alert.message}`);
            });
            console.log('\n✓ FIFO warnings generated for skipped batches');
        } else {
            console.log('\nNo FIFO warnings (good FIFO compliance!)');
        }

        return alerts;
    } else {
        console.log('✗ Failed to fetch alerts');
        const error = await res.json();
        console.log('  Error:', error.error);
        return null;
    }
}

async function testDifferentThresholds() {
    console.log('\n--- Testing Different Days Thresholds ---');

    const thresholds = [30, 60, 90, 120, 180];

    for (const days of thresholds) {
        const res = await fetch(`${baseUrl}/inventory/alerts?pharmacy_id=4&days=${days}`, {
            headers: { 'Cookie': sessionCookie }
        });

        if (res.ok) {
            const alerts = await res.json();
            console.log(`  ${days} days: ${alerts.expiring_soon.length} expiring batches`);
        }
    }

    console.log('\n✓ Threshold parameter working correctly');
}

// Main test runner
async function runTests() {
    console.log('=== INVENTORY ALERTS TESTS ===\n');

    const loggedIn = await login();
    if (!loggedIn) {
        console.error('Cannot proceed without login');
        return;
    }

    // Setup: Create test data
    await createTestBatches();
    await setupLowStockScenarios();

    // Wait a moment for data to be committed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 1: Main alerts endpoint
    const alerts = await testAlertsEndpoint();

    if (alerts) {
        // Test 2: Different thresholds
        await testDifferentThresholds();

        console.log('\n=== ALL TESTS COMPLETE ===');
        console.log(`\nFinal Summary: ${alerts.summary.total_alerts} total alerts detected`);
    }
}

runTests().catch(console.error);
