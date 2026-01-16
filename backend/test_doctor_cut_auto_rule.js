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
    // Step 1: Clinic login
    await fetchAPI('/clinic/login', {
        method: 'POST',
        body: JSON.stringify({ clinic_name: 'Yomchi Healthcare', clinic_password: 'TempClinic123!' })
    });
    console.log('✓ Clinic login successful');

    // Step 2: Employee login (role-based auth)
    await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ role: 'PERMANENT_DOCTOR', password: 'TempRole123!' })
    });
    console.log('✓ Employee login successful\n');
}

async function createTestPatient() {
    const response = await fetchAPI('/patients', {
        method: 'POST',
        body: JSON.stringify({
            first_name: 'AutoCut',
            last_name: 'TestPatient',
            date_of_birth: '1990-01-01',
            phone: '5551234567'
        })
    });
    testPatientId = response.data.id;
    console.log(`✓ Created test patient ID: ${testPatientId}\n`);
}

async function testFirstVisit20Percent() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  TEST 1: First PAID Visit → 20% Doctor Cut');
    console.log('═══════════════════════════════════════════════════════════\n');

    const response = await fetchAPI('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: '2025-12-30 10:00:00',  // Tuesday - clinic open
            end_at: '2025-12-30 11:00:00',
            session_type: 'IN_CLINIC',
            payment_status: 'PAID'
        })
    });

    testAppointmentIds.push(response.data.id);

    const expectedCutPercent = 20;
    const expectedIncome = 15000;
    const expectedCut = expectedIncome * 0.20;  // 3000

    console.log(`  Patient ID: ${testPatientId}`);
    console.log(`  Appointment ID: ${response.data.id}`);
    console.log(`  Auto-computed: ${response.data.doctor_cut_auto_computed}`);
    console.log(`  Doctor Cut Percent: ${response.data.doctor_cut_percent}%`);
    console.log(`  Income Generated: ${response.data.income_generated} IQD`);
    console.log(`  Doctor Cut Generated: ${response.data.doctor_cut_generated} IQD`);
    console.log('');

    if (response.data.doctor_cut_percent === expectedCutPercent &&
        response.data.doctor_cut_generated === expectedCut &&
        response.data.doctor_cut_auto_computed === true) {
        console.log('  ✅ PASS: First visit correctly uses 20% doctor cut');
    } else {
        console.log(`  ❌ FAIL: Expected ${expectedCutPercent}% cut = ${expectedCut} IQD`);
        console.log(`           Got ${response.data.doctor_cut_percent}% cut = ${response.data.doctor_cut_generated} IQD`);
    }
    console.log('');
}

async function testSecondVisit10Percent() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  TEST 2: Second PAID Visit → 10% Doctor Cut');
    console.log('═══════════════════════════════════════════════════════════\n');

    const response = await fetchAPI('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: '2025-12-31 10:00:00',  // Wednesday - clinic open
            end_at: '2025-12-31 11:00:00',
            session_type: 'IN_CLINIC',
            payment_status: 'PAID'
        })
    });

    testAppointmentIds.push(response.data.id);

    const expectedCutPercent = 10;
    const expectedIncome = 15000;
    const expectedCut = expectedIncome * 0.10;  // 1500

    console.log(`  Patient ID: ${testPatientId}`);
    console.log(`  Appointment ID: ${response.data.id}`);
    console.log(`  Auto-computed: ${response.data.doctor_cut_auto_computed}`);
    console.log(`  Doctor Cut Percent: ${response.data.doctor_cut_percent}%`);
    console.log(`  Income Generated: ${response.data.income_generated} IQD`);
    console.log(`  Doctor Cut Generated: ${response.data.doctor_cut_generated} IQD`);
    console.log('');

    if (response.data.doctor_cut_percent === expectedCutPercent &&
        response.data.doctor_cut_generated === expectedCut &&
        response.data.doctor_cut_auto_computed === true) {
        console.log('  ✅ PASS: Second visit correctly uses 10% doctor cut');
    } else {
        console.log(`  ❌ FAIL: Expected ${expectedCutPercent}% cut = ${expectedCut} IQD`);
        console.log(`           Got ${response.data.doctor_cut_percent}% cut = ${response.data.doctor_cut_generated} IQD`);
    }
    console.log('');
}

