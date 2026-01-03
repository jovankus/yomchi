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
        first_name: 'Test',
        last_name: 'Patient',
        date_of_birth: '1990-01-01',
        marital_status: 'Single',
        living_with: 'Family'
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

async function testGetProfileWithoutData() {
    console.log('\n--- Test: GET profile for patient without psychiatric data ---');

    const res = await fetch(`${BASE_URL}/patients/${testPatientId}/psychiatric-profile`, {
        headers: { 'Cookie': authCookie }
    });

    const data = await res.json();

    if (res.ok && data.profile === null) {
        console.log('✓ Correctly returns null for patient without profile');
    } else {
        console.log('✗ Expected null profile, got:', data);
    }
}

async function testCreateProfile() {
    console.log('\n--- Test: PUT to create new psychiatric profile ---');

    const profileData = {
        psychiatric_history_text: 'Patient has a history of anxiety and depression. Previously treated with CBT in 2020. No hospitalizations. Family history of mood disorders.'
    };

    const res = await fetch(`${BASE_URL}/patients/${testPatientId}/psychiatric-profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(profileData)
    });

    console.log('  Response status:', res.status);
    const text = await res.text();
    console.log('  Response (first 200 chars):', text.substring(0, 200));

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.log('✗ Response was not JSON, got HTML or other content');
        return;
    }

    if (res.ok) {
        console.log('✓ Psychiatric profile created successfully');
    } else {
        console.log('✗ Failed to create profile:', data.message);
    }
}

async function testGetCreatedProfile() {
    console.log('\n--- Test: GET created psychiatric profile ---');

    const res = await fetch(`${BASE_URL}/patients/${testPatientId}/psychiatric-profile`, {
        headers: { 'Cookie': authCookie }
    });

    const data = await res.json();

    if (res.ok && data.profile && data.profile.psychiatric_history_text) {
        console.log('✓ Successfully retrieved psychiatric profile');
        console.log('  History text:', data.profile.psychiatric_history_text.substring(0, 50) + '...');
        console.log('  Updated by:', data.profile.updated_by);
        console.log('  Updated at:', data.profile.updated_at);
    } else {
        console.log('✗ Failed to retrieve profile');
    }
}

async function testUpdateProfile() {
    console.log('\n--- Test: PUT to update existing psychiatric profile ---');

    const updatedData = {
        psychiatric_history_text: 'UPDATED: Patient has been doing well with current treatment plan. Recent progress includes improved sleep patterns and reduced anxiety symptoms. Continuing medication management.'
    };

    const res = await fetch(`${BASE_URL}/patients/${testPatientId}/psychiatric-profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(updatedData)
    });

    const data = await res.json();

    if (res.ok) {
        console.log('✓ Psychiatric profile updated successfully');
    } else {
        console.log('✗ Failed to update profile:', data.message);
    }
}

async function testGetUpdatedProfile() {
    console.log('\n--- Test: GET updated psychiatric profile ---');

    const res = await fetch(`${BASE_URL}/patients/${testPatientId}/psychiatric-profile`, {
        headers: { 'Cookie': authCookie }
    });

    const data = await res.json();

    if (res.ok && data.profile && data.profile.psychiatric_history_text.startsWith('UPDATED:')) {
        console.log('✓ Successfully retrieved updated profile');
        console.log('  History text:', data.profile.psychiatric_history_text.substring(0, 70) + '...');
    } else {
        console.log('✗ Profile was not updated correctly');
    }
}

async function runTests() {
    try {
        await login();
        await createTestPatient();

        if (testPatientId) {
            await testGetProfileWithoutData();
            await testCreateProfile();
            await testGetCreatedProfile();
            await testUpdateProfile();
            await testGetUpdatedProfile();
        }

        console.log('\n--- All tests completed ---\n');
    } catch (error) {
        console.error('Error running tests:', error);
    }
}

runTests();
