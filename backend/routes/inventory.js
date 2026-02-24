const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole, ADMIN_ROLES } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// ADMIN_ROLES only (SENIOR_DOCTOR, PERMANENT_DOCTOR)

// ==================== HELPER FUNCTIONS ====================

// Create a stock movement and update batch quantity
function createStockMovement(movementData, callback) {
    const {
        pharmacy_id,
        item_id,
        batch_id,
        type,
        qty_units,
        unit_price_at_time,
        reference,
        source,
        created_by
    } = movementData;

    // First, check if we have enough stock for negative movements
    if (batch_id && qty_units < 0) {
        db.get('SELECT qty_on_hand_units FROM inventory_batches WHERE id = ?', [batch_id], (err, batch) => {
            if (err) return callback(err);
            if (!batch) return callback(new Error('Batch not found'));

            const newQty = batch.qty_on_hand_units + qty_units;
            if (newQty < 0) {
                return callback(new Error(`Insufficient stock. Available: ${batch.qty_on_hand_units}, Requested: ${Math.abs(qty_units)}`));
            }

            // Stock is sufficient, proceed with movement creation
            proceedWithMovement();
        });
    } else {
        // No stock check needed for positive movements
        proceedWithMovement();
    }

    function proceedWithMovement() {
        const movementSql = `
            INSERT INTO stock_movements 
            (pharmacy_id, item_id, batch_id, type, qty_units, unit_price_at_time, reference, source, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const movementParams = [
            pharmacy_id,
            item_id,
            batch_id || null,
            type,
            qty_units,
            unit_price_at_time || 0,
            reference || null,
            source || 'manual',
            created_by || 'system'
        ];

        db.run(movementSql, movementParams, function (err) {
            if (err) return callback(err);

            const movementId = this.lastID;

            // Update batch qty_on_hand_units if batch_id is provided
            if (batch_id) {
                const updateSql = 'UPDATE inventory_batches SET qty_on_hand_units = qty_on_hand_units + ? WHERE id = ?';
                db.run(updateSql, [qty_units, batch_id], (err) => {
                    if (err) return callback(err);
                    callback(null, { id: movementId, ...movementData });
                });
            } else {
                callback(null, { id: movementId, ...movementData });
            }
        });
    }
}

// ==================== INVENTORY ITEMS CRUD ====================

// List inventory items (with search)
router.get('/items', requireAuth, (req, res) => {
    const { search } = req.query;
    let query = 'SELECT * FROM inventory_items WHERE active = 1';
    let params = [];

    if (search) {
        query += ' AND (generic_name LIKE ? OR brand_name LIKE ? OR barcode LIKE ?)';
        const term = `%${search}%`;
        params = [term, term, term];
    }

    query += ' ORDER BY generic_name, brand_name';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get single item
router.get('/items/:id', requireAuth, (req, res) => {
    db.get('SELECT * FROM inventory_items WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ message: 'Item not found' });
        res.json(row);
    });
});

// Create inventory item
router.post('/items', requireAuth, (req, res) => {
    const { generic_name, brand_name, manufacturer, form, strength_mg, strength_unit, pack_size, barcode } = req.body;

    if (!generic_name) return res.status(400).json({ error: 'Generic name is required' });

    const sql = `
        INSERT INTO inventory_items 
        (generic_name, brand_name, manufacturer, form, strength_mg, strength_unit, pack_size, barcode) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [generic_name, brand_name, manufacturer, form, strength_mg, strength_unit, pack_size, barcode];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logAudit(req, {
            action: 'CREATE',
            entityType: 'INVENTORY_ITEM',
            entityId: this.lastID,
            details: { generic_name, brand_name }
        });
        res.status(201).json({
            id: this.lastID,
            generic_name, brand_name, manufacturer, form, strength_mg, strength_unit, pack_size, barcode,
            active: 1
        });
    });
});

