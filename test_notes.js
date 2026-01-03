// using global fetch
async function runTests() {
    const baseUrl = 'http://localhost:3001';
    let cookie = '';
    const patientId = 1; // Assuming patient 1 exists from previous tests

    // 1. Login
    console.log('[1] Logging in...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    if (!loginRes.ok) {
        console.error('Login failed:', loginRes.status);
        return;
    }

    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) {
        cookie = setCookie.split(';')[0];
    }
    console.log('Logged in.');

    // 2. Create Note
    console.log('\n[2] Creating Note...');
    const noteContent = `Test Note ${Date.now()}`;
    const createRes = await fetch(`${baseUrl}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ patient_id: patientId, content: noteContent })
    });
    const text = await createRes.text();
    let createdNote;
    try {
        createdNote = JSON.parse(text);
        console.log('Status:', createRes.status, createdNote);
    } catch (e) {
        console.error('JSON Parse Error:', e);
        console.error('Response Status:', createRes.status);
        console.error('Response Text:', text);
    }

    // 3. List Notes
    console.log('\n[3] Listing Notes for Patient 1...');
    const listRes = await fetch(`${baseUrl}/patients/${patientId}/notes`, {
        headers: { 'Cookie': cookie }
    });
    const notes = await listRes.json();

    const found = notes.find(n => n.content === noteContent);
    if (found) {
        console.log('SUCCESS: Note found in list.');
        console.log(`- ${found.created_at}: ${found.content} (Author: ${found.author_username})`);
    } else {
        console.error('FAILURE: Note not found.');
    }
}

runTests().catch(console.error);
