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
            first_name: 'Secretary',
            last_name: 'TestPatient',
            date_of_birth: '1990-01-01',
            phone: '1234567890'
        })
    });
    testPatientId = response.data.id;
    console.log(`✓ Created test patient ID: ${testPatientId}\n`);
}

async function testOnline10PercentSecretary() {
    console.log('=== Test: ONLINE PAID → 10% Secretary Cut ===');
    const response = await fetchAPI('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: '2025-12-26 10:00:00',
            end_at: '2025-12-26 11:00:00',
            session_type: 'ONLINE',
            payment_status: 'PAID',
            doctor_cut_percent: 20
        })
    });

    testAppointmentIds.push(response.data.id);
    const expectedSecretary = 20000 * 0.10;

    console.log(`Income: ${response.data.income_generated} IQD`);
    console.log(`Doctor Cut: ${response.data.doctor_cut_generated} IQD`);
    console.log(`Secretary Cut: ${response.data.online_secretary_cut_generated} IQD`);
    console.log(response.data.online_secretary_cut_generated === Math.round(expectedSecretary)
        ? '✓ Correct 10% secretary cut (2,000 IQD)\n'
        : `✗ Expected ${Math.round(expectedSecretary)}, got ${response.data.online_secretary_cut_generated}\n`);
}

async function testInClinicNoSecretaryCut() {
    console.log('=== Test: IN_CLINIC PAID → No Per-Session Secretary Cut ===');
    const response = await fetchAPI('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: '2025-12-26 14:00:00',
            end_at: '2025-12-26 15:00:00',
            session_type: 'IN_CLINIC',
            payment_status: 'PAID',
            doctor_cut_percent: 15
        })
    });

    testAppointmentIds.push(response.data.id);
    console.log(`Income: ${response.data.income_generated} IQD`);
    console.log(`Doctor Cut: ${response.data.doctor_cut_generated} IQD`);
    console.log(`Secretary Cut: ${response.data.online_secretary_cut_generated || 'None'}`);
    console.log(!response.data.online_secretary_cut_generated
        ? '✓ Correctly no secretary cut for IN_CLINIC\n'
        : '✗ Should not generate secretary cut for IN_CLINIC\n');
}

async function testMonthlyS alaries() {
    console.log('=== Test: Generate Monthly Salaries ===');
    const response = await fetchAPI('/financial-events/monthly-salaries', {
        method: 'POST',
        body: JSON.stringify({
            year: 2025,
            month: 12
        })
    });

    console.log(`Message: ${response.data.message}`);
    console.log(`Salaries created: ${response.data.salaries.length}`);

    const inClinic = response.data.salaries.find(s => s.category === 'IN_CLINIC_SECRETARY_SALARY');
    const online = response.data.salaries.find(s => s.category === 'ONLINE_SECRETARY_BASE_SALARY');

    console.log(`In-Clinic Secretary: ${inClinic?.amount || 'Not found'} IQD`);
    console.log(`Online Secretary Base: ${online?.amount || 'Not found'} IQD`);
    console.log((inClinic?.amount === 250000 && online?.amount === 100000)
        ? '✓ Correct fixed salaries (250k + 100k)\n'
        : '✗ Incorrect salary amounts\n');
}

async function testDuplicateSalaries() {
    console.log('=== Test: Duplicate Salary Prevention ===');
    try {
        await fetchAPI('/financial-events/monthly-salaries', {
            method: 'POST',
            body: JSON.stringify({
                year: 2025,
                month: 12
            })
        });
        console.log('✗ Should reject duplicate salary generation\n');
    } catch (error) {
        console.log(error.response?.data?.error?.includes('already generated')
            ? '✓ Correctly prevented duplicate salaries\n'
            : '✗ Wrong error message\n');
    }
}

async function verifyExpenseBreakdown() {
    console.log('=== Verify Complete Expense Breakdown ===');
    const response = await fetchAPI('/financial-events?event_type=EXPENSE');
    const expenses = response.data.financial_events;

    const doctorCuts = expenses.filter(e => e.category === 'DOCTOR_CUT');
    const secretaryCuts = expenses.filter(e => e.category === 'ONLINE_SECRETARY_CUT');
    const inClinicSalary = expenses.filter(e => e.category === 'IN_CLINIC_SECRETARY_SALARY');
    const onlineSalary = expenses.filter(e => e.category === 'ONLINE_SECRETARY_BASE_SALARY');

    console.log(`Doctor Cuts: ${doctorCuts.length} (${doctorCuts.reduce((s, e) => s + e.amount, 0)} IQD)`);
    console.log(`Online Secretary Cuts (per-session): ${secretaryCuts.length} (${secretaryCuts.reduce((s, e) => s + e.amount, 0)} IQD)`);
    console.log(`In-Clinic Secretary Salary (fixed): ${inClinicSalary.length} (${inClinicSalary.reduce((s, e) => s + e.amount, 0)} IQD)`);
    console.log(`Online Secretary Base Salary (fixed): ${onlineSalary.length} (${onlineSalary.reduce((s, e) => s + e.amount, 0)} IQD)`);
    console.log(`Total Fixed Salaries: ${inClinicSalary.reduce((s, e) => s + e.amount, 0) + onlineSalary.reduce((s, e) => s + e.amount, 0)} IQD`);
    console.log(`Total Variable Expenses: ${secretaryCuts.reduce((s, e) => s + e.amount, 0) + doctorCuts.reduce((s, e) => s + e.amount, 0)} IQD\n`);
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
    console.log('║  Secretary Salaries Tests (Milestone A-5)             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        await login();
        await createTestPatient();
        await testOnline10PercentSecretary();
        await testInClinicNoSecretaryCut();
        await testMonthlySalaries();
        await testDuplicateSalaries();
        await verifyExpenseBreakdown();
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
