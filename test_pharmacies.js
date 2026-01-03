
async function runTests() {
    const baseUrl = 'http://localhost:3001';
    let cookie = '';

    // 1. Login
    console.log('[1] Logging in...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    if (!loginRes.ok) {
        console.error('Login failed');
        return;
    }
    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    console.log('Logged in.');

    // 2. Create Pharmacy
    console.log('\n[2] Creating Pharmacy "Test Rx"...');
    const createRes = await fetch(`${baseUrl}/pharmacies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ name: 'Test Rx', address: '123 Test St', phone: '555-0000' })
    });
    const created = await createRes.json();
    console.log('Created:', createRes.status, created);

    if (createRes.status !== 201) return;

    // 3. List Pharmacies
    console.log('\n[3] Listing Pharmacies...');
    const listRes = await fetch(`${baseUrl}/pharmacies`, { headers: { 'Cookie': cookie } });
    const list = await listRes.json();
    const found = list.find(p => p.id === created.id);
    if (found) {
        console.log('SUCCESS: Found in list.', found);
    } else {
        console.error('FAILURE: Not found in list.');
    }

    // 4. Update Pharmacy
    console.log('\n[4] Updating Pharmacy...');
    const updateRes = await fetch(`${baseUrl}/pharmacies/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ name: 'Test Rx Updated', address: '123 New Addr', phone: '555-1111' })
    });
    console.log('Update Status:', updateRes.status);

    // 5. Delete Pharmacy
    console.log('\n[5] Deleting Pharmacy...');
    const delRes = await fetch(`${baseUrl}/pharmacies/${created.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': cookie }
    });
    console.log('Delete Status:', delRes.status);

    // 6. Verify Delete (Soft)
    console.log('\n[6] Verifying Deletion (should be gone from default list)...');
    const list2Res = await fetch(`${baseUrl}/pharmacies`, { headers: { 'Cookie': cookie } });
    const list2 = await list2Res.json();
    if (!list2.find(p => p.id === created.id)) {
        console.log('SUCCESS: Pharmacy no longer in active list.');
    } else {
        console.error('FAILURE: Pharmacy still in list.');
    }
}

runTests().catch(console.error);
