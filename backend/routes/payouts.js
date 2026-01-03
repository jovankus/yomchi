const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole, ADMIN_ROLES } = require('../middleware/auth');

// GET /payouts - List all payouts
router.get('/', requireAuth, requireRole(ADMIN_ROLES), (req, res) => {
    const { start_date, end_date } = req.query;

    let query = 'SELECT * FROM doctor_payouts';
    let params = [];

    if (start_date && end_date) {
        query += ' WHERE payout_date >= ? AND payout_date <= ?';
        params = [start_date, end_date];
    }

    query += ' ORDER BY payout_date DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ payouts: rows || [] });
    });
});

// GET /payouts/balance - Get outstanding balance (owed - paid)
router.get('/balance', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
    const { month } = req.query; // Format: YYYY-MM

    try {
        // Get total doctor cuts owed (from financial_events)
        const owedQuery = month
            ? `SELECT COALESCE(SUM(amount), 0) as total_owed 
               FROM financial_events 
               WHERE category = 'DOCTOR_CUT' 
               AND strftime('%Y-%m', event_date) = ?`
            : `SELECT COALESCE(SUM(amount), 0) as total_owed 
               FROM financial_events 
               WHERE category = 'DOCTOR_CUT'`;

        const owedResult = await new Promise((resolve, reject) => {
            db.get(owedQuery, month ? [month] : [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Get total payouts made
        const paidQuery = month
            ? `SELECT COALESCE(SUM(amount), 0) as total_paid 
               FROM doctor_payouts 
               WHERE strftime('%Y-%m', payout_date) = ?`
            : `SELECT COALESCE(SUM(amount), 0) as total_paid 
               FROM doctor_payouts`;

        const paidResult = await new Promise((resolve, reject) => {
            db.get(paidQuery, month ? [month] : [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const totalOwed = owedResult?.total_owed || 0;
        const totalPaid = paidResult?.total_paid || 0;
        const outstandingBalance = totalOwed - totalPaid;

        res.json({
            total_owed: totalOwed,
            total_paid: totalPaid,
            outstanding_balance: outstandingBalance,
            month: month || 'all-time'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /payouts - Record a new payout
router.post('/', requireAuth, requireRole(ADMIN_ROLES), (req, res) => {
    const { payout_date, amount, period_start, period_end, notes } = req.body;
    const created_by = req.session.username || 'system';

    if (!payout_date || !amount) {
        return res.status(400).json({ error: 'payout_date and amount are required' });
    }

    if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const query = `
        INSERT INTO doctor_payouts (payout_date, amount, period_start, period_end, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [payout_date, amount, period_start || null, period_end || null, notes || null, created_by], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        db.get('SELECT * FROM doctor_payouts WHERE id = ?', [this.lastID], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json(row);
        });
    });
});

// DELETE /payouts/:id - Delete a payout
router.delete('/:id', requireAuth, requireRole(ADMIN_ROLES), (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM doctor_payouts WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Payout not found' });
        res.json({ message: 'Payout deleted successfully' });
    });
});

module.exports = router;
