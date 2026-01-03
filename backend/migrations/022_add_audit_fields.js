const db = require('../db');

db.serialize(() => {
    console.log('Adding audit fields to tables...');

    // Add audit fields to financial_events
    db.run(`ALTER TABLE financial_events ADD COLUMN updated_at TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding updated_at to financial_events:', err.message);
        } else {
            console.log('✓ financial_events.updated_at added');
        }
    });

    db.run(`ALTER TABLE financial_events ADD COLUMN updated_by TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding updated_by to financial_events:', err.message);
        } else {
            console.log('✓ financial_events.updated_by added');
        }
    });

    db.run(`ALTER TABLE financial_events ADD COLUMN source TEXT DEFAULT 'manual'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding source to financial_events:', err.message);
        } else {
            console.log('✓ financial_events.source added');
        }
    });

    // Add audit fields to appointments
    db.run(`ALTER TABLE appointments ADD COLUMN updated_at TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding updated_at to appointments:', err.message);
        } else {
            console.log('✓ appointments.updated_at added');
        }
    });

    db.run(`ALTER TABLE appointments ADD COLUMN updated_by TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding updated_by to appointments:', err.message);
        } else {
            console.log('✓ appointments.updated_by added');
        }
    });

    // Add audit fields to inventory_batches
    db.run(`ALTER TABLE inventory_batches ADD COLUMN updated_at TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding updated_at to inventory_batches:', err.message);
        } else {
            console.log('✓ inventory_batches.updated_at added');
        }
    });

    db.run(`ALTER TABLE inventory_batches ADD COLUMN updated_by TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding updated_by to inventory_batches:', err.message);
        } else {
            console.log('✓ inventory_batches.updated_by added');
        }
    });

    // Add created_by to appointments if missing
    db.run(`ALTER TABLE appointments ADD COLUMN created_by TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding created_by to appointments:', err.message);
        } else {
            console.log('✓ appointments.created_by added');
        }
    });

    // Add source to appointments for traceability
    db.run(`ALTER TABLE appointments ADD COLUMN source TEXT DEFAULT 'manual'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding source to appointments:', err.message);
        } else {
            console.log('✓ appointments.source added');
        }
    });

    console.log('\n✅ Audit fields migration complete');
});
