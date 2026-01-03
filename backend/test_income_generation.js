const BASE_URL = 'http://localhost:3001';
let sessionCookie = '';
let testPatientId = null;
let testAppointmentIds = [];

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
        const error = new Error(data.message || data.error || 'Request failed');
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

async function createTestPatient() {
    console.log('\n=== Creating Test Patient ===');
    try {
        const response = await fetchAPI('/patients', {
            method: 'POST',
            body: JSON.stringify({
                first_name: 'Income',
                last_name: 'TestPatient',
                date_of_birth: '1990-01-01',
                phone: '1234567890'
            })
        });
        testPatientId = response.data.id;
        console.log(`✓ Created test patient with ID: ${testPatientId}`);
        return true;
    } catch (error) {
        console.error('✗ Failed to create test patient:', error.response?.data || error.message);
        return false;
    }
}

async function testInClinicPaidIncome() {
    console.log('\n=== Test: IN_CLINIC PAID → 15,000 IQD ===');

    try {
        const response = await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-26 10:00:00',
                end_at: '2025-12-26 11:00:00',
                session_type: 'IN_CLINIC',
                payment_status: 'PAID'
            })
        });

        const appointment = response.data;
        testAppointmentIds.push(appointment.id);

        if (appointment.income_generated === 15000) {
            console.log(`✓ IN_CLINIC PAID generated 15,000 IQD`);
            console.log(`  - Appointment ID: ${appointment.id}`);
            console.log(`  - Financial Event ID: ${appointment.financial_event_id}`);
        } else {
            console.error(`✗ Expected 15,000 IQD, got: ${appointment.income_generated}`);
        }

        // Verify the financial event exists
        const incomeResponse = await fetchAPI(`/appointments/${appointment.id}/income`);
        if (incomeResponse.data.financial_event.amount === 15000) {
            console.log(`✓ Financial event verified: ${incomeResponse.data.financial_event.amount} IQD`);
        }

        return true;
    } catch (error) {
        console.error('✗ Failed:', error.response?.data || error.message);
        return false;
    }
}

async function testOnlinePaidIncome() {
    console.log('\n=== Test: ONLINE PAID → 20,000 IQD ===');

    try {
        const response = await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-26 14:00:00',
                end_at: '2025-12-26 15:00:00',
                session_type: 'ONLINE',
                payment_status: 'PAID'
            })
        });

        const appointment = response.data;
        testAppointmentIds.push(appointment.id);

        if (appointment.income_generated === 20000) {
            console.log(`✓ ONLINE PAID generated 20,000 IQD`);
            console.log(`  - Appointment ID: ${appointment.id}`);
            console.log(`  - Financial Event ID: ${appointment.financial_event_id}`);
        } else {
            console.error(`✗ Expected 20,000 IQD, got: ${appointment.income_generated}`);
        }

        // Verify the financial event exists
        const incomeResponse = await fetchAPI(`/appointments/${appointment.id}/income`);
        if (incomeResponse.data.financial_event.amount === 20000) {
            console.log(`✓ Financial event verified: ${incomeResponse.data.financial_event.amount} IQD`);
        }

        return true;
    } catch (error) {
        console.error('✗ Failed:', error.response?.data || error.message);
        return false;
    }
}

async function testUnpaidNoIncome() {
    console.log('\n=== Test: UNPAID → No Income ===');

    try {
        const response = await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-27 10:00:00',
                end_at: '2025-12-27 11:00:00',
                session_type: 'IN_CLINIC',
                payment_status: 'UNPAID'
            })
        });

        const appointment = response.data;
        testAppointmentIds.push(appointment.id);

        if (!appointment.income_generated && !appointment.financial_event_id) {
            console.log(`✓ UNPAID appointment generated no income`);
            console.log(`  - Appointment ID: ${appointment.id}`);
        } else {
            console.error(`✗ UNPAID should not generate income`);
        }

        // Try to get income event (should fail)
        try {
            await fetchAPI(`/appointments/${appointment.id}/income`);
            console.error('✗ UNPAID appointment should not have income event');
        } catch (err) {
            if (err.response?.status === 404) {
                console.log('✓ Confirmed: No income event exists');
            }
        }

        return true;
    } catch (error) {
        console.error('✗ Failed:', error.response?.data || error.message);
        return false;
    }
}

async function testFreeReturnNoIncome() {
    console.log('\n=== Test: FREE_RETURN → No Income ===');

    try {
        // First create a PAID session so FREE_RETURN is allowed
        const paidResponse = await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-20 10:00:00',
                end_at: '2025-12-20 11:00:00',
                session_type: 'IN_CLINIC',
                payment_status: 'PAID'
            })
        });
        testAppointmentIds.push(paidResponse.data.id);

        // Now create FREE_RETURN
        const response = await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-26 16:00:00',
                end_at: '2025-12-26 17:00:00',
                session_type: 'ONLINE',
                payment_status: 'FREE_RETURN',
                free_return_reason: 'Follow-up'
            })
        });

        const appointment = response.data;
        testAppointmentIds.push(appointment.id);

        if (!appointment.income_generated && !appointment.financial_event_id) {
            console.log(`✓ FREE_RETURN appointment generated no income`);
            console.log(`  - Appointment ID: ${appointment.id}`);
        } else {
            console.error(`✗ FREE_RETURN should not generate income`);
        }

        return true;
    } catch (error) {
        console.error('✗ Failed:', error.response?.data || error.message);
        return false;
    }
}

