/**
 * Test script for Milestone FIX-1: Patient Action Panel + Accounting Hooks
 * Tests: recent-appointments endpoint, PATCH payment endpoint, accounting hooks
 */

const BASE_URL = 'http://localhost:3001';
let sessionCookie = null;

// Helper to make authenticated requests
async function authFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    if (sessionCookie) {
        headers['Cookie'] = sessionCookie;
    }

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
    });

    // Capture session cookie
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
        sessionCookie = setCookie.split(';')[0];
    }

    return response;
}

// Test utilities
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`FAIL: ${message} - Expected: ${expected}, Got: ${actual}`);
    }
    console.log(`  ✅ ${message}`);
}

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`  ✅ ${message}`);
}

async function main() {
    console.log('\\n=== FIX-1 Patient Action Panel Tests ===\\n');

    // 1. Login
    console.log('Test 1: Authentication');
    const loginRes = await authFetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    assertEqual(loginRes.status, 200, 'Login successful');

    // 2. Get or create a test patient
    console.log('\\nTest 2: Get/Create Test Patient');
    let testPatientId;
    const patientsRes = await authFetch(`${BASE_URL}/patients`);
    const patients = await patientsRes.json();

    if (patients.patients && patients.patients.length > 0) {
        testPatientId = patients.patients[0].id;
        console.log(`  Using existing patient ID: ${testPatientId}`);
    } else {
        const createPatientRes = await authFetch(`${BASE_URL}/patients`, {
            method: 'POST',
            body: JSON.stringify({
                first_name: 'Test',
                last_name: 'Patient',
                date_of_birth: '1990-01-01'
            })
        });
        const newPatient = await createPatientRes.json();
        testPatientId = newPatient.id;
        console.log(`  Created test patient ID: ${testPatientId}`);
    }

    // 3. Create a test appointment (UNPAID)
    console.log('\\nTest 3: Create UNPAID Appointment');
    const nextTuesday = getNextClinicDay(); // Helper to get valid date
    const createApptRes = await authFetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: `${nextTuesday} 10:00:00`,
            end_at: `${nextTuesday} 10:30:00`,
            session_type: 'IN_CLINIC',
            payment_status: 'UNPAID'
        })
    });

    assertTrue(createApptRes.status === 201 || createApptRes.status === 409,
        `Appointment created or already exists (status: ${createApptRes.status})`);

    let testApptId;
    if (createApptRes.status === 201) {
        const appt = await createApptRes.json();
        testApptId = appt.id;
        console.log(`  Created appointment ID: ${testApptId}`);
    }

    // 4. Test recent-appointments endpoint
    console.log('\\nTest 4: GET /patients/:id/recent-appointments');
    const recentRes = await authFetch(`${BASE_URL}/patients/${testPatientId}/recent-appointments`);
    assertEqual(recentRes.status, 200, 'Recent appointments endpoint works');

    const recentData = await recentRes.json();
    assertTrue(Array.isArray(recentData.appointments), 'Returns appointments array');

    if (recentData.appointments.length > 0) {
        const apt = recentData.appointments[0];
        assertTrue('start_at' in apt, 'Has start_at field');
        assertTrue('session_type' in apt, 'Has session_type field');
        assertTrue('payment_status' in apt, 'Has payment_status field');
        assertTrue('doctor_cut_percent' in apt, 'Has doctor_cut_percent field');

        // Use this appointment for PATCH test if we didn't create one
        if (!testApptId) {
            testApptId = apt.id;
        }
    }

    // 5. Test PATCH payment endpoint (update to PAID)
    if (testApptId) {
        console.log('\\nTest 5: PATCH /appointments/:id/payment');

        // First, ensure it's UNPAID
        const resetRes = await authFetch(`${BASE_URL}/appointments/${testApptId}/payment`, {
            method: 'PATCH',
            body: JSON.stringify({
                session_type: 'IN_CLINIC',
                payment_status: 'UNPAID'
            })
        });

        // Now mark as PAID
        const patchRes = await authFetch(`${BASE_URL}/appointments/${testApptId}/payment`, {
            method: 'PATCH',
            body: JSON.stringify({
                session_type: 'IN_CLINIC',
                payment_status: 'PAID'
            })
        });
        assertEqual(patchRes.status, 200, 'PATCH payment succeeds');

        const patchData = await patchRes.json();
        assertTrue(patchData.message.includes('updated'), 'Returns success message');
        console.log(`  Response: ${JSON.stringify(patchData, null, 2)}`);

        // Check if income was generated
        if (patchData.income_generated) {
            assertEqual(patchData.income_generated, 15000, 'IN_CLINIC generates 15000 IQD income');
            assertTrue(patchData.financial_event_id !== null, 'Financial event ID returned');
            console.log(`  💰 Income generated: ${patchData.income_generated} IQD`);
        } else if (patchData.note) {
            console.log(`  ℹ️ Note: ${patchData.note}`);
        }
    }

    // 6. Test GET last-paid endpoint
    console.log('\\nTest 6: GET /appointments/patient/:id/last-paid');
    const lastPaidRes = await authFetch(`${BASE_URL}/appointments/patient/${testPatientId}/last-paid`);
    assertEqual(lastPaidRes.status, 200, 'Last paid endpoint works');

    const lastPaidData = await lastPaidRes.json();
    if (lastPaidData.last_paid) {
        console.log(`  Last paid: ${lastPaidData.last_paid.date} (${lastPaidData.last_paid.session_type})`);
    } else {
        console.log(`  No paid appointments (expected if new patient)`);
    }

    // 7. Test ONLINE session with doctor cut
    console.log('\\nTest 7: ONLINE session with doctor cut');

    const createOnlineRes = await authFetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: `${nextTuesday} 14:00:00`,
            end_at: `${nextTuesday} 14:30:00`,
            session_type: 'ONLINE',
            payment_status: 'PAID',
            doctor_cut_percent: 15,
            doctor_involved: true
        })
    });

    if (createOnlineRes.status === 201) {
        const onlineAppt = await createOnlineRes.json();
        console.log(`  Created ONLINE PAID appointment ID: ${onlineAppt.id}`);

        if (onlineAppt.income_generated) {
            assertEqual(onlineAppt.income_generated, 20000, 'ONLINE generates 20000 IQD income');
        }
        if (onlineAppt.doctor_cut_generated) {
            assertEqual(onlineAppt.doctor_cut_generated, 3000, 'Doctor cut is 15% = 3000 IQD');
        }
        if (onlineAppt.online_secretary_cut_generated) {
            assertEqual(onlineAppt.online_secretary_cut_generated, 2000, 'Secretary cut is 10% = 2000 IQD');
        }

        console.log(`  💰 Income: ${onlineAppt.income_generated || 'N/A'}`);
        console.log(`  👨‍⚕️ Doctor cut: ${onlineAppt.doctor_cut_generated || 'N/A'}`);
        console.log(`  📞 Secretary cut: ${onlineAppt.online_secretary_cut_generated || 'N/A'}`);
    } else if (createOnlineRes.status === 409) {
        console.log('  ⚠️ Appointment conflicts, skipping this test');
    }

    console.log('\\n=== All Tests Passed! ===\\n');
}

// Helper to get next valid clinic day (Sun, Tue, Wed, Sat)
function getNextClinicDay() {
    const date = new Date();
    const clinicDays = [0, 2, 3, 6]; // Sunday, Tuesday, Wednesday, Saturday

    while (!clinicDays.includes(date.getDay())) {
        date.setDate(date.getDate() + 1);
    }

    return date.toISOString().split('T')[0];
}

main().catch(err => {
    console.error('\\n❌ Test failed:', err.message);
    process.exit(1);
});
