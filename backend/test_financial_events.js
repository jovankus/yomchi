const BASE_URL = 'http://localhost:3001';
let sessionCookie = '';

// Helper to make authenticated requests
async function fetchAPI(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
    });

    // Capture session cookie from login
    if (response.headers.get('set-cookie')) {
        sessionCookie = response.headers.get('set-cookie');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.message || 'Request failed');
        error.response = { status: response.status, data };
        throw error;
    }

    return { data, status: response.status };
}

async function login() {
    console.log('\n=== Login ===');
    try {
        await fetchAPI('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        console.log('✓ Login successful');
        return true;
    } catch (error) {
        console.error('✗ Login failed:', error.response?.data || error.message);
        return false;
    }
}

async function testCreateFinancialEvent() {
    console.log('\n=== Test: Create Financial Events ===');

    const testEvents = [
        {
            event_date: '2025-12-26',
            event_type: 'INCOME',
            category: 'IN_CLINIC_VISIT',
            amount: 50000,
            description: 'Patient visit - Initial consultation',
            reference_type: 'APPOINTMENT',
            reference_id: 1
        },
        {
            event_date: '2025-12-25',
            event_type: 'INCOME',
            category: 'ONLINE_SESSION',
            amount: 35000,
            description: 'Online therapy session',
            reference_type: 'APPOINTMENT',
            reference_id: 2
        },
        {
            event_date: '2025-12-24',
            event_type: 'EXPENSE',
            category: 'DOCTOR_CUT',
            amount: 25000,
            description: 'Doctor compensation for consultations',
            reference_type: 'SYSTEM',
            reference_id: null
        },
        {
            event_date: '2025-12-23',
            event_type: 'EXPENSE',
            category: 'SECRETARY_SALARY',
            amount: 30000,
            description: 'Monthly secretary salary installment',
            reference_type: 'SYSTEM',
            reference_id: null
        }
    ];

    const createdEvents = [];

    for (const event of testEvents) {
        try {
            const response = await fetchAPI('/financial-events', {
                method: 'POST',
                body: JSON.stringify(event)
            });
            console.log(`✓ Created ${event.event_type} event: ${event.category} - ${event.amount} IQD`);
            createdEvents.push(response.data.financial_event);
        } catch (error) {
            console.error(`✗ Failed to create event:`, error.response?.data || error.message);
        }
    }

    return createdEvents;
}

async function testValidation() {
    console.log('\n=== Test: Validation ===');

    // Test negative amount
    try {
        await fetchAPI('/financial-events', {
            method: 'POST',
            body: JSON.stringify({
                event_date: '2025-12-26',
                event_type: 'INCOME',
                category: 'IN_CLINIC_VISIT',
                amount: -100,
                description: 'Invalid negative amount'
            })
        });
        console.error('✗ Validation failed: Should reject negative amounts');
    } catch (error) {
        if (error.response?.data?.message.includes('positive')) {
            console.log('✓ Correctly rejected negative amount');
        }
    }

    // Test invalid event_type
    try {
        await fetchAPI('/financial-events', {
            method: 'POST',
            body: JSON.stringify({
                event_date: '2025-12-26',
                event_type: 'INVALID_TYPE',
                category: 'IN_CLINIC_VISIT',
                amount: 100,
                description: 'Invalid event type'
            })
        });
        console.error('✗ Validation failed: Should reject invalid event_type');
    } catch (error) {
        if (error.response?.data?.message.includes('INCOME or EXPENSE')) {
            console.log('✓ Correctly rejected invalid event_type');
        }
    }

    // Test missing required fields
    try {
        await fetchAPI('/financial-events', {
            method: 'POST',
            body: JSON.stringify({
                event_date: '2025-12-26',
                description: 'Missing required fields'
            })
        });
        console.error('✗ Validation failed: Should reject missing fields');
    } catch (error) {
        if (error.response?.data?.message.includes('required')) {
            console.log('✓ Correctly rejected missing required fields');
        }
    }
}

async function testListFinancialEvents() {
    console.log('\n=== Test: List Financial Events ===');

    try {
        const response = await fetchAPI('/financial-events');
        console.log(`✓ Retrieved ${response.data.financial_events.length} financial events`);

        if (response.data.financial_events.length > 0) {
            console.log('\nSample events:');
            response.data.financial_events.slice(0, 3).forEach(event => {
                console.log(`  - ${event.event_date} | ${event.event_type} | ${event.category} | ${event.amount} IQD`);
            });
        }
    } catch (error) {
        console.error('✗ Failed to list events:', error.response?.data || error.message);
    }
}

async function testFilterEvents() {
    console.log('\n=== Test: Filter Financial Events ===');

    // Filter by event_type
    try {
        const response = await fetchAPI('/financial-events?event_type=INCOME');
        console.log(`✓ Filtered INCOME events: ${response.data.financial_events.length} results`);
    } catch (error) {
        console.error('✗ Failed to filter by event_type:', error.response?.data || error.message);
    }

    // Filter by category
    try {
        const response = await fetchAPI('/financial-events?category=DOCTOR_CUT');
        console.log(`✓ Filtered DOCTOR_CUT events: ${response.data.financial_events.length} results`);
    } catch (error) {
        console.error('✗ Failed to filter by category:', error.response?.data || error.message);
    }

    // Filter by date range
    try {
        const response = await fetchAPI('/financial-events?start_date=2025-12-25&end_date=2025-12-26');
        console.log(`✓ Filtered date range events: ${response.data.financial_events.length} results`);
    } catch (error) {
        console.error('✗ Failed to filter by date range:', error.response?.data || error.message);
    }
}

async function testAuthRequired() {
    console.log('\n=== Test: Auth Requirement ===');

    // Save current session cookie and test without it
    const savedCookie = sessionCookie;
    sessionCookie = '';

    try {
        await fetchAPI('/financial-events');
        console.error('✗ Auth check failed: Should require authentication');
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✓ Correctly requires authentication');
        }
    }

    // Restore session cookie
    sessionCookie = savedCookie;
}

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Financial Events API - Verification Tests (Milestone A-1) ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const loginSuccess = await login();
    if (!loginSuccess) {
        console.error('\n✗ Cannot proceed: Login failed. Make sure the server is running.');
        return;
    }

    await testAuthRequired();
    await testCreateFinancialEvent();
    await testValidation();
    await testListFinancialEvents();
    await testFilterEvents();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Test Suite Complete                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
}

runTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
});
