const express = require('express');
const router = express.Router();
const db = require('../db');

// Import the createStockMovement helper from inventory routes
// We'll use it to create stock movements from webhook events
const { createStockMovement } = require('./inventory');

// ==================== WEBHOOK ENDPOINT ====================

// POST /integrations/webhook - Receive external stock events
router.post('/webhook', (req, res) => {
    const { provider, external_event_id, event_type, data } = req.body;

    // Step 1: Validate payload
    if (!provider || !external_event_id || !event_type || !data) {
        return res.status(400).json({
            error: 'Missing required fields: provider, external_event_id, event_type, data'
        });
    }

    // Step 2: Check for duplicate event (idempotency)
    const checkDuplicateSql = `
        SELECT id, processed_at FROM integration_events 
        WHERE provider = ? AND external_event_id = ?
    `;

    db.get(checkDuplicateSql, [provider, external_event_id], (err, existingEvent) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (existingEvent) {
            // Event already exists - enforce idempotency
            return res.status(409).json({
                error: 'Event already processed',
                event_id: existingEvent.id,
                processed_at: existingEvent.processed_at
            });
        }

        // Step 3: Insert event record (not yet processed)
        const insertEventSql = `
            INSERT INTO integration_events (provider, external_event_id, payload, processed_at)
            VALUES (?, ?, ?, NULL)
        `;

        const payloadJson = JSON.stringify(req.body);

        db.run(insertEventSql, [provider, external_event_id, payloadJson], function (err) {
            if (err) {
                // Handle unique constraint violation (race condition)
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({
                        error: 'Event already processed (concurrent request detected)'
                    });
                }
                return res.status(500).json({ error: err.message });
            }

            const eventId = this.lastID;

            // Step 4: Validate movement data
            const { pharmacy_id, item_id, batch_id, qty_units, type, reference } = data;

            if (!pharmacy_id || !item_id || !batch_id || qty_units === undefined || !type) {
                return res.status(400).json({
                    error: 'Invalid movement data: pharmacy_id, item_id, batch_id, qty_units, and type are required'
                });
            }

            // Step 5: Create stock movement using helper function
            const movementData = {
                pharmacy_id,
                item_id,
                batch_id,
                type,
                qty_units: parseInt(qty_units),
                unit_price_at_time: data.unit_price_at_time || 0,
                reference: reference || `${provider} - ${event_type}`,
                source: 'integration',
                created_by: provider
            };

            // Helper function to create stock movement
            // Note: We're duplicating this logic here since we can't easily import from inventory.js
            // In production, this should be refactored into a shared module
            function createStockMovementLocal(movementData, callback) {
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

                // Check stock availability for negative movements
                if (batch_id && qty_units < 0) {
                    db.get('SELECT qty_on_hand_units FROM inventory_batches WHERE id = ?', [batch_id], (err, batch) => {
                        if (err) return callback(err);
                        if (!batch) return callback(new Error('Batch not found'));

                        const newQty = batch.qty_on_hand_units + qty_units;
                        if (newQty < 0) {
                            return callback(new Error(`Insufficient stock. Available: ${batch.qty_on_hand_units}, Requested: ${Math.abs(qty_units)}`));
                        }

                        proceedWithMovement();
                    });
                } else {
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

            createStockMovementLocal(movementData, (err, movement) => {
                if (err) {
                    return res.status(400).json({
                        error: `Failed to create stock movement: ${err.message}`,
                        event_id: eventId
                    });
                }

                // Step 6: Mark event as processed
                const updateEventSql = `
                    UPDATE integration_events 
                    SET processed_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `;

                db.run(updateEventSql, [eventId], (err) => {
                    if (err) {
                        console.error('Failed to mark event as processed:', err);
                        // Don't fail the request, movement was created successfully
                    }

                    // Step 7: Return success
                    res.status(200).json({
                        success: true,
                        message: 'Webhook event processed successfully',
                        event_id: eventId,
                        movement_id: movement.id,
                        movement: {
                            type: movement.type,
                            qty_units: movement.qty_units,
                            batch_id: movement.batch_id,
                            reference: movement.reference
                        }
                    });
                });
            });
        });
    });
});

// ==================== QUERY EVENTS (OPTIONAL) ====================

// GET /integrations/events - List integration events for debugging
router.get('/events', (req, res) => {
    const { provider, processed, limit = 50 } = req.query;

    let sql = 'SELECT * FROM integration_events WHERE 1=1';
    const params = [];

    if (provider) {
        sql += ' AND provider = ?';
        params.push(provider);
    }

    if (processed === 'true') {
        sql += ' AND processed_at IS NOT NULL';
    } else if (processed === 'false') {
        sql += ' AND processed_at IS NULL';
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Parse payload JSON for easier reading
        const events = rows.map(row => ({
            ...row,
            payload: JSON.parse(row.payload)
        }));

        res.json({
            events,
            count: events.length
        });
    });
});

module.exports = router;
