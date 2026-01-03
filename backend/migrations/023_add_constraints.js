const db = require('../db');

db.serialize(() => {
    console.log('Adding database constraints...');

    // Create a view to check stock levels per batch
    // This helps enforce non-negative stock at the application level
    db.run(`
        CREATE VIEW IF NOT EXISTS v_batch_stock_levels AS
        SELECT 
            b.id as batch_id,
            b.pharmacy_id,
            b.item_id,
            b.qty_units as initial_qty,
            COALESCE(SUM(
                CASE 
                    WHEN m.type = 'RECEIVE' THEN m.qty_units
                    WHEN m.type = 'DISPENSE' THEN -m.qty_units
                    WHEN m.type = 'ADJUST' THEN m.qty_units
                    ELSE 0
                END
            ), 0) as movement_total,
            b.qty_units + COALESCE(SUM(
                CASE 
                    WHEN m.type = 'RECEIVE' THEN m.qty_units
                    WHEN m.type = 'DISPENSE' THEN -m.qty_units
                    WHEN m.type = 'ADJUST' THEN m.qty_units
                    ELSE 0
                END
            ), 0) as current_stock
        FROM inventory_batches b
        LEFT JOIN stock_movements m ON m.batch_id = b.id
        GROUP BY b.id
    `, (err) => {
        if (err && !err.message.includes('already exists')) {
            console.error('Error creating stock levels view:', err.message);
        } else {
            console.log('✓ v_batch_stock_levels view created');
        }
    });

    // Create index on stock_movements for better query performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_movements_pharmacy_item 
            ON stock_movements (pharmacy_id, item_id)`, (err) => {
        if (err) console.error('Error creating index:', err.message);
        else console.log('✓ idx_movements_pharmacy_item index created');
    });

    // Create index for financial events by reference
    db.run(`CREATE INDEX IF NOT EXISTS idx_financial_events_reference 
            ON financial_events (reference_type, reference_id)`, (err) => {
        if (err) console.error('Error creating index:', err.message);
        else console.log('✓ idx_financial_events_reference index created');
    });

    // Create trigger to update updated_at on appointments
    db.run(`
        CREATE TRIGGER IF NOT EXISTS tr_appointments_updated_at
        AFTER UPDATE ON appointments
        BEGIN
            UPDATE appointments SET updated_at = datetime('now')
            WHERE id = NEW.id AND updated_at IS NULL;
        END
    `, (err) => {
        if (err && !err.message.includes('already exists')) {
            console.error('Error creating appointments trigger:', err.message);
        } else {
            console.log('✓ tr_appointments_updated_at trigger created');
        }
    });

    // Create trigger to update updated_at on financial_events
    db.run(`
        CREATE TRIGGER IF NOT EXISTS tr_financial_events_updated_at
        AFTER UPDATE ON financial_events
        BEGIN
            UPDATE financial_events SET updated_at = datetime('now')
            WHERE id = NEW.id AND updated_at IS NULL;
        END
    `, (err) => {
        if (err && !err.message.includes('already exists')) {
            console.error('Error creating financial_events trigger:', err.message);
        } else {
            console.log('✓ tr_financial_events_updated_at trigger created');
        }
    });

    console.log('\n✅ Constraints migration complete');
});
