const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Get psychiatric profile for a patient
router.get('/:id/psychiatric-profile', requireAuth, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM patient_psychiatric_profile WHERE patient_id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        // Return null if no profile exists yet
        res.json({ profile: row || null });
    });
});

// Upsert psychiatric profile
router.put('/:id/psychiatric-profile', requireAuth, (req, res) => {
    const { id } = req.params;
    const { psychiatric_history_text } = req.body;
    const userId = req.session.roleId || req.session.employeeId || null; // Use session roleId or employeeId instead of req.user.id

    // First check if profile exists
    db.get('SELECT id FROM patient_psychiatric_profile WHERE patient_id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            // Update existing profile
            const sql = `UPDATE patient_psychiatric_profile 
                        SET psychiatric_history_text = ?, 
                            updated_at = CURRENT_TIMESTAMP,
                            updated_by = ?
                        WHERE patient_id = ?`;

            db.run(sql, [psychiatric_history_text, userId, id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Psychiatric profile updated successfully' });
            });
        } else {
            // Insert new profile
            const sql = `INSERT INTO patient_psychiatric_profile 
                        (patient_id, psychiatric_history_text, updated_by)
                        VALUES (?, ?, ?)`;

            db.run(sql, [id, psychiatric_history_text, userId], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Psychiatric profile created successfully' });
            });
        }
    });
});

module.exports = router;
