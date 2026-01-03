// Test script for Integration Port (Milestone 10)
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

// Test 1: Successful webhook processing
async function testSuccessfulWebhook() {
    console.log('\n--- Test 1: Successful Webhook Processing ---');

    const webhookPayload = {
        provider: 'barcode_scanner',
        external_event_id: `scan_${Date.now()}`,
        event_type: 'stock_scan',
        data: {
            pharmacy_id: 4,
            item_id: 4,
            batch_id: 1,
            qty_units: -2,
            type: 'DISPENSE',
            unit_price_at_time: 6.00,
            reference: 'Barcode test scan - Test 1'
        }
    };

    const res = await fetch(`${baseUrl}/integrations/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        },
        body: JSON.stringify(webhookPayload)
    });

    const data = await res.json();

    if (res.ok) {
        console.log('✓ Webhook processed successfully');
        console.log('  Event ID:', data.event_id);
        console.log('  Movement ID:', data.movement_id);
        console.log('  Movement type:', data.movement.type);
        console.log('  Qty units:', data.movement.qty_units);
        return webhookPayload.external_event_id;
    } else {
        console.log('✗ Webhook processing failed');
        console.log('  Status:', res.status);
        console.log('  Error:', data.error);
        return null;
    }
}

// Test 2: Idempotency enforcement
async function testIdempotency(externalEventId) {
    console.log('\n--- Test 2: Idempotency Enforcement ---');

    const webhookPayload = {
        provider: 'barcode_scanner',
        external_event_id: externalEventId, // Same ID as Test 1
        event_type: 'stock_scan',
        data: {
            pharmacy_id: 4,
            item_id: 4,
            batch_id: 1,
            qty_units: -2,
            type: 'DISPENSE',
            reference: 'Duplicate webhook attempt'
        }
    };

    const res = await fetch(`${baseUrl}/integrations/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        },
        body: JSON.stringify(webhookPayload)
    });

    const data = await res.json();

    if (res.status === 409) {
        console.log('✓ Idempotency enforced correctly (409 Conflict)');
        console.log('  Error message:', data.error);
        console.log('  Event ID:', data.event_id);
        console.log('  Processed at:', data.processed_at);
    } else {
        console.log('✗ Idempotency check failed');
        console.log('  Expected 409, got:', res.status);
        console.log('  Response:', data);
    }
}

// Test 3: Invalid payload - missing fields
async function testInvalidPayload() {
    console.log('\n--- Test 3: Invalid Payload Handling ---');

    const invalidPayload = {
        provider: 'barcode_scanner',
        // Missing external_event_id
        event_type: 'stock_scan',
        data: {
            pharmacy_id: 4,
            item_id: 4
        }
    };

    const res = await fetch(`${baseUrl}/integrations/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        },
        body: JSON.stringify(invalidPayload)
    });

    const data = await res.json();

    if (res.status === 400) {
        console.log('✓ Invalid payload rejected correctly (400 Bad Request)');
        console.log('  Error:', data.error);
    } else {
        console.log('✗ Should have rejected invalid payload');
        console.log('  Status:', res.status);
    }
}

// Test 4: Invalid movement data
async function testInvalidMovementData() {
    console.log('\n--- Test 4: Invalid Movement Data ---');

    const webhookPayload = {
        provider: 'pos_system',
        external_event_id: `pos_${Date.now()}`,
        event_type: 'sale',
        data: {
            pharmacy_id: 4,
            // Missing item_id, batch_id, qty_units
            type: 'SALE'
        }
    };

    const res = await fetch(`${baseUrl}/integrations/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        },
        body: JSON.stringify(webhookPayload)
    });

    const data = await res.json();

    if (res.status === 400) {
        console.log('✓ Invalid movement data rejected (400 Bad Request)');
        console.log('  Error:', data.error);
    } else {
        console.log('✗ Should have rejected invalid movement data');
        console.log('  Status:', res.status);
    }
}

