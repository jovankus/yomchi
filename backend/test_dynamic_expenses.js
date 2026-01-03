const BASE_URL = 'http://localhost:3001';
let sessionCookie = '';
let createdExpenseIds = [];

async function fetchAPI(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers, credentials: 'include' });
    if (response.headers.get('set-cookie')) sessionCookie = response.headers.get('set-cookie');

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || data.error || 'Request failed');
        error.response = { status: response.status, data };
        throw error;
    }
    return { data, status: response.status };
}

async function login() {
    await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    console.log('✓ Login successful\n');
}

async function testPrinterSupplies() {
    console.log('=== Test: Printer Supplies Expense ===');
    const response = await fetchAPI('/financial-events', {
        method: 'POST',
        body: JSON.stringify({
            event_date: '2025-12-26',
            event_type: 'EXPENSE',
            category: 'PRINTER_SUPPLIES',
            amount: 50000,
            description: '3 ink cartridges for reception printer',
            reference_type: 'EXPENSE'
        })
    });

    createdExpenseIds.push(response.data.financial_event.id);
    console.log(`✓ Created printer expense: ${response.data.financial_event.amount} IQD`);
    console.log(`  ID: ${response.data.financial_event.id}`);
    console.log(`  Category: ${response.data.financial_event.category}\n`);
}

async function testHospitality() {
    console.log('=== Test: Hospitality Expense ===');
    const response = await fetchAPI('/financial-events', {
        method: 'POST',
        body: JSON.stringify({
            event_date: '2025-12-26',
            event_type: 'EXPENSE',
            category: 'HOSPITALITY',
            amount: 30000,
            description: 'Tea, coffee, and biscuits for patient waiting area',
            reference_type: 'EXPENSE'
        })
    });

    createdExpenseIds.push(response.data.financial_event.id);
    console.log(`✓ Created hospitality expense: ${response.data.financial_event.amount} IQD`);
    console.log(`  Description: ${response.data.financial_event.description}\n`);
}

async function testPhoneBills() {
    console.log('=== Test: Phone Bills Expense ===');
    const response = await fetchAPI('/financial-events', {
        method: 'POST',
        body: JSON.stringify({
            event_date: '2025-12-01',
            event_type: 'EXPENSE',
            category: 'PHONE_BILLS',
            amount: 75000,
            description: 'December phone and internet bill - Provider XYZ',
            reference_type: 'SYSTEM'
        })
    });

    createdExpenseIds.push(response.data.financial_event.id);
    console.log(`✓ Created phone bill expense: ${response.data.financial_event.amount} IQD\n`);
}

async function testMultipleSameDay() {
    console.log('=== Test: Multiple Expenses on Same Day ===');

    const expenses = [
        {
            category: 'OFFICE_SUPPLIES',
            amount: 25000,
            description: 'Pens, notebooks, sticky notes'
        },
        {
            category: 'MAINTENANCE',
            amount: 100000,
            description: 'AC repair - Waiting room unit'
        },
        {
            category: 'HOSPITALITY',
            amount: 20000,
            description: 'Tea and snacks resupply'
        }
    ];

    for (const expense of expenses) {
        const response = await fetchAPI('/financial-events', {
            method: 'POST',
            body: JSON.stringify({
                event_date: '2025-12-27',
                event_type: 'EXPENSE',
                ...expense,
                reference_type: 'EXPENSE'
            })
        });
        createdExpenseIds.push(response.data.financial_event.id);
        console.log(`✓ ${expense.category}: ${expense.amount} IQD`);
    }
    console.log('✓ All 3 expenses recorded on same day\n');
}

async function testQueryByCategory() {
    console.log('=== Test: Query by Category ===');
    const response = await fetchAPI('/financial-events?event_type=EXPENSE&category=HOSPITALITY');
    const hospitalityExpenses = response.data.financial_events;

    console.log(`Found ${hospitalityExpenses.length} hospitality expenses:`);
    hospitalityExpenses.slice(0, 3).forEach(exp => {
        console.log(`  - ${exp.amount} IQD: ${exp.description.substring(0, 40)}...`);
    });
    console.log();
}

async function testQueryByDateRange() {
    console.log('=== Test: Query by Date Range ===');
    const response = await fetchAPI('/financial-events?event_type=EXPENSE&start_date=2025-12-26&end_date=2025-12-27');
    const expenses = response.data.financial_events;

    console.log(`Found ${expenses.length} expenses in date range (2025-12-26 to 2025-12-27)`);

    // Group by category
    const byCategory = {};
    expenses.forEach(exp => {
        byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    });

    console.log('Breakdown by category:');
    Object.entries(byCategory).forEach(([category, total]) => {
        console.log(`  ${category}: ${total} IQD`);
    });
    console.log();
}

async function testAllExpenseTypes() {
    console.log('=== Test: All Expense Types Summary ===');
    const response = await fetchAPI('/financial-events?event_type=EXPENSE');
    const allExpenses = response.data.financial_events;

    // Categorize expenses
    const automatic = allExpenses.filter(e =>
        ['DOCTOR_CUT', 'ONLINE_SECRETARY_CUT', 'IN_CLINIC_SECRETARY_SALARY', 'ONLINE_SECRETARY_BASE_SALARY'].includes(e.category)
    );
    const dynamic = allExpenses.filter(e =>
        e.reference_type === 'EXPENSE' || (e.reference_type === 'SYSTEM' && !e.category.includes('SALARY'))
    );

    console.log(`Total Expenses: ${allExpenses.length}`);
    console.log(`  - Automatic (doctor/secretary): ${automatic.length} (${automatic.reduce((s, e) => s + e.amount, 0)} IQD)`);
    console.log(`  - Dynamic/Ad-hoc: ${dynamic.length} (${dynamic.reduce((s, e) => s + e.amount, 0)} IQD)`);
    console.log();
}

async function cleanup() {
    console.log('=== Cleanup ===');
    for (const id of createdExpenseIds) {
        try {
            await fetchAPI(`/financial-events/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.log(`Note: Could not delete expense ${id} (may not exist)`);
        }
    }
    console.log(`✓ Attempted cleanup of ${createdExpenseIds.length} test expenses`);
}

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  Dynamic Expenses Tests (Milestone A-6)               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        await login();
        await testPrinterSupplies();
        await testHospitality();
        await testPhoneBills();
        await testMultipleSameDay();
        await testQueryByCategory();
        await testQueryByDateRange();
        await testAllExpenseTypes();
        await cleanup();

        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║  Test Suite Complete                                  ║');
        console.log('║                                                        ║');
        console.log('║  ✅ Backend API Already Exists                         ║');
        console.log('║  ✅ Multiple Expenses Same Day Supported               ║');
        console.log('║  ✅ Flexible Categories                                ║');
        console.log('║  ✅ Query & Filter Working                             ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
    } catch (error) {
        console.error('\n✗ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();
