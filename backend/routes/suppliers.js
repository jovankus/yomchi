const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole, ADMIN_ROLES } = require('../middleware/auth');

// ADMIN_ROLES only

// List all suppliers
router.get('/', requireAuth, (req, res) => {
    db.all('SELECT * FROM suppliers ORDER BY name', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get single supplier
router.get('/:id', requireAuth, (req, res) => {
    db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ message: 'Supplier not found' });
        res.json(row);
    });
});

// Create supplier
router.post('/', requireAuth, (req, res) => {
    const { name, phone, address, notes } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const sql = 'INSERT INTO suppliers (name, phone, address, notes) VALUES (?, ?, ?, ?)';
    const params = [name, phone, address, notes];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({
            id: this.lastID,
            name, phone, address, notes
        });
    });
});

// Update supplier
router.put('/:id', requireAuth, (req, res) => {
    const { name, phone, address, notes } = req.body;
    const { id } = req.params;

    const sql = 'UPDATE suppliers SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?';
    const params = [name, phone, address, notes, id];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Supplier not found' });
        res.json({ message: 'Supplier updated' });
    });
});

// Delete supplier
router.delete('/:id', requireAuth, (req, res) => {
    db.run('DELETE FROM suppliers WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Supplier not found' });
        res.json({ message: 'Supplier deleted' });
    });
});

module.exports = router;
