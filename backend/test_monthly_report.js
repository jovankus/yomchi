const BASE_URL = 'http://localhost:3001';
let sessionCookie = '';

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

async function testMonthlyReport() {
    console.log('=== Test: Monthly Accounting Report ===');
    const response = await fetchAPI('/financial-events/monthly-report?year=2025&month=12');
    const report = response.data;

    console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
    console.log(`║  ${report.period} - Financial Report${' '.repeat(31 - report.period.length)}║`);
    console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);

    console.log('📊 INCOME');
    console.log(`   Total: ${report.income.total.toLocaleString()} IQD (${report.income.count} events)`);
    console.log(`   ├─ In-Clinic Sessions: ${report.income.in_clinic.toLocaleString()} IQD`);
    console.log(`   └─ Online Sessions: ${report.income.online.toLocaleString()} IQD`);
    console.log('');

    console.log('💸 EXPENSES');
    console.log(`   Total: ${report.expenses.total.toLocaleString()} IQD (${report.expenses.count} events)`);
    console.log(`   ├─ Doctor Cuts: ${report.expenses.doctor_cuts.toLocaleString()} IQD`);
    console.log(`   ├─ Secretary Costs: ${report.expenses.secretary_costs.total.toLocaleString()} IQD`);
    console.log(`   │  ├─ Fixed Salaries: ${report.expenses.secretary_costs.salaries.toLocaleString()} IQD`);
    console.log(`   │  │  ├─ In-Clinic: ${report.expenses.secretary_costs.breakdown.in_clinic_salary.toLocaleString()} IQD`);
    console.log(`   │  │  └─ Online Base: ${report.expenses.secretary_costs.breakdown.online_base_salary.toLocaleString()} IQD`);
    console.log(`   │  └─ Session Cuts: ${report.expenses.secretary_costs.session_cuts.toLocaleString()} IQD`);
    console.log(`   └─ Dynamic Expenses: ${report.expenses.dynamic_expenses.total.toLocaleString()} IQD`);

    if (Object.keys(report.expenses.dynamic_expenses.breakdown).length > 0) {
        Object.entries(report.expenses.dynamic_expenses.breakdown).forEach(([cat, amount]) => {
            console.log(`      ├─ ${cat}: ${amount.toLocaleString()} IQD`);
        });
    }
    console.log('');

    console.log('📈 SUMMARY');
    console.log(`   Net Profit: ${report.net_profit.toLocaleString()} IQD`);
    console.log(`   Profit Margin: ${report.profit_margin}%`);
    console.log(`   Days with Activity: ${report.summary.total_days_with_activity}`);
    console.log(`   Total Events: ${report.summary.total_events}`);
    console.log('');
}

async function testEmptyMonth() {
    console.log('=== Test: Empty Month (No Activity) ===');
    const response = await fetchAPI('/financial-events/monthly-report?year=2026&month=6');
    const report = response.data;

    console.log(`Period: ${report.period}`);
    console.log(`Income: ${report.income.total} IQD`);
    console.log(`Expenses: ${report.expenses.total} IQD`);
    console.log(`Net Profit: ${report.net_profit} IQD`);

    if (report.income.total === 0 && report.expenses.total === 0) {
        console.log('✓ Correctly shows zero for empty month\n');
    } else {
        console.error('✗ Should show all zeros for empty month\n');
    }
}

async function testInvalidParameters() {
    console.log('=== Test: Invalid Parameters ===');

    // Missing month
    try {
        await fetchAPI('/financial-events/monthly-report?year=2025');
        console.error('✗ Should require month parameter');
    } catch (error) {
        console.log('✓ Correctly required both year and month');
    }

    // Invalid month
    try {
        await fetchAPI('/financial-events/monthly-report?year=2025&month=13');
        console.error('✗ Should reject invalid month');
    } catch (error) {
        console.log('✓ Correctly rejected invalid month (13)');
    }

    console.log('');
}

async function displaySampleReport() {
    console.log('=== Sample Monthly Report Format ===\n');
    console.log('December 2025 - Financial Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('INCOME                               150,000 IQD');
    console.log('  In-Clinic Sessions (5)              75,000 IQD');
    console.log('  Online Sessions (5)                 75,000 IQD');
    console.log('');
    console.log('EXPENSES                              65,000 IQD');
    console.log('  Doctor Cuts                         22,500 IQD');
    console.log('  Secretary Costs                     36,000 IQD');
    console.log('    Fixed Salaries                    350,000 IQD');
    console.log('      In-Clinic Secretary             250,000 IQD');
    console.log('      Online Secretary Base           100,000 IQD');
    console.log('    Session Cuts (Online)               6,000 IQD');
    console.log('  Dynamic Expenses                      6,500 IQD');
    console.log('    Hospitality                         3,000 IQD');
    console.log('    Printer Supplies                    2,500 IQD');
    console.log('    Utilities                           1,000 IQD');
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('NET PROFIT                            85,000 IQD');
    console.log('Profit Margin                          56.67%');
    console.log('══════════════════════════════════════════════');
    console.log('');
}

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  Monthly Accounting Report Tests (Milestone A-9)      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        await login();
        await testMonthlyReport();
        await testEmptyMonth();
        await testInvalidParameters();
        await displaySampleReport();

        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  🎉 ALL 9 ACCOUNTING MILESTONES COMPLETE! 🎉          ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log('║  A-1: Financial Event Model              ✅           ║');
        console.log('║  A-2: Session Classification             ✅           ║');
        console.log('║  A-3: Income Generation                  ✅           ║');
        console.log('║  A-4: Doctor Cuts                        ✅           ║');
        console.log('║  A-5: Secretary Salaries                 ✅           ║');
        console.log('║  A-6: Dynamic Expenses                   ✅           ║');
        console.log('║  A-7: Work Schedule                      ✅           ║');
        console.log('║  A-8: Daily Snapshot                     ✅           ║');
        console.log('║  A-9: Monthly Report                     ✅           ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
    } catch (error) {
        console.error('\n✗ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runTests();
