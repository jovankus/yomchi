const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole, REPORT_ROLES, ADMIN_ROLES } = require('../middleware/auth');

// RBAC: Only SENIOR_DOCTOR and PERMANENT_DOCTOR can access final reports

// GET /patients/:patientId/final-reports - List all final reports for a patient
router.get('/:patientId/final-reports', requireRole(REPORT_ROLES), (req, res) => {
    const { patientId } = req.params;

    db.all(
        `SELECT * FROM final_reports WHERE patient_id = ? ORDER BY created_at DESC`,
        [patientId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ reports: rows || [] });
        }
    );
});

// GET /patients/:patientId/final-reports/:id - Get single report
router.get('/:patientId/final-reports/:id', requireRole(REPORT_ROLES), (req, res) => {
    const { patientId, id } = req.params;

    db.get(
        `SELECT * FROM final_reports WHERE id = ? AND patient_id = ?`,
        [id, patientId],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ message: 'Report not found' });
            res.json({ report: row });
        }
    );
});

// POST /patients/:patientId/final-reports - Create new report
router.post('/:patientId/final-reports', requireRole(REPORT_ROLES), (req, res) => {
    const { patientId } = req.params;
    const { diagnosis, treatment_plan, summary, recommendations } = req.body;
    const author_role = req.session.role;

    if (!diagnosis && !treatment_plan && !summary && !recommendations) {
        return res.status(400).json({ message: 'At least one field is required' });
    }

    db.run(
        `INSERT INTO final_reports (patient_id, author_role, diagnosis, treatment_plan, summary, recommendations)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [patientId, author_role, diagnosis, treatment_plan, summary, recommendations],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({
                message: 'Report created',
                id: this.lastID
            });
        }
    );
});

// PUT /patients/:patientId/final-reports/:id - Update report
router.put('/:patientId/final-reports/:id', requireRole(REPORT_ROLES), (req, res) => {
    const { patientId, id } = req.params;
    const { diagnosis, treatment_plan, summary, recommendations } = req.body;

    db.run(
        `UPDATE final_reports 
         SET diagnosis = ?, treatment_plan = ?, summary = ?, recommendations = ?, updated_at = ?
         WHERE id = ? AND patient_id = ?`,
        [diagnosis, treatment_plan, summary, recommendations, new Date().toISOString(), id, patientId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ message: 'Report not found' });
            res.json({ message: 'Report updated' });
        }
    );
});

// DELETE /patients/:patientId/final-reports/:id - Delete report (Admin only)
router.delete('/:patientId/final-reports/:id', requireRole(ADMIN_ROLES), (req, res) => {
    const { patientId, id } = req.params;

    db.run(
        `DELETE FROM final_reports WHERE id = ? AND patient_id = ?`,
        [id, patientId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ message: 'Report not found' });
            res.json({ message: 'Report deleted' });
        }
    );
});

module.exports = router;
