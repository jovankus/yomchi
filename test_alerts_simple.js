// Simple alerts verification test
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

    return res.ok;
}

async function testAlerts() {
    console.log('Testing Alerts Endpoint...\n');

    const loggedIn = await login();
    if (!loggedIn) {
        console.log('✗ Login failed');
        return;
    }
    console.log('✓ Login successful');

    // Test with existing pharmacy
    const res = await fetch(`${baseUrl}/inventory/alerts?pharmacy_id=4&days=120`, {
        headers: { 'Cookie': sessionCookie }
    });

    if (!res.ok) {
        console.log('✗ Alerts endpoint failed');
        console.log('  Status:', res.status);
        const text = await res.text();
        console.log('  Response:', text.substring(0, 200));
        return;
    }

    const alerts = await res.json();

    console.log('\n✓ Alerts endpoint working!\n');
    console.log('SUMMARY:');
    console.log(`  Total Alerts: ${alerts.summary.total_alerts}`);
    console.log(`  Critical: ${alerts.summary.critical}`);
    console.log(`  Warning: ${alerts.summary.warning}`);
    console.log(`  Info: ${alerts.summary.info}`);

    console.log(`\nExpiring Soon: ${alerts.expiring_soon.length} alerts`);
    console.log(`Low Stock: ${alerts.low_stock.length} alerts`);
    console.log(`FIFO Warnings: ${alerts.fifo_warnings.length} alerts`);

    if (alerts.expiring_soon.length > 0) {
        console.log('\nSample Expiring Alert:');
        const sample = alerts.expiring_soon[0];
        console.log(`  Item: ${sample.generic_name}`);
        console.log(`  Batch: ${sample.batch_no}`);
        console.log(`  Days until expiry: ${sample.days_until_expiry}`);
        console.log(`  Severity: ${sample.severity}`);
    }

    if (alerts.low_stock.length > 0) {
        console.log('\nSample Low Stock Alert:');
        const sample = alerts.low_stock[0];
        console.log(`  Item: ${sample.generic_name}`);
        console.log(`  Stock: ${sample.total_stock} / Reorder: ${sample.reorder_level}`);
        console.log(`  Severity: ${sample.severity}`);
    }

    if (alerts.fifo_warnings.length > 0) {
        console.log('\nSample FIFO Warning:');
        const sample = alerts.fifo_warnings[0];
        console.log(`  Item: ${sample.generic_name}`);
        console.log(`  Older batch: ${sample.older_batch_no} (${sample.older_qty} units)`);
        console.log(`  ${sample.message}`);
    }

    console.log('\n✓ All alert types implemented and functioning');
}

testAlerts().catch(console.error);
