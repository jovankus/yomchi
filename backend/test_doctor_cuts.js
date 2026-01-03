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
    console.log('✓ Login successful');
}

async function createTestPatient() {
    const response = await fetchAPI('/patients', {
        method: 'POST',
        body: JSON.stringify({
            first_name: 'DoctorCut',
            last_name: 'TestPatient',
            date_of_birth: '1990-01-01',
            phone: '1234567890'
        })
    });
    testPatientId = response.data.id;
    console.log(`✓ Created test patient ID: ${testPatientId}\n`);
}

async function testInClinic15Percent() {
    console.log('=== Test: IN_CLINIC PAID with 15% Doctor Cut ===');
    const response = await fetchAPI('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: '2025-12-26 10:00:00',
            end_at: '2025-12-26 11:00:00',
            session_type: 'IN_CLINIC',
            payment_status: 'PAID',
            doctor_cut_percent: 15
        })
    });

    testAppointmentIds.push(response.data.id);
    const expected = 15000 * 0.15;

    console.log(`Income: ${response.data.income_generated} IQD`);
    console.log(`Doctor Cut: ${response.data.doctor_cut_generated} IQD`);
    console.log(response.data.doctor_cut_generated === Math.round(expected)
        ? '✓ Correct 15% calculation (2,250 IQD)\n'
        : `✗ Expected ${Math.round(expected)}, got ${response.data.doctor_cut_generated}\n`);
}

async function testOnline20PercentInvolved() {
    console.log('=== Test: ONLINE PAID, Doctor Involved, 20% Cut ===');
    const response = await fetchAPI('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: '2025-12-26 14:00:00',
            end_at: '2025-12-26 15:00:00',
            session_type: 'ONLINE',
            payment_status: 'PAID',
            doctor_cut_percent: 20,
            doctor_involved: true
        })
    });

    testAppointmentIds.push(response.data.id);
    const expected = 20000 * 0.20;

    console.log(`Income: ${response.data.income_generated} IQD`);
    console.log(`Doctor Cut: ${response.data.doctor_cut_generated} IQD`);
    console.log(response.data.doctor_cut_generated === Math.round(expected)
        ? '✓ Correct 20% calculation (4,000 IQD)\n'
        : `✗ Expected ${Math.round(expected)}, got ${response.data.doctor_cut_generated}\n`);
}

async function testOnlineNotInvolved() {
    console.log('=== Test: ONLINE PAID, Doctor NOT Involved ===');
    const response = await fetchAPI('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: '2025-12-27 10:00:00',
            end_at: '2025-12-27 11:00:00',
            session_type: 'ONLINE',
            payment_status: 'PAID',
            doctor_cut_percent: 20,
            doctor_involved: false
        })
    });

    testAppointmentIds.push(response.data.id);
    console.log(`Income: ${response.data.income_generated} IQD`);
    console.log(`Doctor Cut: ${response.data.doctor_cut_generated || 'None'}`);
    console.log(!response.data.doctor_cut_generated
        ? '✓ Correctly skipped doctor cut (not involved)\n'
        : '✗ Should not generate cut when doctor not involved\n');
}

async function testNoCutPercent() {
    console.log('=== Test: PAID but No Cut Percentage ===');
    const response = await fetchAPI('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: '2025-12-27 14:00:00',
            end_at: '2025-12-27 15:00:00',
            session_type: 'IN_CLINIC',
            payment_status: 'PAID'
        })
    });

    testAppointmentIds.push(response.data.id);
    console.log(`Income: ${response.data.income_generated} IQD`);
    console.log(`Doctor Cut: ${response.data.doctor_cut_generated || 'None'}`);
    console.log(!response.data.doctor_cut_generated
        ? '✓ Correctly no cut when percentage not specified\n'
        : '✗ Should not generate cut without percentage\n');
}

async function testInvalidPercent() {
    console.log('=== Test: Invalid Doctor Cut Percentage ===');
    try {
        await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-28 10:00:00',
                end_at: '2025-12-28 11:00:00',
                session_type: 'IN_CLINIC',
                payment_status: 'PAID',
                doctor_cut_percent: 25
            })
        });
        console.log('✗ Should reject percentage > 20\n');
    } catch (error) {
        console.log(error.response?.data?.error?.includes('between 10 and 20')
            ? '✓ Correctly rejected invalid percentage\n'
            : '✗ Wrong error message\n');
    }
}

async function verifyFinancialEvents() {
    console.log('=== Verifying All Financial Events ===');
    const response = await fetchAPI('/financial-events');
    const events = response.data.financial_events;

    const income = events.filter(e => e.event_type === 'INCOME');
    const expenses = events.filter(e => e.event_type === 'EXPENSE' && e.category === 'DOCTOR_CUT');

    console.log(`Total Income Events: ${income.length}`);
    console.log(`Total Doctor Cut Expenses: ${expenses.length}`);
    console.log(`Net (Income - Cuts): ${income.reduce((s, e) => s + e.amount, 0) - expenses.reduce((s, e) => s + e.amount, 0)} IQD\n`);
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
    console.log('║  Doctor Cuts Tests (Milestone A-4)                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        await login();
        await createTestPatient();
        await testInClinic15Percent();
        await testOnline20PercentInvolved();
        await testOnlineNotInvolved();
        await testNoCutPercent();
        await testInvalidPercent();
        await verifyFinancialEvents();
        await cleanup();

        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  Test Suite Complete                                  ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
    } catch (error) {
        console.error('\n✗ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();
