const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole, ADMIN_ROLES } = require('../middleware/auth');

// ADMIN_ROLES only

// List all pharmacies (optionally filter by active)
router.get('/', requireAuth, (req, res) => {
    db.all('SELECT * FROM pharmacies WHERE active = 1 ORDER BY name', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create pharmacy
router.post('/', requireAuth, (req, res) => {
    const { name, address, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    db.run(
        'INSERT INTO pharmacies (name, address, phone) VALUES (?, ?, ?)',
        [name, address, phone],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, name, address, phone, active: 1 });
        }
    );
});

// Update pharmacy
router.put('/:id', requireAuth, (req, res) => {
    const { name, address, phone } = req.body;
    const { id } = req.params;

    db.run(
        'UPDATE pharmacies SET name = ?, address = ?, phone = ? WHERE id = ?',
        [name, address, phone, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ message: 'Pharmacy not found' });
            res.json({ message: 'Pharmacy updated' });
        }
    );
});

// Delete pharmacy (Soft delete)
router.delete('/:id', requireAuth, (req, res) => {
    db.run('UPDATE pharmacies SET active = 0 WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Pharmacy not found' });
        res.json({ message: 'Pharmacy deleted' });
    });
});

module.exports = router;