async function testUpdateUnpaidToPaid() {
    console.log('\n=== Test: Update UNPAID → PAID (Generate Income) ===');

    try {
        // Get the UNPAID appointment we created earlier
        const unpaidAppointmentId = testAppointmentIds[2]; // Third appointment we created

        const response = await fetchAPI(`/appointments/${unpaidAppointmentId}`, {
            method: 'PUT',
            body: JSON.stringify({
                payment_status: 'PAID'
            })
        });

        if (response.data.income_generated === 15000) {
            console.log(`✓ Updating to PAID generated 15,000 IQD`);
            console.log(`  - Appointment ID: ${unpaidAppointmentId}`);
            console.log(`  - Financial Event ID: ${response.data.financial_event_id}`);
        } else {
            console.error(`✗ Expected 15,000 IQD, got: ${response.data.income_generated}`);
        }

        // Verify the financial event exists
        const incomeResponse = await fetchAPI(`/appointments/${unpaidAppointmentId}/income`);
        if (incomeResponse.data.financial_event.amount === 15000) {
            console.log(`✓ Financial event verified: ${incomeResponse.data.financial_event.amount} IQD`);
        }

        return true;
    } catch (error) {
        console.error('✗ Failed:', error.response?.data || error.message);
        return false;
    }
}

async function testDuplicatePrevention() {
    console.log('\n=== Test: Duplicate Prevention (Update PAID → PAID) ===');

    try {
        // Try to update an already PAID appointment
        const paidAppointmentId = testAppointmentIds[0]; // First appointment (IN_CLINIC PAID)

        const response = await fetchAPI(`/appointments/${paidAppointmentId}`, {
            method: 'PUT',
            body: JSON.stringify({
                payment_status: 'PAID' // Already PAID
            })
        });

        // Should NOT generate duplicate income
        if (!response.data.income_generated && !response.data.note) {
            console.log(`✓ No duplicate income generated`);
            console.log(`  - Response: ${response.data.message}`);
        } else if (response.data.note?.includes('already exists')) {
            console.log(`✓ Duplicate prevention working`);
            console.log(`  - Note: ${response.data.note}`);
        } else {
            console.error(`✗ Unexpected behavior for duplicate`);
        }

        return true;
    } catch (error) {
        console.error('✗ Failed:', error.response?.data || error.message);
        return false;
    }
}

async function verifyFinancialEvents() {
    console.log('\n=== Verifying Financial Events ===');

    try {
        const response = await fetchAPI('/financial-events?event_type=INCOME');
        const incomeEvents = response.data.financial_events;

        console.log(`✓ Total income events: ${incomeEvents.length}`);

        // Count by category
        const inClinic = incomeEvents.filter(e => e.category === 'IN_CLINIC_VISIT').length;
        const online = incomeEvents.filter(e => e.category === 'ONLINE_SESSION').length;

        console.log(`  - IN_CLINIC_VISIT: ${inClinic} events`);
        console.log(`  - ONLINE_SESSION: ${online} events`);

        // Show some samples
        console.log('\nSample events:');
        incomeEvents.slice(0, 3).forEach(event => {
            console.log(`  - ${event.category}: ${event.amount} IQD (Ref: Appointment #${event.reference_id})`);
        });

        return true;
    } catch (error) {
        console.error('✗ Failed:', error.response?.data || error.message);
        return false;
    }
}

async function cleanup() {
    console.log('\n=== Cleanup ===');

    // Delete test appointments
    for (const appointmentId of testAppointmentIds) {
        try {
            await fetchAPI(`/appointments/${appointmentId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error(`✗ Failed to delete appointment ${appointmentId}`);
        }
    }

    // Delete test patient
    if (testPatientId) {
        try {
            await fetchAPI(`/patients/${testPatientId}`, {
                method: 'DELETE'
            });
            console.log('✓ Cleaned up test data');
        } catch (error) {
            console.error('✗ Failed to delete test patient');
        }
    }
}

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Income Generation Tests (Milestone A-3)                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    const loginSuccess = await login();
    if (!loginSuccess) {
        console.error('\n✗ Cannot proceed: Login failed. Make sure the server is running.');
        return;
    }

    const patientCreated = await createTestPatient();
    if (!patientCreated) {
        console.error('\n✗ Cannot proceed: Failed to create test patient.');
        return;
    }

    // Run tests
    await testInClinicPaidIncome();
    await testOnlinePaidIncome();
    await testUnpaidNoIncome();
    await testFreeReturnNoIncome();
    await testUpdateUnpaidToPaid();
    await testDuplicatePrevention();
    await verifyFinancialEvents();

    // Cleanup
    await cleanup();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Test Suite Complete                                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
}

runTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
});