// Update inventory item
router.put('/items/:id', requireAuth, (req, res) => {
    const { generic_name, brand_name, manufacturer, form, strength_mg, strength_unit, pack_size, barcode } = req.body;
    const { id } = req.params;

    const sql = `
        UPDATE inventory_items 
        SET generic_name = ?, brand_name = ?, manufacturer = ?, form = ?, strength_mg = ?, strength_unit = ?, pack_size = ?, barcode = ?
        WHERE id = ?
    `;
    const params = [generic_name, brand_name, manufacturer, form, strength_mg, strength_unit, pack_size, barcode, id];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Item not found' });
        logAudit(req, {
            action: 'UPDATE',
            entityType: 'INVENTORY_ITEM',
            entityId: parseInt(id),
            details: { generic_name, brand_name }
        });
        res.json({ message: 'Item updated' });
    });
});

// Delete inventory item (Soft)
router.delete('/items/:id', requireAuth, (req, res) => {
    db.run('UPDATE inventory_items SET active = 0 WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Item not found' });
        logAudit(req, {
            action: 'DELETE',
            entityType: 'INVENTORY_ITEM',
            entityId: parseInt(req.params.id),
            details: { note: 'Item soft-deleted' }
        });
        res.json({ message: 'Item deleted' });
    });
});

// ==================== BATCH MANAGEMENT ====================

// List batches by pharmacy
router.get('/batches', requireAuth, (req, res) => {
    const { pharmacy_id } = req.query;

    if (!pharmacy_id) {
        return res.status(400).json({ error: 'pharmacy_id query parameter is required' });
    }

    const sql = `
        SELECT 
            ib.id,
            ib.pharmacy_id,
            ib.item_id,
            ib.supplier_id,
            ib.batch_no,
            ib.expiry_date,
            ib.received_at,
            ib.qty_received_units,
            ib.qty_on_hand_units,
            ib.purchase_unit_price,
            ib.sale_unit_price,
            ib.notes,
            ii.generic_name,
            ii.brand_name,
            ii.form,
            ii.strength_mg,
            ii.strength_unit,
            p.name as pharmacy_name,
            s.name as supplier_name
        FROM inventory_batches ib
        JOIN inventory_items ii ON ib.item_id = ii.id
        JOIN pharmacies p ON ib.pharmacy_id = p.id
        JOIN suppliers s ON ib.supplier_id = s.id
        WHERE ib.pharmacy_id = ?
        ORDER BY ib.received_at DESC
    `;

    db.all(sql, [pharmacy_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Receive stock (create new batch) - NOW USES LEDGER SYSTEM
router.post('/batches', requireAuth, (req, res) => {
    const {
        pharmacy_id,
        item_id,
        supplier_id,
        batch_no,
        expiry_date,
        qty_received_units,
        purchase_unit_price,
        sale_unit_price,
        notes
    } = req.body;

    // Validation
    if (!pharmacy_id || !item_id || !supplier_id || !batch_no || !qty_received_units) {
        return res.status(400).json({
            error: 'Required fields: pharmacy_id, item_id, supplier_id, batch_no, qty_received_units'
        });
    }

    if (qty_received_units <= 0) {
        return res.status(400).json({ error: 'qty_received_units must be greater than 0' });
    }

    if (purchase_unit_price < 0 || sale_unit_price < 0) {
        return res.status(400).json({ error: 'Prices cannot be negative' });
    }

    // Verify foreign keys exist
    db.get('SELECT id FROM pharmacies WHERE id = ?', [pharmacy_id], (err, pharmacy) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!pharmacy) return res.status(404).json({ error: 'Pharmacy not found' });

        db.get('SELECT id FROM inventory_items WHERE id = ?', [item_id], (err, item) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!item) return res.status(404).json({ error: 'Inventory item not found' });

            db.get('SELECT id FROM suppliers WHERE id = ?', [supplier_id], (err, supplier) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

                // Create batch with initial qty_on_hand = 0 (will be set by movement)
                const batchSql = `
                    INSERT INTO inventory_batches 
                    (pharmacy_id, item_id, supplier_id, batch_no, expiry_date, 
                     qty_received_units, qty_on_hand_units, purchase_unit_price, sale_unit_price, notes)
                    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
                `;

                const batchParams = [
                    pharmacy_id,
                    item_id,
                    supplier_id,
                    batch_no,
                    expiry_date || null,
                    qty_received_units,
                    purchase_unit_price || 0,
                    sale_unit_price || 0,
                    notes || null
                ];

                db.run(batchSql, batchParams, function (err) {
                    if (err) return res.status(500).json({ error: err.message });

                    const batchId = this.lastID;

                    // Create RECEIVE movement
                    const movementData = {
                        pharmacy_id,
                        item_id,
                        batch_id: batchId,
                        type: 'RECEIVE',
                        qty_units: qty_received_units,
                        unit_price_at_time: purchase_unit_price || 0,
                        reference: `Batch ${batch_no} received`,
                        source: 'batch_receive',
                        created_by: req.session.username || 'system'
                    };

                    createStockMovement(movementData, (err, movement) => {
                        if (err) {
                            // Rollback: delete the batch
                            db.run('DELETE FROM inventory_batches WHERE id = ?', [batchId]);
                            return res.status(500).json({ error: err.message });
                        }

                        res.status(201).json({
                            id: batchId,
                            pharmacy_id,
                            item_id,
                            supplier_id,
                            batch_no,
                            expiry_date,
                            qty_received_units,
                            qty_on_hand_units: qty_received_units,
                            purchase_unit_price: purchase_unit_price || 0,
                            sale_unit_price: sale_unit_price || 0,
                            notes,
                            movement_id: movement.id
                        });
                    });
                });
            });
        });
    });
});

