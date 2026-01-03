
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

    // 2. Create Supplier
    console.log('\n[2] Creating Supplier "MedSupply Corp"...');
    const createRes = await fetch(`${baseUrl}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({
            name: 'MedSupply Corp',
            phone: '+1-555-0100',
            address: '123 Medical St, Boston, MA',
            notes: 'Primary pharmaceutical supplier'
        })
    });
    const created = await createRes.json();
    console.log('Created:', createRes.status, created);

    if (createRes.status !== 201) return;

    // 3. List Suppliers
    console.log('\n[3] Listing all suppliers...');
    const listRes = await fetch(`${baseUrl}/suppliers`, { headers: { 'Cookie': cookie } });
    const list = await listRes.json();
    const found = list.find(s => s.id === created.id);
    if (found) {
        console.log('SUCCESS: Found in list.', found.name);
    } else {
        console.error('FAILURE: Not found in list.');
    }

    // 4. Update Supplier
    console.log('\n[4] Updating Supplier phone...');
    const updateRes = await fetch(`${baseUrl}/suppliers/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({
            name: 'MedSupply Corp',
            phone: '+1-555-0199', // Changed
            address: '123 Medical St, Boston, MA',
            notes: 'Primary pharmaceutical supplier - Updated'
        })
    });
    console.log('Update Status:', updateRes.status);

    // 5. Get Single Supplier
    console.log('\n[5] Getting single supplier...');
    const getRes = await fetch(`${baseUrl}/suppliers/${created.id}`, { headers: { 'Cookie': cookie } });
    const single = await getRes.json();
    if (single.phone === '+1-555-0199') {
        console.log('SUCCESS: Phone updated correctly.');
    } else {
        console.error('FAILURE: Phone not updated.');
    }

    // 6. Delete Supplier
    console.log('\n[6] Deleting Supplier...');
    const delRes = await fetch(`${baseUrl}/suppliers/${created.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': cookie }
    });
    console.log('Delete Status:', delRes.status);

    // 7. Verify Delete
    console.log('\n[7] Verifying Deletion...');
    const list2Res = await fetch(`${baseUrl}/suppliers`, { headers: { 'Cookie': cookie } });
    const list2 = await list2Res.json();
    if (!list2.find(s => s.id === created.id)) {
        console.log('SUCCESS: Supplier no longer in list.');
    } else {
        console.error('FAILURE: Supplier still in list.');
    }
}

runTests().catch(console.error);
