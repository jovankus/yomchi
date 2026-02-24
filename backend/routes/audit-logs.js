const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole, ADMIN_ROLES } = require('../middleware/auth');

// GET /audit-logs - Paginated, filterable audit log list
router.get('/', requireRole(ADMIN_ROLES), (req, res) => {
    const {
        entity_type,
        action,
        user_role,
        date_from,
        date_to,
        page = 1,
        limit = 50
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    let params = [];
    let countParams = [];

    if (entity_type) {
        query += ' AND entity_type = ?';
        countQuery += ' AND entity_type = ?';
        params.push(entity_type);
        countParams.push(entity_type);
    }

    if (action) {
        query += ' AND action = ?';
        countQuery += ' AND action = ?';
        params.push(action);
        countParams.push(action);
    }

    if (user_role) {
        query += ' AND user_role = ?';
        countQuery += ' AND user_role = ?';
        params.push(user_role);
        countParams.push(user_role);
    }

    if (date_from) {
        query += ' AND created_at >= ?';
        countQuery += ' AND created_at >= ?';
        params.push(date_from);
        countParams.push(date_from);
    }

    if (date_to) {
        query += ' AND created_at <= ?';
        countQuery += ' AND created_at <= ?';
        // Add end of day
        params.push(date_to + 'T23:59:59');
        countParams.push(date_to + 'T23:59:59');
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    // Get total count first
    db.get(countQuery, countParams, (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });

        const total = countRow?.total || 0;

        // Get paginated results
        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                logs: rows || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        });
    });
});

// GET /audit-logs/stats - Quick summary stats
router.get('/stats', requireRole(ADMIN_ROLES), (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    db.all(
        `SELECT action, COUNT(*) as count FROM audit_logs 
         WHERE created_at >= ? GROUP BY action`,
        [today],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ today: rows || [] });
        }
    );
});

module.exports = router;
