const BASE_URL = 'http://localhost:3001';
let sessionCookie = '';
let testPatientId = null;
let testDate = '2025-12-28'; // Sunday (clinic open)

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

async function createTestPatient() {
    const response = await fetchAPI('/patients', {
        method: 'POST',
        body: JSON.stringify({
            first_name: 'Daily',
            last_name: 'SummaryTest',
            date_of_birth: '1990-01-01',
            phone: '1234567890'
        })
    });
    testPatientId = response.data.id;
    console.log(`✓ Created test patient ID: ${testPatientId}\n`);
}

async function createTestData() {
    console.log('=== Creating Test Financial Data ===');

    // Create IN_CLINIC PAID appointment (15,000 income + 2,250 doctor cut)
    await fetchAPI('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: `${testDate} 10:00:00`,
            end_at: `${testDate} 11:00:00`,
            session_type: 'IN_CLINIC',
            payment_status: 'PAID',
            doctor_cut_percent: 15
        })
    });
    console.log('✓ Created IN_CLINIC PAID appointment');

    // Create ONLINE PAID appointment (20,000 income + 4,000 doctor cut + 2,000 secretary cut)
    await fetchAPI('/appointments', {
        method: 'POST',
        body: JSON.stringify({
            patient_id: testPatientId,
            start_at: `${testDate} 14:00:00`,
            end_at: `${testDate} 15:00:00`,
            session_type: 'ONLINE',
            payment_status: 'PAID',
            doctor_cut_percent: 20
        })
    });
    console.log('✓ Created ONLINE PAID appointment');

    // Add dynamic expense - hospitality
    await fetchAPI('/financial-events', {
        method: 'POST',
        body: JSON.stringify({
            event_date: testDate,
            event_type: 'EXPENSE',
            category: 'HOSPITALITY',
            amount: 1500,
            description: 'Tea and snacks for patients',
            reference_type: 'EXPENSE'
        })
    });
    console.log('✓ Created hospitality expense');

    // Add dynamic expense - printer supplies
    await fetchAPI('/financial-events', {
        method: 'POST',
        body: JSON.stringify({
            event_date: testDate,
            event_type: 'EXPENSE',
            category: 'PRINTER_SUPPLIES',
            amount: 2000,
            description: 'Printer ink',
            reference_type: 'EXPENSE'
        })
    });
    console.log('✓ Created printer supplies expense\n');
}

async function testDailySummary() {
    console.log('=== Test: Daily Summary ===');
    const response = await fetchAPI(`/financial-events/daily-summary?date=${testDate}`);
    const summary = response.data;

    console.log(`Date: ${summary.date}`);
    console.log('');

    console.log('INCOME:');
    console.log(`  Total: ${summary.income.total} IQD (${summary.income.count} events)`);
    console.log('  Breakdown:');
    Object.entries(summary.income.breakdown).forEach(([category, amount]) => {
        console.log(`    ${category}: ${amount} IQD`);
    });
    console.log('');

    console.log('EXPENSES:');
    console.log(`  Total: ${summary.expenses.total} IQD (${summary.expenses.count} events)`);
    console.log('  Breakdown:');
    Object.entries(summary.expenses.breakdown).forEach(([category, amount]) => {
        console.log(`    ${category}: ${amount} IQD`);
    });
    console.log('');

    console.log(`NET PROFIT: ${summary.net_profit} IQD`);
    console.log('');

    // Verify calculations
    const expectedIncome = 15000 + 20000; // IN_CLINIC + ONLINE
    const expectedExpenses = 2250 + 4000 + 2000 + 1500 + 2000; // Doctor cuts + secretary + hospitality + printer
    const expectedNet = expectedIncome - expectedExpenses;

    console.log('Verification:');
    console.log(summary.income.total === expectedIncome
        ? `✓ Income total correct (${expectedIncome})`
        : `✗ Income total wrong (expected ${expectedIncome}, got ${summary.income.total})`);
    console.log(summary.expenses.total === expectedExpenses
        ? `✓ Expense total correct (${expectedExpenses})`
        : `✗ Expense total wrong (expected ${expectedExpenses}, got ${summary.expenses.total})`);
    console.log(summary.net_profit === expectedNet
        ? `✓ Net profit correct (${expectedNet})`
        : `✗ Net profit wrong (expected ${expectedNet}, got ${summary.net_profit})`);
    console.log('');
}