// ==================== STOCK MOVEMENTS ====================

// List stock movements by pharmacy
router.get('/movements', requireAuth, (req, res) => {
    const { pharmacy_id, item_id, batch_id, type } = req.query;

    if (!pharmacy_id) {
        return res.status(400).json({ error: 'pharmacy_id query parameter is required' });
    }

    let sql = `
        SELECT 
            sm.id,
            sm.pharmacy_id,
            sm.item_id,
            sm.batch_id,
            sm.type,
            sm.qty_units,
            sm.unit_price_at_time,
            sm.reference,
            sm.source,
            sm.patient_id,
            sm.created_by,
            sm.created_at,
            ii.generic_name,
            ii.brand_name,
            ii.form,
            ii.strength_mg,
            ii.strength_unit,
            ib.batch_no,
            ib.expiry_date,
            p.name as pharmacy_name
        FROM stock_movements sm
        JOIN inventory_items ii ON sm.item_id = ii.id
        LEFT JOIN inventory_batches ib ON sm.batch_id = ib.id
        JOIN pharmacies p ON sm.pharmacy_id = p.id
        WHERE sm.pharmacy_id = ?
    `;

    const params = [pharmacy_id];

    if (item_id) {
        sql += ' AND sm.item_id = ?';
        params.push(item_id);
    }

    if (batch_id) {
        sql += ' AND sm.batch_id = ?';
        params.push(batch_id);
    }

    if (type) {
        sql += ' AND sm.type = ?';
        params.push(type);
    }

    sql += ' ORDER BY sm.created_at DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create manual stock movement (ADJUST or WASTE)
router.post('/movements', requireAuth, (req, res) => {
    const {
        pharmacy_id,
        item_id,
        batch_id,
        type,
        qty_units,
        unit_price_at_time,
        reference,
        source
    } = req.body;

    // Validation
    if (!pharmacy_id || !item_id || !batch_id || !type || qty_units === undefined) {
        return res.status(400).json({
            error: 'Required fields: pharmacy_id, item_id, batch_id, type, qty_units'
        });
    }

    // Only ADJUST and WASTE allowed for manual creation
    if (type !== 'ADJUST' && type !== 'WASTE') {
        return res.status(400).json({ error: 'Type must be ADJUST or WASTE' });
    }

    // WASTE must be negative
    if (type === 'WASTE' && qty_units >= 0) {
        return res.status(400).json({ error: 'WASTE qty_units must be negative' });
    }

    if (!reference) {
        return res.status(400).json({ error: 'Reference is required for manual movements' });
    }

    // Verify foreign keys
    db.get('SELECT id FROM pharmacies WHERE id = ?', [pharmacy_id], (err, pharmacy) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!pharmacy) return res.status(404).json({ error: 'Pharmacy not found' });

        db.get('SELECT id FROM inventory_items WHERE id = ?', [item_id], (err, item) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!item) return res.status(404).json({ error: 'Inventory item not found' });

            db.get('SELECT id FROM inventory_batches WHERE id = ?', [batch_id], (err, batch) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!batch) return res.status(404).json({ error: 'Batch not found' });

                // Create movement using helper function (includes stock validation)
                const movementData = {
                    pharmacy_id,
                    item_id,
                    batch_id,
                    type,
                    qty_units: parseInt(qty_units),
                    unit_price_at_time: unit_price_at_time || 0,
                    reference,
                    source: source || 'manual',
                    created_by: req.session.username || 'unknown'
                };

                createStockMovement(movementData, (err, movement) => {
                    if (err) {
                        return res.status(400).json({ error: err.message });
                    }

                    res.status(201).json(movement);
                });
            });
        });
    });
});

