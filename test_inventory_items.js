
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

    // 2. Create Item
    console.log('\n[2] Creating Inventory Item "Paracetamol"...');
    const createRes = await fetch(`${baseUrl}/inventory/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({
            generic_name: 'Paracetamol',
            brand_name: 'Panadol',
            manufacturer: 'GSK',
            form: 'Tablet',
            strength_mg: 500,
            strength_unit: 'mg',
            pack_size: 20,
            barcode: '123456789'
        })
    });

    const text = await createRes.text();
    let created;
    try {
        created = JSON.parse(text);
    } catch (e) {
        console.error('Failed to parse JSON:', text);
        return;
    }
    console.log('Created:', createRes.status, created);

    if (createRes.status !== 201) return;

    // 3. List Items (Search)
    console.log('\n[3] Searching for "Panadol"...');
    const searchRes = await fetch(`${baseUrl}/inventory/items?search=Panadol`, { headers: { 'Cookie': cookie } });
    const list = await searchRes.json();
    const found = list.find(i => i.id === created.id);
    if (found) {
        console.log('SUCCESS: Found in search.', found.generic_name, found.brand_name);
    } else {
        console.error('FAILURE: Not found in search.');
    }

    // 4. Update Item
    console.log('\n[4] Updating Item...');
    const updateRes = await fetch(`${baseUrl}/inventory/items/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({
            generic_name: 'Paracetamol',
            brand_name: 'Panadol Extra', // Changed
            manufacturer: 'GSK',
            form: 'Tablet',
            strength_mg: 500,
            strength_unit: 'mg',
            pack_size: 24, // Changed
            barcode: '123456789'
        })
    });
    console.log('Update Status:', updateRes.status);

    // 5. Delete Item
    console.log('\n[5] Deleting Item...');
    const delRes = await fetch(`${baseUrl}/inventory/items/${created.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': cookie }
    });
    console.log('Delete Status:', delRes.status);

    // 6. Verify Delete (Soft)
    console.log('\n[6] Verifying Deletion...');
    const list2Res = await fetch(`${baseUrl}/inventory/items`, { headers: { 'Cookie': cookie } });
    const list2 = await list2Res.json();
    if (!list2.find(i => i.id === created.id)) {
        console.log('SUCCESS: Item no longer in active list.');
    } else {
        console.error('FAILURE: Item still in list.');
    }
}

runTests().catch(console.error);
