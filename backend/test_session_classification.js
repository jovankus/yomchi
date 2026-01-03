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
                first_name: 'Test',
                last_name: 'SessionClassification',
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

async function testSessionTypeValidation() {
    console.log('\n=== Test: Session Type Validation ===');

    // Test missing session_type
    try {
        await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-27 10:00:00',
                end_at: '2025-12-27 11:00:00',
                payment_status: 'PAID'
            })
        });
        console.error('✗ Should reject missing session_type');
    } catch (error) {
        if (error.response?.data?.error?.includes('session_type is required')) {
            console.log('✓ Correctly rejected missing session_type');
        } else {
            console.error('✗ Wrong error message:', error.response?.data);
        }
    }

    // Test invalid session_type
    try {
        await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-27 10:00:00',
                end_at: '2025-12-27 11:00:00',
                session_type: 'INVALID',
                payment_status: 'PAID'
            })
        });
        console.error('✗ Should reject invalid session_type');
    } catch (error) {
        if (error.response?.data?.error?.includes('IN_CLINIC or ONLINE')) {
            console.log('✓ Correctly rejected invalid session_type');
        } else {
            console.error('✗ Wrong error message:', error.response?.data);
        }
    }
}

async function testPaymentStatusValidation() {
    console.log('\n=== Test: Payment Status Validation ===');

    // Test missing payment_status
    try {
        await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-27 10:00:00',
                end_at: '2025-12-27 11:00:00',
                session_type: 'IN_CLINIC'
            })
        });
        console.error('✗ Should reject missing payment_status');
    } catch (error) {
        if (error.response?.data?.error?.includes('payment_status is required')) {
            console.log('✓ Correctly rejected missing payment_status');
        } else {
            console.error('✗ Wrong error message:', error.response?.data);
        }
    }

    // Test invalid payment_status
    try {
        await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-27 10:00:00',
                end_at: '2025-12-27 11:00:00',
                session_type: 'IN_CLINIC',
                payment_status: 'INVALID'
            })
        });
        console.error('✗ Should reject invalid payment_status');
    } catch (error) {
        if (error.response?.data?.error?.includes('PAID, UNPAID, or FREE_RETURN')) {
            console.log('✓ Correctly rejected invalid payment_status');
        } else {
            console.error('✗ Wrong error message:', error.response?.data);
        }
    }
}

async function testFreeReturnWithoutPaidSession() {
    console.log('\n=== Test: FREE_RETURN Without Previous Paid Session ===');

    try {
        await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-27 10:00:00',
                end_at: '2025-12-27 11:00:00',
                session_type: 'IN_CLINIC',
                payment_status: 'FREE_RETURN',
                free_return_reason: 'Follow-up visit'
            })
        });
        console.error('✗ Should reject FREE_RETURN without previous paid session');
    } catch (error) {
        if (error.response?.data?.error?.includes('No paid session found')) {
            console.log('✓ Correctly rejected FREE_RETURN without paid session');
        } else {
            console.error('✗ Wrong error message:', error.response?.data);
        }
    }
}

async function testValidPaidAppointment() {
    console.log('\n=== Test: Create Valid PAID Appointment ===');

    try {
        const response = await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-20 10:00:00',  // 6 days ago from test date
                end_at: '2025-12-20 11:00:00',
                session_type: 'IN_CLINIC',
                payment_status: 'PAID'
            })
        });
        testAppointmentIds.push(response.data.id);
        console.log(`✓ Created PAID appointment with ID: ${response.data.id}`);
        console.log(`  - Session Type: ${response.data.session_type}`);
        console.log(`  - Payment Status: ${response.data.payment_status}`);
        return true;
    } catch (error) {
        console.error('✗ Failed to create PAID appointment:', error.response?.data || error.message);
        return false;
    }
}

async function testValidFreeReturnWithin10Days() {
    console.log('\n=== Test: FREE_RETURN Within 10 Days ===');

    try {
        const response = await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-26 14:00:00',  // 6 days after the paid session
                end_at: '2025-12-26 15:00:00',
                session_type: 'IN_CLINIC',
                payment_status: 'FREE_RETURN',
                free_return_reason: 'Follow-up for initial consultation'
            })
        });
        testAppointmentIds.push(response.data.id);
        console.log(`✓ Created FREE_RETURN appointment with ID: ${response.data.id}`);
        console.log(`  - Session Type: ${response.data.session_type}`);
        console.log(`  - Payment Status: ${response.data.payment_status}`);
        console.log(`  - Reason: ${response.data.free_return_reason}`);
        return true;
    } catch (error) {
        console.error('✗ Failed to create FREE_RETURN appointment:', error.response?.data || error.message);
        return false;
    }
}

async function testFreeReturnBeyond10Days() {
    console.log('\n=== Test: FREE_RETURN Beyond 10 Days ===');

    try {
        await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-31 10:00:00',  // 11 days after the paid session
                end_at: '2025-12-31 11:00:00',
                session_type: 'ONLINE',
                payment_status: 'FREE_RETURN',
                free_return_reason: 'Late follow-up'
            })
        });
        console.error('✗ Should reject FREE_RETURN beyond 10 days');
    } catch (error) {
        if (error.response?.data?.error?.includes('11 days ago')) {
            console.log('✓ Correctly rejected FREE_RETURN beyond 10 days');
            console.log(`  - Error message: ${error.response.data.error}`);
        } else {
            console.error('✗ Wrong error message:', error.response?.data);
        }
    }
}

async function testValidOnlineSession() {
    console.log('\n=== Test: Create Valid ONLINE Session ===');

    try {
        const response = await fetchAPI('/appointments', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: testPatientId,
                start_at: '2025-12-27 16:00:00',
                end_at: '2025-12-27 17:00:00',
                session_type: 'ONLINE',
                payment_status: 'UNPAID'
            })
        });
        testAppointmentIds.push(response.data.id);
        console.log(`✓ Created ONLINE appointment with ID: ${response.data.id}`);
        console.log(`  - Session Type: ${response.data.session_type}`);
        console.log(`  - Payment Status: ${response.data.payment_status}`);
        return true;
    } catch (error) {
        console.error('✗ Failed to create ONLINE appointment:', error.response?.data || error.message);
        return false;
    }
}

async function testUpdatePaymentStatus() {
    console.log('\n=== Test: Update Payment Status ===');

    if (testAppointmentIds.length < 3) {
        console.error('✗ Not enough test appointments created');
        return false;
    }

    try {
        // Update UNPAID to PAID
        const response = await fetchAPI(`/appointments/${testAppointmentIds[2]}`, {
            method: 'PUT',
            body: JSON.stringify({
                payment_status: 'PAID'
            })
        });
        console.log(`✓ Updated appointment ${testAppointmentIds[2]} from UNPAID to PAID`);
        return true;
    } catch (error) {
        console.error('✗ Failed to update payment status:', error.response?.data || error.message);
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
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  Session Classification Tests (Milestone A-2)                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

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

    // Run validation tests
    await testSessionTypeValidation();
    await testPaymentStatusValidation();
    await testFreeReturnWithoutPaidSession();

    // Run valid appointment tests
    await testValidPaidAppointment();
    await testValidFreeReturnWithin10Days();
    await testFreeReturnBeyond10Days();
    await testValidOnlineSession();
    await testUpdatePaymentStatus();

    // Cleanup
    await cleanup();

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  Test Suite Complete                                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
}

runTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
});