// ==================== DISPENSE / SALE FLOW (FIFO) ====================

// Dispense or sell stock using FIFO (First expiry, First Out)
router.post('/dispense', requireAuth, (req, res) => {
    const {
        pharmacy_id,
        item_id,
        quantity,
        patient_id,
        dispensed_by,
        notes
    } = req.body;

    // Validation
    if (!pharmacy_id || !item_id || !quantity) {
        return res.status(400).json({
            error: 'Required fields: pharmacy_id, item_id, quantity'
        });
    }

    if (quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    // Determine movement type
    const movementType = patient_id ? 'DISPENSE' : 'SALE';

    // Verify pharmacy exists
    db.get('SELECT id FROM pharmacies WHERE id = ?', [pharmacy_id], (err, pharmacy) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!pharmacy) return res.status(404).json({ error: 'Pharmacy not found' });

        // Verify item exists
        db.get('SELECT id, generic_name FROM inventory_items WHERE id = ?', [item_id], (err, item) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!item) return res.status(404).json({ error: 'Item not found' });

            // Verify patient exists if provided
            if (patient_id) {
                db.get('SELECT id FROM patients WHERE id = ?', [patient_id], (err, patient) => {
                    if (err) return res.status(500).json({ error: err.message });
                    if (!patient) return res.status(404).json({ error: 'Patient not found' });

                    proceedWithDispense();
                });
            } else {
                proceedWithDispense();
            }

            function proceedWithDispense() {
                // Get available batches ordered by expiry date (FIFO)
                const batchSql = `
                    SELECT 
                        ib.id,
                        ib.batch_no,
                        ib.qty_on_hand_units,
                        ib.expiry_date,
                        ib.sale_unit_price,
                        s.name as supplier_name
                    FROM inventory_batches ib
                    JOIN suppliers s ON ib.supplier_id = s.id
                    WHERE ib.pharmacy_id = ? 
                      AND ib.item_id = ? 
                      AND ib.qty_on_hand_units > 0
                    ORDER BY ib.expiry_date ASC, ib.received_at ASC
                `;

                db.all(batchSql, [pharmacy_id, item_id], (err, batches) => {
                    if (err) return res.status(500).json({ error: err.message });

                    if (batches.length === 0) {
                        return res.status(400).json({
                            error: 'No stock available for this item at this pharmacy'
                        });
                    }

                    // Calculate total available stock
                    const totalAvailable = batches.reduce((sum, b) => sum + b.qty_on_hand_units, 0);

                    if (totalAvailable < quantity) {
                        return res.status(400).json({
                            error: `Insufficient stock. Available: ${totalAvailable}, Requested: ${quantity}`
                        });
                    }

                    // Allocate quantity using FIFO
                    const allocations = [];
                    let remaining = quantity;

                    for (const batch of batches) {
                        if (remaining <= 0) break;

                        const toAllocate = Math.min(remaining, batch.qty_on_hand_units);
                        allocations.push({
                            batch_id: batch.id,
                            batch_no: batch.batch_no,
                            qty_allocated: toAllocate,
                            expiry_date: batch.expiry_date,
                            supplier_name: batch.supplier_name,
                            unit_price: batch.sale_unit_price
                        });

                        remaining -= toAllocate;
                    }

                    // Create movements for each allocation
                    const movements = [];
                    let completed = 0;
                    let hasError = false;

                    allocations.forEach((allocation, index) => {
                        const movementData = {
                            pharmacy_id,
                            item_id,
                            batch_id: allocation.batch_id,
                            type: movementType,
                            qty_units: -allocation.qty_allocated, // Negative for stock decrease
                            unit_price_at_time: allocation.unit_price,
                            reference: notes || `${movementType}: ${item.generic_name}`,
                            source: 'dispense',
                            created_by: dispensed_by || req.session.username || 'system',
                            patient_id: patient_id || null
                        };

                        // Update to include patient_id in movement
                        const movementSql = `
                            INSERT INTO stock_movements 
                            (pharmacy_id, item_id, batch_id, type, qty_units, unit_price_at_time, reference, source, patient_id, created_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;

                        const movementParams = [
                            movementData.pharmacy_id,
                            movementData.item_id,
                            movementData.batch_id,
                            movementData.type,
                            movementData.qty_units,
                            movementData.unit_price_at_time,
                            movementData.reference,
                            movementData.source,
                            movementData.patient_id,
                            movementData.created_by
                        ];

                        db.run(movementSql, movementParams, function (err) {
                            if (err && !hasError) {
                                hasError = true;
                                return res.status(500).json({ error: err.message });
                            }

                            if (!hasError) {
                                const movementId = this.lastID;

                                // Update batch qty_on_hand
                                const updateSql = 'UPDATE inventory_batches SET qty_on_hand_units = qty_on_hand_units + ? WHERE id = ?';
                                db.run(updateSql, [movementData.qty_units, allocation.batch_id], (err) => {
                                    if (err && !hasError) {
                                        hasError = true;
                                        return res.status(500).json({ error: err.message });
                                    }

                                    if (!hasError) {
                                        movements.push({
                                            id: movementId,
                                            type: movementType,
                                            qty_units: movementData.qty_units,
                                            batch_id: allocation.batch_id,
                                            batch_no: allocation.batch_no
                                        });

                                        completed++;

                                        // All movements completed
                                        if (completed === allocations.length && !hasError) {
                                            res.status(201).json({
                                                success: true,
                                                message: `${movementType} completed successfully`,
                                                total_quantity: quantity,
                                                type: movementType,
                                                patient_id: patient_id || null,
                                                allocations: allocations.map(a => ({
                                                    batch_id: a.batch_id,
                                                    batch_no: a.batch_no,
                                                    qty_allocated: a.qty_allocated,
                                                    expiry_date: a.expiry_date,
                                                    supplier_name: a.supplier_name
                                                })),
                                                movements
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    });
                });
            }
        });
    });
});

// ==================== INVENTORY ALERTS ====================

// Get inventory alerts for a pharmacy
router.get('/alerts', requireAuth, (req, res) => {
    const { pharmacy_id, days = 120 } = req.query;

    if (!pharmacy_id) {
        return res.status(400).json({ error: 'pharmacy_id query parameter is required' });
    }

    const daysThreshold = parseInt(days) || 120;
    const alerts = {
        expiring_soon: [],
        low_stock: [],
        fifo_warnings: [],
        summary: { total_alerts: 0, critical: 0, warning: 0, info: 0 }
    };

    // Helper to determine severity for expiring items
    function getExpirySeverity(daysUntilExpiry) {
        if (daysUntilExpiry < 30) return 'critical';
        if (daysUntilExpiry < 90) return 'warning';
        return 'info';
    }

    // Helper to determine severity for low stock
    function getLowStockSeverity(stock, reorderLevel) {
        if (stock === 0) return 'critical';
        if (stock < reorderLevel * 0.5) return 'warning';
        return 'info';
    }

    // Helper to update summary counts
    function addToSummary(severity) {
        alerts.summary.total_alerts++;
        alerts.summary[severity]++;
    }

    // 1. Check for expiring batches
    const expiringSql = `
        SELECT 
            ib.id,
            ib.batch_no,
            ib.item_id,
            ib.qty_on_hand_units,
            ib.expiry_date,
            ii.generic_name,
            ii.brand_name,
            ii.form,
            ii.strength_mg,
            ii.strength_unit,
            CAST((JULIANDAY(ib.expiry_date) - JULIANDAY('now')) AS INTEGER) as days_until_expiry
        FROM inventory_batches ib
        JOIN inventory_items ii ON ib.item_id = ii.id
        WHERE ib.pharmacy_id = ? 
          AND ib.qty_on_hand_units > 0
          AND JULIANDAY(ib.expiry_date) - JULIANDAY('now') <= ?
          AND JULIANDAY(ib.expiry_date) - JULIANDAY('now') > 0
        ORDER BY days_until_expiry ASC
    `;

    db.all(expiringSql, [pharmacy_id, daysThreshold], (err, expiringBatches) => {
        if (err) return res.status(500).json({ error: err.message });

        expiringBatches.forEach(batch => {
            const severity = getExpirySeverity(batch.days_until_expiry);
            alerts.expiring_soon.push({
                ...batch,
                severity
            });
            addToSummary(severity);
        });

        // 2. Check for low stock items
        const lowStockSql = `
            SELECT 
                ii.id as item_id,
                ii.generic_name,
                ii.brand_name,
                ii.form,
                ii.strength_mg,
                ii.strength_unit,
                ii.reorder_level,
                COALESCE(SUM(ib.qty_on_hand_units), 0) as total_stock,
                COUNT(ib.id) as batch_count
            FROM inventory_items ii
            LEFT JOIN inventory_batches ib ON ii.id = ib.item_id AND ib.pharmacy_id = ? AND ib.qty_on_hand_units > 0
            WHERE ii.active = 1
            GROUP BY ii.id
            HAVING total_stock < ii.reorder_level
        `;

        db.all(lowStockSql, [pharmacy_id], (err, lowStockItems) => {
            if (err) return res.status(500).json({ error: err.message });

            lowStockItems.forEach(item => {
                const severity = getLowStockSeverity(item.total_stock, item.reorder_level);
                alerts.low_stock.push({
                    ...item,
                    severity
                });
                addToSummary(severity);
            });

            // 3. Check for FIFO warnings (simplified version)
            // Find items where older batches (earlier expiry) have stock but weren't used recently
            const fifoSql = `
                SELECT 
                    ii.id as item_id,
                    ii.generic_name,
                    ii.brand_name,
                    ii.form,
                    ii.strength_mg,
                    ii.strength_unit,
                    (
                        SELECT ib1.batch_no
                        FROM inventory_batches ib1
                        WHERE ib1.pharmacy_id = ? AND ib1.item_id = ii.id AND ib1.qty_on_hand_units > 0
                        ORDER BY ib1.expiry_date ASC, ib1.received_at ASC
                        LIMIT 1
                    ) as oldest_batch_no,
                    (
                        SELECT ib1.expiry_date
                        FROM inventory_batches ib1
                        WHERE ib1.pharmacy_id = ? AND ib1.item_id = ii.id AND ib1.qty_on_hand_units > 0
                        ORDER BY ib1.expiry_date ASC, ib1.received_at ASC
                        LIMIT 1
                    ) as oldest_expiry,
                    (
                        SELECT ib1.qty_on_hand_units
                        FROM inventory_batches ib1
                        WHERE ib1.pharmacy_id = ? AND ib1.item_id = ii.id AND ib1.qty_on_hand_units > 0
                        ORDER BY ib1.expiry_date ASC, ib1.received_at ASC
                        LIMIT 1
                    ) as oldest_qty,
                    (
                        SELECT COUNT(*)
                        FROM inventory_batches ib2
                        WHERE ib2.pharmacy_id = ? AND ib2.item_id = ii.id AND ib2.qty_on_hand_units > 0
                    ) as batch_count
                FROM inventory_items ii
                WHERE ii.active = 1
                GROUP BY ii.id
                HAVING batch_count > 1
            `;

            db.all(fifoSql, [pharmacy_id, pharmacy_id, pharmacy_id, pharmacy_id], (err, fifoItems) => {
                if (err) return res.status(500).json({ error: err.message });

                // For items with multiple batches, check if oldest has too much stock (suggesting it's being skipped)
                fifoItems.forEach(item => {
                    // Consider it a FIFO warning if oldest batch has significant stock and there are newer batches
                    if (item.oldest_qty > 5 && item.batch_count > 1) {
                        const severity = item.oldest_qty > 10 ? 'warning' : 'info';
                        alerts.fifo_warnings.push({
                            item_id: item.item_id,
                            generic_name: item.generic_name,
                            brand_name: item.brand_name,
                            form: item.form,
                            strength_mg: item.strength_mg,
                            strength_unit: item.strength_unit,
                            older_batch_no: item.oldest_batch_no,
                            older_expiry: item.oldest_expiry,
                            older_qty: item.oldest_qty,
                            message: `Oldest batch still has ${item.oldest_qty} units. Consider prioritizing for dispense.`,
                            severity
                        });
                        addToSummary(severity);
                    }
                });

                // Return all alerts
                res.json(alerts);
            });
        });
    });
});

// ==================== SMART FORECAST ALERTS ====================

// Get smart forecast alerts for a pharmacy
router.get('/forecast-alerts', requireAuth, (req, res) => {
    const { pharmacy_id } = req.query;

    if (!pharmacy_id) {
        return res.status(400).json({ error: 'pharmacy_id query parameter is required' });
    }

    const alerts = {
        forecast_alerts: [],
        summary: { total_alerts: 0, critical: 0, warning: 0, info: 0 }
    };

    // Helper to determine severity
    function getSeverity(riskUnits, daysToExpiry) {
        if (riskUnits > 30 && daysToExpiry < 60) return 'critical';
        if (riskUnits > 15 || daysToExpiry < 90) return 'warning';
        return 'info';
    }

    // Helper to generate suggested actions
    function getSuggestedActions(riskUnits) {
        if (riskUnits > 50) {
            return 'Consider transfer to higher-demand location or promotional pricing';
        } else if (riskUnits > 20) {
            return 'Prioritize for dispensing (FIFO), consider promotional pricing';
        } else if (riskUnits > 10) {
            return 'Monitor closely, adjust future purchasing quantities';
        } else {
            return 'Prioritize for dispensing';
        }
    }

    // Helper to update summary counts
    function addToSummary(severity) {
        alerts.summary.total_alerts++;
        alerts.summary[severity]++;
    }

    // Step 1: Calculate usage from DISPENSE movements (last 90 days)
    const usageSql = `
        SELECT 
            item_id,
            SUM(ABS(qty_units)) as total_dispensed
        FROM stock_movements
        WHERE pharmacy_id = ?
          AND type = 'DISPENSE'
          AND created_at >= DATE('now', '-90 days')
        GROUP BY item_id
    `;

    db.all(usageSql, [pharmacy_id], (err, usageData) => {
        if (err) return res.status(500).json({ error: err.message });

        // Create a usage map: item_id -> avg_daily_usage
        const usageMap = {};
        usageData.forEach(row => {
            // Average daily usage = total dispensed / 90 days
            usageMap[row.item_id] = row.total_dispensed / 90;
        });

        // Step 2: Get all active batches with qty_on_hand > 0
        const batchesSql = `
            SELECT 
                ib.id,
                ib.batch_no,
                ib.item_id,
                ib.qty_on_hand_units,
                ib.expiry_date,
                ii.generic_name,
                ii.brand_name,
                ii.form,
                ii.strength_mg,
                ii.strength_unit,
                CAST((JULIANDAY(ib.expiry_date) - JULIANDAY('now')) AS INTEGER) as days_to_expiry
            FROM inventory_batches ib
            JOIN inventory_items ii ON ib.item_id = ii.id
            WHERE ib.pharmacy_id = ?
              AND ib.qty_on_hand_units > 0
              AND ib.expiry_date IS NOT NULL
              AND JULIANDAY(ib.expiry_date) > JULIANDAY('now')
        `;

        db.all(batchesSql, [pharmacy_id], (err, batches) => {
            if (err) return res.status(500).json({ error: err.message });

            // Step 3: Calculate forecast metrics for each batch
            batches.forEach(batch => {
                const avgDailyUsage = usageMap[batch.item_id] || 0;
                const daysToExpiry = batch.days_to_expiry;
                const projectedUsage = avgDailyUsage * daysToExpiry;
                const riskUnits = batch.qty_on_hand_units - projectedUsage;

                // Trigger alert if:
                // - risk_units > 0 (likely leftover stock)
                // - days_to_expiry < 180 (expiry approaching)
                // - qty_on_hand >= 5 (meaningful quantity)
                if (riskUnits > 0 && daysToExpiry < 180 && batch.qty_on_hand_units >= 5) {
                    const severity = getSeverity(riskUnits, daysToExpiry);
                    const suggestedActions = getSuggestedActions(riskUnits);

                    alerts.forecast_alerts.push({
                        batch_id: batch.id,
                        batch_no: batch.batch_no,
                        item_id: batch.item_id,
                        generic_name: batch.generic_name,
                        brand_name: batch.brand_name,
                        form: batch.form,
                        strength_mg: batch.strength_mg,
                        strength_unit: batch.strength_unit,
                        expiry_date: batch.expiry_date,
                        days_to_expiry: daysToExpiry,
                        qty_on_hand_units: batch.qty_on_hand_units,
                        avg_daily_usage: Math.round(avgDailyUsage * 10) / 10, // Round to 1 decimal
                        projected_usage_until_expiry: Math.round(projectedUsage * 10) / 10,
                        risk_units: Math.round(riskUnits),
                        message: `Likely ${Math.round(riskUnits)} units remaining at expiry`,
                        suggested_actions: suggestedActions,
                        severity
                    });

                    addToSummary(severity);
                }
            });

            // Sort by severity (critical first) then by risk_units (highest first)
            const severityOrder = { critical: 0, warning: 1, info: 2 };
            alerts.forecast_alerts.sort((a, b) => {
                if (severityOrder[a.severity] !== severityOrder[b.severity]) {
                    return severityOrder[a.severity] - severityOrder[b.severity];
                }
                return b.risk_units - a.risk_units;
            });

            res.json(alerts);
        });
    });
});

module.exports = router;




