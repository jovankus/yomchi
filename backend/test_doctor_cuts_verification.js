const axios = require('axios');
const { format } = require('date-fns');

// Configuration
const API_URL = 'http://localhost:3001';
const CREDENTIALS = {
    username: 'dr_antigravity',
    password: 'password123'
};

// State
let cookies = null;
let patientId = null;
let appointmentIds = [];

// Helper to get headers
const getHeaders = () => ({
    headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

async function runTest() {
    console.log('🧪 Starting Doctor Cuts Verification Test...\n');

    try {
        // 1. Authenticate
        console.log('1. Authenticating...');
        const authRes = await axios.post(`${API_URL}/auth/login`, CREDENTIALS);
        cookies = authRes.headers['set-cookie'];
        console.log('   ✅ Authenticated\n');

        // 2. Create a Test Patient
        console.log('2. Creating Test Patient...');
        const patientRes = await axios.post(`${API_URL}/patients`, {
            first_name: 'Test',
            last_name: 'CutsVerification',
            phone: '555-CUTS-' + Date.now(),
            date_of_birth: '1990-01-01',
            gender: 'Male'
        }, getHeaders());
        patientId = patientRes.data.id;
        console.log(`   ✅ Created patient ID: ${patientId}\n`);

        // 3. Create Appointments (Paid)
        // We need to create appointments in the CURRENT month to test the report easily
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const currentMonth = `${year}-${month}`;

        // Ensure strictly different times to avoid conflict
        const dateStr = format(today, 'yyyy-MM-dd');

        console.log(`3. Creating Paid Appointments for ${dateStr}...`);

        // Appointment A: In-Clinic (should be 20% cut for first visit usually, or 10% if not)
        // We'll force override to be sure of expected values
        const apptA = await axios.post(`${API_URL}/appointments`, {
            patient_id: patientId,
            clinician_id: 1, // Assuming ID 1 from login
            start_at: `${dateStr} 10:00:00`,
            end_at: `${dateStr} 10:30:00`,
            session_type: 'IN_CLINIC',
            payment_status: 'PAID',
            doctor_cut_override: true,
            doctor_cut_percent: 20, // 20% of 15000 = 3000
            doctor_involved: true
        }, getHeaders());

        console.log('   ✅ Created Appointment A (In-Clinic, 20% cut)');
        console.log(`      Income: ${apptA.data.income_generated}`);
        console.log(`      Doctor Cut: ${apptA.data.doctor_cut_generated} (Expected: 3000)`);
        appointmentIds.push(apptA.data.id);

        // Appointment B: Online (should be 10%)
        const apptB = await axios.post(`${API_URL}/appointments`, {
            patient_id: patientId,
            clinician_id: 1,
            start_at: `${dateStr} 11:00:00`,
            end_at: `${dateStr} 11:30:00`,
            session_type: 'ONLINE',
            payment_status: 'PAID',
            doctor_cut_override: true,
            doctor_cut_percent: 10, // 10% of 20000 = 2000
            doctor_involved: true
        }, getHeaders());

        console.log('   ✅ Created Appointment B (Online, 10% cut)');
        console.log(`      Income: ${apptB.data.income_generated}`);
        console.log(`      Doctor Cut: ${apptB.data.doctor_cut_generated} (Expected: 2000)`);
        appointmentIds.push(apptB.data.id);

        // 4. Verify Doctor Cuts Endpoint
        console.log(`\n4. Verifying GET /financial-events/doctor-cuts?month=${currentMonth}...`);
        const reportRes = await axios.get(`${API_URL}/financial-events/doctor-cuts?month=${currentMonth}`, getHeaders());

        const report = reportRes.data;
        console.log(`   Period: ${report.period}`);
        console.log(`   Total Owed: ${report.total_owed}`);
        console.log(`   Session Count: ${report.session_count}`);

        // Find our specific sessions in the report
        const sessionA = report.sessions.find(s => s.appointment_id === apptA.data.id);
        const sessionB = report.sessions.find(s => s.appointment_id === apptB.data.id);

        let verificationPassed = true;

        if (!sessionA) {
            console.error('   ❌ Session A not found in report');
            verificationPassed = false;
        } else {
            if (sessionA.amount === 3000) {
                console.log('   ✅ Session A found with correct amount (3000)');
            } else {
                console.error(`   ❌ Session A amount mismatch. Got ${sessionA.amount}, expected 3000`);
                verificationPassed = false;
            }
        }

        if (!sessionB) {
            console.error('   ❌ Session B not found in report');
            verificationPassed = false;
        } else {
            if (sessionB.amount === 2000) {
                console.log('   ✅ Session B found with correct amount (2000)');
            } else {
                console.error(`   ❌ Session B amount mismatch. Got ${sessionB.amount}, expected 2000`);
                verificationPassed = false;
            }
        }

        // Check if totals include our amounts
        // Note: The total might include other tests' data, so we can't assert exact equality on Total Owed unless we wipe DB.
        // But we can assert it's AT LEAST 5000.
        if (report.total_owed >= 5000) {
            console.log(`   ✅ Total Owed (${report.total_owed}) includes our test amounts (>= 5000)`);
        } else {
            console.error(`   ❌ Total Owed (${report.total_owed}) is less than expected minimum (5000)`);
            verificationPassed = false;
        }

        if (verificationPassed) {
            console.log('\n✨ VERIFICATION PASSED!');
        } else {
            console.error('\n❌ VERIFICATION FAILED');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        process.exit(1);
    }
}

runTest();
