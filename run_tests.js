/**
 * PracticeClone Test Suite Runner
 * 
 * Runs all tests and provides a summary report.
 * 
 * Usage: node run_tests.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('╔═════════════════════════════════════════════════════════╗');
console.log('║           PracticeClone Test Suite                      ║');
console.log('╚═════════════════════════════════════════════════════════╝\n');

const tests = [
    // Backend tests
    { name: 'Doctor Cut Auto-Rule', file: 'backend/test_doctor_cut_auto_rule.js' },
    { name: 'Financial Events', file: 'backend/test_financial_events.js' },
    { name: 'Doctor Cuts', file: 'backend/test_doctor_cuts.js' },
    { name: 'Session Classification', file: 'backend/test_session_classification.js' },
    { name: 'Daily Summary', file: 'backend/test_daily_summary.js' },
    { name: 'Monthly Report', file: 'backend/test_monthly_report.js' },

    // Integration tests
    { name: 'Stock Movements', file: 'test_stock_movements.js' },
    { name: 'Dispense Flow', file: 'test_dispense_flow.js' },
    { name: 'Forecast Alerts', file: 'test_forecast_alerts.js' },
    { name: 'Inventory Batches', file: 'test_inventory_batches.js' },
    { name: 'Patient Actions', file: 'test_patient_actions.js' },
    { name: 'Appointments', file: 'test_appointments.js' },
];

const results = [];
let passed = 0;
let failed = 0;

console.log(`Running ${tests.length} test suites...\n`);

for (const test of tests) {
    const fullPath = path.join(__dirname, test.file);

    if (!fs.existsSync(fullPath)) {
        console.log(`⏭️  ${test.name}: SKIPPED (file not found)`);
        results.push({ name: test.name, status: 'skipped' });
        continue;
    }

    process.stdout.write(`🔄 ${test.name}... `);

    try {
        execSync(`node ${test.file}`, {
            cwd: __dirname,
            timeout: 30000,
            stdio: 'pipe'
        });
        console.log('✅ PASSED');
        results.push({ name: test.name, status: 'passed' });
        passed++;
    } catch (err) {
        console.log('❌ FAILED');
        results.push({ name: test.name, status: 'failed', error: err.message });
        failed++;
    }
}

// Summary
console.log('\n═══════════════════════════════════════════════════════════');
console.log('                     TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`  Total:   ${tests.length}`);
console.log(`  Passed:  ${passed} ✅`);
console.log(`  Failed:  ${failed} ❌`);
console.log(`  Skipped: ${results.filter(r => r.status === 'skipped').length} ⏭️`);

if (failed > 0) {
    console.log('\n  Failed Tests:');
    results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`    - ${r.name}`);
    });
}

console.log('\n═══════════════════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
