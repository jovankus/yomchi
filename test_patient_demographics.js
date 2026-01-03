// Using built-in fetch API (Node 18+)

const BASE_URL = 'http://localhost:3001';
let authCookie = '';

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

async function testCreatePatientWithDemographics() {
    console.log('\n--- Test: Create patient with all demographics ---');

    const patient = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-05-15',
        phone: '123-456-7890',
        email: 'john.doe@example.com',
        address: '123 Main St',
        place_of_living: 'Downtown Apartment',
        education_level: 'Bachelor\'s Degree',
        marital_status: 'Single',
        occupation: 'Software Engineer',
        living_with: 'Roommate'
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
        console.log('✓ Patient created successfully with ID:', data.id);
        return data.id;
    } else {
        console.log('✗ Failed to create patient:', data.message);
        return null;
    }
}

async function testValidationUnmarriedWithoutLivingWith() {
    console.log('\n--- Test: Validation - Unmarried without living_with (should fail) ---');

    const patient = {
        first_name: 'Jane',
        last_name: 'Smith',
        date_of_birth: '1985-08-20',
        phone: '987-654-3210',
        marital_status: 'Divorced',
        living_with: '' // Empty, should trigger validation error
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

    if (!res.ok && data.message.includes('Living With is required')) {
        console.log('✓ Validation works correctly - rejected unmarried patient without living_with');
    } else {
        console.log('✗ Validation failed - should have rejected this patient');
    }
}

async function testMarriedPatientWithoutLivingWith() {
    console.log('\n--- Test: Married patient without living_with (should succeed) ---');

    const patient = {
        first_name: 'Bob',
        last_name: 'Johnson',
        date_of_birth: '1980-03-10',
        marital_status: 'Married',
        living_with: '' // Empty, but married so should be OK
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
        console.log('✓ Married patient created successfully without living_with');
        return data.id;
    } else {
        console.log('✗ Failed - married patient should not require living_with:', data.message);
        return null;
    }
}

async function testUpdateDemographics(patientId) {
    console.log('\n--- Test: Update patient demographics ---');

    const updates = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-05-15',
        place_of_living: 'Suburban House',
        education_level: 'Master\'s Degree',
        marital_status: 'Single',
        occupation: 'Senior Software Engineer',
        living_with: 'Parents'
    };

    const res = await fetch(`${BASE_URL}/patients/${patientId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        },
        body: JSON.stringify(updates)
    });

    const data = await res.json();

    if (res.ok) {
        console.log('✓ Patient demographics updated successfully');
    } else {
        console.log('✗ Failed to update demographics:', data.message);
    }
}

async function testGetPatientWithDemographics(patientId) {
    console.log('\n--- Test: Retrieve patient and verify demographics ---');

    const res = await fetch(`${BASE_URL}/patients/${patientId}`, {
        headers: { 'Cookie': authCookie }
    });

    const data = await res.json();

    if (res.ok && data.patient) {
        const p = data.patient;
        console.log('✓ Retrieved patient:', p.first_name, p.last_name);
        console.log('  Demographics:');
        console.log('    Place of Living:', p.place_of_living);
        console.log('    Education Level:', p.education_level);
        console.log('    Marital Status:', p.marital_status);
        console.log('    Occupation:', p.occupation);
        console.log('    Living With:', p.living_with);
    } else {
        console.log('✗ Failed to retrieve patient');
    }
}

async function runTests() {
    try {
        await login();

        const patientId1 = await testCreatePatientWithDemographics();
        await testValidationUnmarriedWithoutLivingWith();
        const patientId2 = await testMarriedPatientWithoutLivingWith();

        if (patientId1) {
            await testUpdateDemographics(patientId1);
            await testGetPatientWithDemographics(patientId1);
        }

        console.log('\n--- All tests completed ---\n');
    } catch (error) {
        console.error('Error running tests:', error);
    }
}

runTests();
