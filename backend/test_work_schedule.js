const BASE_URL = 'http://localhost:3001';
let sessionCookie = '';
let testPatientId = null;
let testAppointmentIds = [];

async function fetchAPI(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers, credentials: 'include' });
    if (response.headers.get('set-cookie')) sessionCookie = response.headers.get('set-cookie');

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || data.error || 'Request failed');
        error.response = { status: response.status, data };
        throw error;
    }
    return { data, status: response.status };
}

async function login() {
    await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    console.log('✓ Login successful\n');
}

async function createTestPatient() {
    const response = await fetchAPI('/patients', {
        method: 'POST',
        body: JSON.stringify({
            first_name: 'Schedule',
            last_name: 'TestPatient',
            date_of_birth: '1990-01-01',
            phone: '1234567890'
        })
    });
    testPatientId = response.data.id;
    console.log(`✓ Created test patient ID: ${testPatientId}\n`);
}

async function testInClinicOnSaturday() {
    console.log('=== Test: IN_CLINIC on Saturday (Open Day) ===');
    try {
        const response = await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-27 10:00:00', // Saturday
                end_at: '2025-12-27 11:00:00',
                session_type: 'IN_CLINIC',
                payment_status: 'PAID'
            })
        });

        testAppointmentIds.push(response.data.id);
        console.log('✓ Saturday IN_CLINIC appointment allowed');
        console.log(`  Appointment ID: ${response.data.id}\n`);
    } catch (error) {
        console.error('✗ Should allow Saturday:', error.response?.data || error.message, '\n');
    }
}

async function testInClinicOnSunday() {
    console.log('=== Test: IN_CLINIC on Sunday (Open Day) ===');
    try {
        const response = await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-28 10:00:00', // Sunday
                end_at: '2025-12-28 11:00:00',
                session_type: 'IN_CLINIC',
                payment_status: 'PAID'
            })
        });

        testAppointmentIds.push(response.data.id);
        console.log('✓ Sunday IN_CLINIC appointment allowed\n');
    } catch (error) {
        console.error('✗ Should allow Sunday:', error.response?.data || error.message, '\n');
    }
}

async function testInClinicOnMonday() {
    console.log('=== Test: IN_CLINIC on Monday (Closed Day) ===');
    try {
        await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-29 10:00:00', // Monday
                end_at: '2025-12-29 11:00:00',
                session_type: 'IN_CLINIC',
                payment_status: 'PAID'
            })
        });
        console.error('✗ Should reject Monday IN_CLINIC\n');
    } catch (error) {
        if (error.response?.data?.error?.includes('Monday')) {
            console.log('✓ Correctly rejected Monday IN_CLINIC');
            console.log(`  Error: ${error.response.data.error}\n`);
        } else {
            console.error('✗ Wrong error:', error.response?.data, '\n');
        }
    }
}

async function testInClinicOnThursday() {
    console.log('=== Test: IN_CLINIC on Thursday (Closed Day) ===');
    try {
        await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2026-01-01 10:00:00', // Thursday
                end_at: '2026-01-01 11:00:00',
                session_type: 'IN_CLINIC',
                payment_status: 'PAID'
            })
        });
        console.error('✗ Should reject Thursday IN_CLINIC\n');
    } catch (error) {
        if (error.response?.data?.error?.includes('Thursday')) {
            console.log('✓ Correctly rejected Thursday IN_CLINIC');
            console.log(`  Error: ${error.response.data.error}\n`);
        } else {
            console.error('✗ Wrong error:', error.response?.data, '\n');
        }
    }
}

async function testOnlineOnMonday() {
    console.log('=== Test: ONLINE on Monday (Should Be Allowed) ===');
    try {
        const response = await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-29 10:00:00', // Monday
                end_at: '2025-12-29 11:00:00',
                session_type: 'ONLINE',
                payment_status: 'PAID'
            })
        });

        testAppointmentIds.push(response.data.id);
        console.log('✓ Monday ONLINE appointment allowed');
        console.log(`  Appointment ID: ${response.data.id}\n`);
    } catch (error) {
        console.error('✗ Should allow Monday ONLINE:', error.response?.data || error.message, '\n');
    }
}

async function testOnlineOnFriday() {
    console.log('=== Test: ONLINE on Friday (Should Be Allowed) ===');
    try {
        const response = await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2026-01-02 10:00:00', // Friday
                end_at: '2026-01-02 11:00:00',
                session_type: 'ONLINE',
                payment_status: 'PAID'
            })
        });

        testAppointmentIds.push(response.data.id);
        console.log('✓ Friday ONLINE appointment allowed\n');
    } catch (error) {
        console.error('✗ Should allow Friday ONLINE:', error.response?.data || error.message, '\n');
    }
}

async function testUpdateToClosedDay() {
    console.log('=== Test: Update IN_CLINIC from Saturday to Monday ===');
    if (testAppointmentIds.length === 0) {
        console.log('⊘ Skipping (no appointment to update)\n');
        return;
    }

    try {
        await fetchAPI(`/appointments/${testAppointmentIds[0]}`, {
            method: 'PUT',
            body: JSON.stringify({
                start_at: '2025-12-29 14:00:00', // Monday
                end_at: '2025-12-29 15:00:00'
            })
        });
        console.error('✗ Should reject update to Monday\n');
    } catch (error) {
        if (error.response?.data?.error?.includes('Monday')) {
            console.log('✓ Correctly rejected update to Monday');
            console.log(`  Error: ${error.response.data.error}\n`);
        } else {
            console.error('✗ Wrong error:', error.response?.data, '\n');
        }
    }
}

async function verifySummary() {
    console.log('=== Schedule Rules Summary ===');
    console.log('Clinic Open Days (IN_CLINIC allowed):');
    console.log('  • Saturday');
    console.log('  • Sunday');
    console.log('  • Tuesday');
    console.log('  • Wednesday');
    console.log('');
    console.log('Clinic Closed Days (IN_CLINIC rejected):');
    console.log('  • Monday');
    console.log('  • Thursday');
    console.log('  • Friday');
    console.log('');
    console.log('ONLINE Sessions: Allowed any day\n');
}

async function cleanup() {
    for (const id of testAppointmentIds) {
        try { await fetchAPI(`/appointments/${id}`, { method: 'DELETE' }); } catch { }
    }
    if (testPatientId) {
        try { await fetchAPI(`/patients/${testPatientId}`, { method: 'DELETE' }); } catch { }
    }
    console.log('✓ Cleanup complete');
}

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  Work Schedule Tests (Milestone A-7)                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        await login();
        await createTestPatient();
        await testInClinicOnSaturday();
        await testInClinicOnSunday();
        await testInClinicOnMonday();
        await testInClinicOnThursday();
        await testOnlineOnMonday();
        await testOnlineOnFriday();
        await testUpdateToClosedDay();
        await verifySummary();
        await cleanup();

        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║  Test Suite Complete                                  ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
    } catch (error) {
        console.error('\n✗ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();
