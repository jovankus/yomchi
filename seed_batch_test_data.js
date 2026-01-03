// Quick seed script to create test data for batch operations
const baseUrl = 'http://localhost:3001';
let sessionCookie = '';

async function login() {
    const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    const cookies = res.headers.get('set-cookie');
    if (cookies) sessionCookie = cookies.split(';')[0];
    return res.ok;
}

async function createPharmacy() {
    const res = await fetch(`${baseUrl}/pharmacies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify({
            name: 'Main Pharmacy',
            address: '123 Main St',
            phone: '555-1000',
            active: 1
        })
    });
    const data = await res.json();
    console.log('Created pharmacy:', data);
    return data.id;
}

async function createItem() {
    const res = await fetch(`${baseUrl}/inventory/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify({
            generic_name: 'Amoxicillin',
            brand_name: 'Amoxil',
            manufacturer: 'Pfizer',
            form: 'Capsule',
            strength_mg: 500,
            strength_unit: 'mg',
            pack_size: 30,
            barcode: '987654321'
        })
    });
    const data = await res.json();
    console.log('Created item:', data);
    return data.id;
}

async function createSupplier() {
    const res = await fetch(`${baseUrl}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify({
            name: 'Global Pharma Supply',
            phone: '+1-555-2000',
            address: '456 Supply Blvd',
            notes: 'Main supplier'
        })
    });
    const data = await res.json();
    console.log('Created supplier:', data);
    return data.id;
}

async function seed() {
    console.log('Seeding database...\n');
    await login();
    await createPharmacy();
    await createItem();
    await createSupplier();
    console.log('\nSeed complete!');
}

seed().catch(console.error);
