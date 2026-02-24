const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Get symptoms for a patient
router.get('/:id/symptoms', requireAuth, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM patient_symptoms WHERE patient_id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        // Return null if no symptoms record exists yet
        res.json({ symptoms: row || null });
    });
});

// Upsert symptoms
router.put('/:id/symptoms', requireAuth, (req, res) => {
    const { id } = req.params;
    const {
        depression, anxiety, panic, ptsd, ocd, psychosis, mania,
        substance_use, sleep_problem, suicidal_ideation, self_harm,
        irritability, attention_problem, notes
    } = req.body;
    const userId = req.session.roleId || req.session.employeeId || null;

    // Convert boolean values to integers (SQLite doesn't have native boolean)
    const toInt = (val) => val ? 1 : 0;

    // First check if symptoms record exists
    db.get('SELECT id FROM patient_symptoms WHERE patient_id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            // Update existing symptoms
            const sql = `UPDATE patient_symptoms 
                        SET depression = ?, anxiety = ?, panic = ?, ptsd = ?, ocd = ?,
                            psychosis = ?, mania = ?, substance_use = ?, sleep_problem = ?,
                            suicidal_ideation = ?, self_harm = ?, irritability = ?, 
                            attention_problem = ?, notes = ?,
                            updated_at = CURRENT_TIMESTAMP, updated_by = ?
                        WHERE patient_id = ?`;

            db.run(sql, [
                toInt(depression), toInt(anxiety), toInt(panic), toInt(ptsd), toInt(ocd),
                toInt(psychosis), toInt(mania), toInt(substance_use), toInt(sleep_problem),
                toInt(suicidal_ideation), toInt(self_harm), toInt(irritability),
                toInt(attention_problem), notes, userId, id
            ], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Symptoms updated successfully' });
            });
        } else {
            // Insert new symptoms record
            const sql = `INSERT INTO patient_symptoms 
                        (patient_id, depression, anxiety, panic, ptsd, ocd, psychosis, mania,
                         substance_use, sleep_problem, suicidal_ideation, self_harm, 
                         irritability, attention_problem, notes, updated_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            db.run(sql, [
                id, toInt(depression), toInt(anxiety), toInt(panic), toInt(ptsd), toInt(ocd),
                toInt(psychosis), toInt(mania), toInt(substance_use), toInt(sleep_problem),
                toInt(suicidal_ideation), toInt(self_harm), toInt(irritability),
                toInt(attention_problem), notes, userId
            ], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Symptoms created successfully' });
            });
        }
    });
});

module.exports = router;
