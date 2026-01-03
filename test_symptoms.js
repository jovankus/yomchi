// Test Patient Milestone P-3: Symptoms Checklist
// Using built-in fetch API (Node 18+)

const BASE_URL = 'http://localhost:3001';
let authCookie = '';
let testPatientId = null;

async function login() {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
        authCookie = setCookie.split(';')[0];
    }

    console.log('✓ Logged in successfully');
}

async function createTestPatient() {
    console.log('\n--- Creating test patient ---');

    const patient = {
        first_name: 'Symptom',
        last_name: 'Test',
        date_of_birth: '1985-05-15',
        marital_status: 'Single',
        living_with: 'Alone'
    };

    const res = await fetch(`${BASE_URL}/patients`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(patient)
    });

    const data = await res.json();

    if (res.ok) {
        testPatientId = data.id;
        console.log('✓ Test patient created with ID:', testPatientId);
        return testPatientId;
    } else {
        console.log('✗ Failed to create test patient:', data.message);
        return null;
    }
}

async function testGetSymptomsWithoutData() {
    console.log('\n--- Test: GET symptoms for patient without symptom data ---');

    const res = await fetch(`${BASE_URL}/patients/${testPatientId}/symptoms`, {
        headers: { 'Cookie': authCookie }
    });

    const data = await res.json();

    if (res.ok && data.symptoms === null) {
        console.log('✓ Correctly returns null for patient without symptoms');
    } else {
        console.log('✗ Expected null symptoms, got:', data);
    }
}

async function testCreateSymptoms() {
    console.log('\n--- Test: PUT to create new symptoms record ---');

    const symptomsData = {
        depression: true,
        anxiety: true,
        panic: false,
        ptsd: false,
        ocd: false,
        psychosis: false,
        mania: false,
        substance_use: false,
        sleep_problem: true,
        suicidal_ideation: false,
        self_harm: false,
        irritability: true,
        attention_problem: false,
        notes: 'Patient presents with moderate depression, generalized anxiety, and sleep disturbances.'
    };

    const res = await fetch(`${BASE_URL}/patients/${testPatientId}/symptoms`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(symptomsData)
    });

    console.log('  Response status:', res.status);
    const data = await res.json();

    if (res.status === 201) {
        console.log('✓ Symptoms created successfully');
    } else {
        console.log('✗ Failed to create symptoms:', data.message);
    }
}

async function testGetCreatedSymptoms() {
    console.log('\n--- Test: GET created symptoms ---');

    const res = await fetch(`${BASE_URL}/patients/${testPatientId}/symptoms`, {
        headers: { 'Cookie': authCookie }
    });

    const data = await res.json();

    if (res.ok && data.symptoms) {
        console.log('✓ Successfully retrieved symptoms');
        console.log('  Depression:', !!data.symptoms.depression);
        console.log('  Anxiety:', !!data.symptoms.anxiety);
        console.log('  Sleep Problem:', !!data.symptoms.sleep_problem);
        console.log('  Irritability:', !!data.symptoms.irritability);
        console.log('  Notes:', data.symptoms.notes.substring(0, 50) + '...');
        console.log('  Updated by:', data.symptoms.updated_by);
        console.log('  Updated at:', data.symptoms.updated_at);
    } else {
        console.log('✗ Failed to retrieve symptoms');
    }
}

async function testUpdateSymptoms() {
    console.log('\n--- Test: PUT to update existing symptoms ---');

    const updatedSymptoms = {
        depression: true,
        anxiety: false,  // Changed from true to false
        panic: true,     // Changed from false to true
        ptsd: false,
        ocd: false,
        psychosis: false,
        mania: false,
        substance_use: false,
        sleep_problem: false,  // Changed from true to false
        suicidal_ideation: false,
        self_harm: false,
        irritability: true,
        attention_problem: true,  // Changed from false to true
        notes: 'UPDATED: Patient showing improvement in anxiety and sleep. New panic attacks reported. Focus issues emerging.'
    };

    const res = await fetch(`${BASE_URL}/patients/${testPatientId}/symptoms`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(updatedSymptoms)
    });

    const data = await res.json();

    if (res.ok) {
        console.log('✓ Symptoms updated successfully');
    } else {
        console.log('✗ Failed to update symptoms:', data.message);
    }
}

async function testGetUpdatedSymptoms() {
    console.log('\n--- Test: GET updated symptoms ---');

    const res = await fetch(`${BASE_URL}/patients/${testPatientId}/symptoms`, {
        headers: { 'Cookie': authCookie }
    });

    const data = await res.json();

    if (res.ok && data.symptoms) {
        const correct =
            data.symptoms.anxiety === 0 &&
            data.symptoms.panic === 1 &&
            data.symptoms.sleep_problem === 0 &&
            data.symptoms.attention_problem === 1 &&
            data.symptoms.notes.startsWith('UPDATED:');

        if (correct) {
            console.log('✓ Successfully verified all updated symptoms');
            console.log('  Anxiety (should be false):', !!data.symptoms.anxiety);
            console.log('  Panic (should be true):', !!data.symptoms.panic);
            console.log('  Sleep Problem (should be false):', !!data.symptoms.sleep_problem);
            console.log('  Attention Problem (should be true):', !!data.symptoms.attention_problem);
            console.log('  Notes:', data.symptoms.notes.substring(0, 60) + '...');
        } else {
            console.log('✗ Symptoms were not updated correctly');
        }
    } else {
        console.log('✗ Failed to retrieve updated symptoms');
    }
}

async function runTests() {
    try {
        await login();
        await createTestPatient();

        if (testPatientId) {
            await testGetSymptomsWithoutData();
            await testCreateSymptoms();
            await testGetCreatedSymptoms();
            await testUpdateSymptoms();
            await testGetUpdatedSymptoms();
        }

        console.log('\n--- All tests completed ---\n');
    } catch (error) {
        console.error('Error running tests:', error);
    }
}

runTests();
