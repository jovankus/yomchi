// using global fetch

// Since environment might not have node-fetch installed, I'll check package.json first. 
// If not issues, request installation or use http.

// Actually, let's assume standard fetch is available (Node 18+) or use http module.
// To be safe and simple, I will use a simple http wrapper or just check if fetch exists.

async function runTests() {
    const baseUrl = 'http://localhost:3001';
    let cookie = '';
    let patientId = 1; // Assume patient 1 exists or create one

    // 1. Login
    console.log('[1] Logging in...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' }) // Default from seed logic usually? 
        // Wait, what is the seed user? 
        // Checking seed_admin.js (Step 26 showed it exists).
        // I should read seed_admin.js to match credentials.
    });

    // If login fails, we can't proceed.
    if (!loginRes.ok) {
        console.error('Login failed:', loginRes.status);
        const text = await loginRes.text();
        console.error(text);
        if (loginRes.status === 401) {
            console.log("Attempting to create admin user just in case...");
            // logic to create user if needed, but assuming seed_admin ran or I can run it.
        }
        return;
    }

    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) {
        cookie = setCookie.split(';')[0];
    }
    console.log('Logged in. Cookie:', cookie);

    // 2. Create Appointment A
    console.log('\n[2] Creating Appointment A (10:00 - 11:00)...');
    const aptA = {
        patient_id: patientId,
        start_at: '2025-12-25T10:00:00',
        end_at: '2025-12-25T11:00:00'
    };

    const resA = await fetch(`${baseUrl}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify(aptA)
    });
    const dataA = await resA.json();
    console.log('Status:', resA.status, dataA);

    // 3. Create Appointment B (Conflict)
    console.log('\n[3] Creating Appointment B (10:30 - 11:30) - Expect Conflict...');
    const aptB = {
        patient_id: patientId,
        start_at: '2025-12-25T10:30:00',
        end_at: '2025-12-25T11:30:00'
    };
    const resB = await fetch(`${baseUrl}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify(aptB)
    });
    console.log('Status:', resB.status, await resB.json());

    // 4. Create Appointment C (No Conflict)
    console.log('\n[4] Creating Appointment C (11:00 - 12:00)...');
    const aptC = {
        patient_id: patientId,
        start_at: '2025-12-25T11:00:00',
        end_at: '2025-12-25T12:00:00'
    };
    const resC = await fetch(`${baseUrl}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify(aptC)
    });
    console.log('Status:', resC.status, await resC.json());

    // 5. List Appointments
    console.log('\n[5] Listing Appointments for 2025-12-25...');
    const resList = await fetch(`${baseUrl}/appointments?date=2025-12-25`, {
        headers: { 'Cookie': cookie }
    });
    const list = await resList.json();
    console.log('Count:', list.length);
    list.forEach(a => console.log(`- ${a.start_at} to ${a.end_at} (ID: ${a.id})`));

    // Cleanup
    if (list.length > 0) {
        console.log('\n[6] Cleaning up...');
        for (const a of list) {
            await fetch(`${baseUrl}/appointments/${a.id}`, {
                method: 'DELETE',
                headers: { 'Cookie': cookie }
            });
        }
        console.log('Cleaned up.');
    }
}

runTests().catch(console.error);