async function testEmptyDay() {
    console.log('=== Test: Empty Day (No Activity) ===');
    const emptyDate = '2025-12-29'; // Monday (no data)
    const response = await fetchAPI(`/financial-events/daily-summary?date=${emptyDate}`);
    const summary = response.data;

    console.log(`Date: ${summary.date}`);
    console.log(`Income: ${summary.income.total} IQD`);
    console.log(`Expenses: ${summary.expenses.total} IQD`);
    console.log(`Net Profit: ${summary.net_profit} IQD`);

    if (summary.income.total === 0 && summary.expenses.total === 0 && summary.net_profit === 0) {
        console.log('✓ Correctly shows zero for empty day\n');
    } else {
        console.error('✗ Should show all zeros for empty day\n');
    }
}

async function testInvalidDate() {
    console.log('=== Test: Invalid Date Format ===');
    try {
        await fetchAPI('/financial-events/daily-summary?date=invalid');
        console.error('✗ Should reject invalid date\n');
    } catch (error) {
        if (error.response?.data?.error?.includes('Invalid date format')) {
            console.log('✓ Correctly rejected invalid date format');
            console.log(`  Error: ${error.response.data.error}\n`);
        } else {
            console.error('✗ Wrong error:', error.response?.data, '\n');
        }
    }
}

async function testMissingDate() {
    console.log('=== Test: Missing Date Parameter ===');
    try {
        await fetchAPI('/financial-events/daily-summary');
        console.error('✗ Should require date parameter\n');
    } catch (error) {
        if (error.response?.data?.error?.includes('date parameter is required')) {
            console.log('✓ Correctly required date parameter');
            console.log(`  Error: ${error.response.data.error}\n`);
        } else {
            console.error('✗ Wrong error:', error.response?.data, '\n');
        }
    }
}

async function displayBreakdownExample() {
    console.log('=== Example Daily Breakdown ===');
    console.log(`Date: ${testDate} (Sunday)`);
    console.log('');
    console.log('Income Sources:');
    console.log('  2 IN_CLINIC sessions  15,000 IQD');
    console.log('  1 ONLINE session      20,000 IQD');
    console.log('  ────────────────────────────────');
    console.log('  Total Income:         35,000 IQD');
    console.log('');
    console.log('Expense Sources:');
    console.log('  Doctor cuts (15%)      2,250 IQD');
    console.log('  Doctor cuts (20%)      4,000 IQD');
    console.log('  Secretary cut (10%)    2,000 IQD');
    console.log('  Hospitality            1,500 IQD');
    console.log('  Printer supplies       2,000 IQD');
    console.log('  ────────────────────────────────');
    console.log('  Total Expenses:       11,750 IQD');
    console.log('');
    console.log('  ════════════════════════════════');
    console.log('  NET PROFIT:           23,250 IQD');
    console.log('  ════════════════════════════════');
    console.log('');
}

async function cleanup() {
    // Note: Cleanup handled by deleting patient (cascades to appointments)
    if (testPatientId) {
        try { await fetchAPI(`/patients/${testPatientId}`, { method: 'DELETE' }); } catch { }
    }
    console.log('✓ Cleanup complete');
}

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  Daily Accounting Snapshot Tests (Milestone A-8)      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        await login();
        await createTestPatient();
        await createTestData();
        await testDailySummary();
        await testEmptyDay();
        await testInvalidDate();
        await testMissingDate();
        await displayBreakdownExample();
        await cleanup();

        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║  Test Suite Complete                                  ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
    } catch (error) {
        console.error('\n✗ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runTests();