async function testOnlineFirstVisit() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  TEST 3: First ONLINE PAID Visit for New Patient → 20%');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Create a second patient for online test
    const patientResponse = await fetchAPI('/patients', {
        method: 'POST',
        body: JSON.stringify({
            first_name: 'OnlineTest',
            last_name: 'Patient',
            date_of_birth: '1985-05-15',
            phone: '5559876543'
        })
    });
    const onlinePatientId = patientResponse.data.id;

    const response = await fetchAPI('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: onlinePatientId,
            start_at: '2025-12-30 14:00:00',
            end_at: '2025-12-30 15:00:00',
            session_type: 'ONLINE',
            payment_status: 'PAID',
            doctor_involved: true
        })
    });

    testAppointmentIds.push(response.data.id);

    const expectedCutPercent = 20;
    const expectedIncome = 20000;  // Online = 20,000 IQD
    const expectedCut = expectedIncome * 0.20;  // 4000

    console.log(`  Patient ID: ${onlinePatientId}`);
    console.log(`  Appointment ID: ${response.data.id}`);
    console.log(`  Session Type: ONLINE`);
    console.log(`  Auto-computed: ${response.data.doctor_cut_auto_computed}`);
    console.log(`  Doctor Cut Percent: ${response.data.doctor_cut_percent}%`);
    console.log(`  Income Generated: ${response.data.income_generated} IQD`);
    console.log(`  Doctor Cut Generated: ${response.data.doctor_cut_generated} IQD`);
    console.log('');

    if (response.data.doctor_cut_percent === expectedCutPercent &&
        response.data.doctor_cut_generated === expectedCut) {
        console.log('  ✅ PASS: Online first visit correctly uses 20% cut (4,000 IQD)');
    } else {
        console.log(`  ❌ FAIL: Expected ${expectedCutPercent}% cut = ${expectedCut} IQD`);
    }

    // Cleanup extra patient
    try { await fetchAPI(`/patients/${onlinePatientId}`, { method: 'DELETE' }); } catch { }
    console.log('');
}

async function testMarkPaidViaPatck10Percent() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  TEST 4: Create UNPAID → Mark PAID via PATCH → 10% Cut');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Create UNPAID appointment first
    const createResponse = await fetchAPI('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: '2026-01-04 10:00:00',  // Sunday - clinic open
            end_at: '2026-01-04 11:00:00',
            session_type: 'IN_CLINIC',
            payment_status: 'UNPAID'
        })
    });

    testAppointmentIds.push(createResponse.data.id);
    console.log(`  Created UNPAID appointment ID: ${createResponse.data.id}`);
    console.log(`  Doctor Cut at creation: ${createResponse.data.doctor_cut_percent || 'null'}`);
    console.log('');

    // Now mark it as PAID via PATCH
    const patchResponse = await fetchAPI(`/appointments/${createResponse.data.id}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({
            payment_status: 'PAID'
        })
    });

    const expectedCutPercent = 10;  // Already has 2 paid visits from earlier tests
    const expectedCut = 15000 * 0.10;  // 1500

    console.log(`  After PATCH to PAID:`);
    console.log(`  Doctor Cut Percent: ${patchResponse.data.appointment.doctor_cut_percent}%`);
    console.log(`  Doctor Cut Generated: ${patchResponse.data.doctor_cut_generated} IQD`);
    console.log('');

    if (patchResponse.data.appointment.doctor_cut_percent === expectedCutPercent &&
        patchResponse.data.doctor_cut_generated === expectedCut) {
        console.log('  ✅ PASS: PATCH to PAID correctly auto-computes 10% cut');
    } else {
        console.log(`  ❌ FAIL: Expected ${expectedCutPercent}% = ${expectedCut} IQD`);
    }
    console.log('');
}

async function verifyFinancialEvents() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  VERIFICATION: Check Financial Events');
    console.log('═══════════════════════════════════════════════════════════\n');

    const response = await fetchAPI('/financial-events');
    const events = response.data.financial_events;

    const incomeEvents = events.filter(e => e.event_type === 'INCOME');
    const doctorCuts = events.filter(e => e.event_type === 'EXPENSE' && e.category === 'DOCTOR_CUT');

    console.log(`  Total Income Events: ${incomeEvents.length}`);
    console.log(`  Total Doctor Cut Expenses: ${doctorCuts.length}`);

    const totalIncome = incomeEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalCuts = doctorCuts.reduce((sum, e) => sum + e.amount, 0);

    console.log(`  Total Income: ${totalIncome.toLocaleString()} IQD`);
    console.log(`  Total Doctor Cuts: ${totalCuts.toLocaleString()} IQD`);
    console.log(`  Net: ${(totalIncome - totalCuts).toLocaleString()} IQD\n`);
}

async function cleanup() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  CLEANUP');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const id of testAppointmentIds) {
        try { await fetchAPI(`/appointments/${id}`, { method: 'DELETE' }); } catch { }
    }
    if (testPatientId) {
        try { await fetchAPI(`/patients/${testPatientId}`, { method: 'DELETE' }); } catch { }
    }
    console.log('  ✓ Cleanup complete\n');
}

async function runTests() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ACCT-LOGIC-1: Doctor Cut Auto-Rule Tests                 ║');
    console.log('║  Rule: First visit 20%, Follow-ups 10%                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    try {
        await login();
        await createTestPatient();
        await testFirstVisit20Percent();
        await testSecondVisit10Percent();
        await testOnlineFirstVisit();
        await testMarkPaidViaPatck10Percent();
        await verifyFinancialEvents();
        await cleanup();

        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║  All Tests Completed!                                     ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');
    } catch (error) {
        console.error('\n✗ Test failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        await cleanup();
        process.exit(1);
    }
}

runTests();
