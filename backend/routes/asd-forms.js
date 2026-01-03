const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Create new autism form submission
router.post('/:id/asd-forms', requireAuth, (req, res) => {
    const { id } = req.params;
    const { form_version, responses_json, summary_text } = req.body;
    const userId = req.session.userId;

    if (!responses_json) {
        return res.status(400).json({ error: 'responses_json is required' });
    }

    // Ensure responses_json is a string (convert if object)
    const jsonString = typeof responses_json === 'string'
        ? responses_json
        : JSON.stringify(responses_json);

    const sql = `INSERT INTO patient_asd_forms 
                (patient_id, form_version, responses_json, summary_text, created_by)
                VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [
        id,
        form_version || 'v1',
        jsonString,
        summary_text || null,
        userId
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        res.status(201).json({
            message: 'Autism form saved successfully',
            form_id: this.lastID
        });
    });
});

// Get all autism forms for a patient
router.get('/:id/asd-forms', requireAuth, (req, res) => {
    const { id } = req.params;

    const sql = `SELECT f.*, u.username as created_by_username
                FROM patient_asd_forms f
                LEFT JOIN users u ON f.created_by = u.id
                WHERE f.patient_id = ?
                ORDER BY f.created_at DESC`;

    db.all(sql, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Parse responses_json back to objects
        const forms = rows.map(row => ({
            ...row,
            responses: JSON.parse(row.responses_json)
        }));

        res.json({ forms });
    });
});

module.exports = router;
