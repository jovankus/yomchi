const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Get ASD profile for a patient
router.get('/:id/asd-profile', requireAuth, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM patient_asd_profile WHERE patient_id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ asd_profile: row || null });
    });
});

// Upsert ASD profile
router.put('/:id/asd-profile', requireAuth, (req, res) => {
    const { id } = req.params;
    const {
        diagnosed,
        diagnosis_source,
        severity_level,
        language_level,
        notes
    } = req.body;
    const userId = req.session.userId;

    // Convert boolean to integer for SQLite
    const diagnosedInt = diagnosed ? 1 : 0;

    // Check if profile exists
    db.get('SELECT id FROM patient_asd_profile WHERE patient_id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            // Update existing profile
            const sql = `UPDATE patient_asd_profile 
                        SET diagnosed = ?, diagnosis_source = ?, severity_level = ?, 
                            language_level = ?, notes = ?,
                            updated_at = CURRENT_TIMESTAMP, updated_by = ?
                        WHERE patient_id = ?`;

            db.run(sql, [
                diagnosedInt, diagnosis_source, severity_level,
                language_level, notes, userId, id
            ], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'ASD profile updated successfully' });
            });
        } else {
            // Insert new profile
            const sql = `INSERT INTO patient_asd_profile 
                        (patient_id, diagnosed, diagnosis_source, severity_level, 
                         language_level, notes, updated_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`;

            db.run(sql, [
                id, diagnosedInt, diagnosis_source, severity_level,
                language_level, notes, userId
            ], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'ASD profile created successfully' });
            });
        }
    });
});

module.exports = router;