// Test 5: Query events endpoint
async function testQueryEvents() {
    console.log('\n--- Test 5: Query Integration Events ---');

    const res = await fetch(`${baseUrl}/integrations/events?provider=barcode_scanner&limit=10`, {
        headers: { 'Cookie': sessionCookie }
    });

    if (res.ok) {
        const data = await res.json();
        console.log('✓ Events retrieved successfully');
        console.log('  Total events:', data.count);

        if (data.events.length > 0) {
            console.log('\n  Sample event:');
            const event = data.events[0];
            console.log('    ID:', event.id);
            console.log('    Provider:', event.provider);
            console.log('    External ID:', event.external_event_id);
            console.log('    Processed:', event.processed_at ? 'Yes' : 'No');
            console.log('    Created at:', event.created_at);
        }
    } else {
        console.log('✗ Failed to retrieve events');
    }
}

// Test 6: Verify stock movement created
async function testStockMovementCreated() {
    console.log('\n--- Test 6: Verify Stock Movement Created ---');

    const res = await fetch(`${baseUrl}/inventory/movements?pharmacy_id=4`, {
        headers: { 'Cookie': sessionCookie }
    });

    if (res.ok) {
        const movements = await res.json();
        const integrationMovements = movements.filter(m => m.source === 'integration');

        console.log('✓ Retrieved stock movements');
        console.log('  Total movements from integrations:', integrationMovements.length);

        if (integrationMovements.length > 0) {
            console.log('\n  Sample integration movement:');
            const movement = integrationMovements[0];
            console.log('    ID:', movement.id);
            console.log('    Type:', movement.type);
            console.log('    Qty units:', movement.qty_units);
            console.log('    Source:', movement.source);
            console.log('    Created by:', movement.created_by);
            console.log('    Reference:', movement.reference);
        }
    } else {
        console.log('✗ Failed to retrieve movements');
    }
}

// Test 7: Different provider (POS system)
async function testDifferentProvider() {
    console.log('\n--- Test 7: Different Provider (POS System) ---');

    const webhookPayload = {
        provider: 'pos_system',
        external_event_id: `pos_sale_${Date.now()}`,
        event_type: 'sale_completed',
        data: {
            pharmacy_id: 4,
            item_id: 4,
            batch_id: 1,
            qty_units: -3,
            type: 'SALE',
            unit_price_at_time: 6.50,
            reference: 'POS Sale - Counter 1'
        }
    };

    const res = await fetch(`${baseUrl}/integrations/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        },
        body: JSON.stringify(webhookPayload)
    });

    const data = await res.json();

    if (res.ok) {
        console.log('✓ POS system webhook processed');
        console.log('  Event ID:', data.event_id);
        console.log('  Movement ID:', data.movement_id);
    } else {
        console.log('✗ POS webhook failed');
        console.log('  Error:', data.error);
    }
}

// Main test runner
async function runTests() {
    console.log('=== INTEGRATION PORT TESTS ===\n');
    console.log('Testing webhook endpoint with idempotency enforcement');
    console.log('and event-to-stock-movement conversion\n');

    const loggedIn = await login();
    if (!loggedIn) {
        console.error('Cannot proceed without login');
        return;
    }

    // Test 1: Successful webhook
    const externalEventId = await testSuccessfulWebhook();

    if (externalEventId) {
        // Test 2: Idempotency
        await testIdempotency(externalEventId);
    }

    // Test 3: Invalid payload
    await testInvalidPayload();

    // Test 4: Invalid movement data
    await testInvalidMovementData();

    // Test 5: Query events
    await testQueryEvents();

    // Test 6: Verify stock movements
    await testStockMovementCreated();

    // Test 7: Different provider
    await testDifferentProvider();

    console.log('\n=== TESTS COMPLETE ===');
    console.log('\nIntegration Port is ready for external systems:');
    console.log('- Barcode scanners');
    console.log('- POS systems');
    console.log('- ERP integrations');
    console.log('- Mobile apps');
    console.log('\nWebhook endpoint: POST /integrations/webhook');
}

runTests().catch(console.error);
