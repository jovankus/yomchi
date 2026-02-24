const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole, PATIENT_VIEW_ROLES, ADMIN_ROLES } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// RBAC: PERMANENT_DOCTOR and DOCTOR can access patients
// SENIOR_DOCTOR: Only final reports (separate routes)
// SECRETARY: No patient access

// Get total patients count (for dashboard, accessible to any authenticated user)
router.get('/count', requireAuth, (req, res) => {
    db.get('SELECT COUNT(*) as total FROM patients', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: row.total });
    });
});

// List patients with optional search
router.get('/', requireRole(PATIENT_VIEW_ROLES), (req, res) => {
    const { search } = req.query;
    let query = 'SELECT * FROM patients';
    let params = [];

    if (search) {
        query += ` WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? 
                   OR email LIKE ? OR (first_name || ' ' || last_name) LIKE ?`;
        const term = `%${search}%`;
        params = [term, term, term, term, term];
    }

    query += ' ORDER BY last_name, first_name';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ patients: rows });
    });
});

// Get single patient
router.get('/:id', requireRole(PATIENT_VIEW_ROLES), (req, res) => {
    db.get('SELECT * FROM patients WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ message: 'Patient not found' });
        res.json({ patient: row });
    });
});

// Get patient notes
router.get('/:id/notes', requireRole(PATIENT_VIEW_ROLES), (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT n.*, u.username as author_username 
        FROM clinical_notes n
        JOIN users u ON n.author_id = u.id
        WHERE n.patient_id = ?
        ORDER BY n.created_at DESC
    `;
    db.all(query, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get patient's recent appointments (for follow-up workflow)
router.get('/:id/recent-appointments', requireRole(PATIENT_VIEW_ROLES), (req, res) => {
    const { id } = req.params;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const dateLimit = sixMonthsAgo.toISOString().split('T')[0];

    const query = `
        SELECT a.id, a.start_at, a.end_at, a.status, a.session_type, a.payment_status, 
               a.free_return_reason, a.doctor_cut_percent, a.doctor_involved, a.created_at
        FROM appointments a
        WHERE a.patient_id = ? AND substr(a.start_at, 1, 10) >= ?
        ORDER BY a.start_at DESC
        LIMIT 20
    `;

    db.all(query, [id, dateLimit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ appointments: rows });
    });
});


// Create patient
router.post('/', requireRole(PATIENT_VIEW_ROLES), (req, res) => {
    const { first_name, last_name, date_of_birth, phone, email, address,
        place_of_living, education_level, marital_status, occupation, living_with, has_asd } = req.body;

    // Basic validation
    if (!first_name || !last_name || !date_of_birth) {
        return res.status(400).json({ message: 'First Name, Last Name, and DOB are required' });
    }

    // Psychiatry demographics validation: if not married, living_with is required
    if (marital_status && marital_status.toLowerCase() !== 'married' && !living_with) {
        return res.status(400).json({ message: 'Living With is required when not married' });
    }

    const sql = `INSERT INTO patients (first_name, last_name, date_of_birth, phone, email, address,
                    place_of_living, education_level, marital_status, occupation, living_with, has_asd) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [first_name, last_name, date_of_birth, phone, email, address,
        place_of_living, education_level, marital_status, occupation, living_with, has_asd ? 1 : 0], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req, {
                action: 'CREATE',
                entityType: 'PATIENT',
                entityId: this.lastID,
                details: { first_name, last_name, date_of_birth, phone }
            });
            res.status(201).json({ message: 'Patient created', id: this.lastID });
        });
});

// Update patient
router.put('/:id', requireRole(PATIENT_VIEW_ROLES), (req, res) => {
    const { first_name, last_name, date_of_birth, phone, email, address,
        place_of_living, education_level, marital_status, occupation, living_with, has_asd } = req.body;
    const { id } = req.params;

    // Psychiatry demographics validation: if not married, living_with is required
    if (marital_status && marital_status.toLowerCase() !== 'married' && !living_with) {
        return res.status(400).json({ message: 'Living With is required when not married' });
    }

    const sql = `UPDATE patients 
                SET first_name = ?, last_name = ?, date_of_birth = ?, phone = ?, email = ?, address = ?,
                    place_of_living = ?, education_level = ?, marital_status = ?, occupation = ?, living_with = ?, has_asd = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`;

    db.run(sql, [first_name, last_name, date_of_birth, phone, email, address,
        place_of_living, education_level, marital_status, occupation, living_with, has_asd ? 1 : 0, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ message: 'Patient not found' });
            logAudit(req, {
                action: 'UPDATE',
                entityType: 'PATIENT',
                entityId: parseInt(id),
                details: { first_name, last_name, date_of_birth, phone }
            });
            res.json({ message: 'Patient updated' });
        });
});

// Delete patient - Admin only (cascade deletes related records)
router.delete('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
    const patientId = req.params.id;

    try {
        // First, check if patient exists
        const checkPatient = () => new Promise((resolve, reject) => {
            db.get('SELECT id FROM patients WHERE id = ?', [patientId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const patient = await checkPatient();
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        logAudit(req, {
            action: 'DELETE',
            entityType: 'PATIENT',
            entityId: parseInt(patientId),
            details: { note: 'Patient and all related records deleted' }
        });

        // Delete all related records first (order matters due to foreign key dependencies)
        const deleteRelated = (table, column = 'patient_id') => new Promise((resolve, reject) => {
            db.run(`DELETE FROM ${table} WHERE ${column} = ?`, [patientId], function (err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });

        // Delete financial_events linked to patient's appointments first
        await new Promise((resolve, reject) => {
            db.run(`DELETE FROM financial_events WHERE related_appointment_id IN (SELECT id FROM appointments WHERE patient_id = ?)`, [patientId], function (err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });

        // Delete related records from all tables that reference patients
        await deleteRelated('appointments');
        await deleteRelated('clinical_notes');
        await deleteRelated('stock_movements');
        await deleteRelated('patient_psychiatric_profile');
        await deleteRelated('patient_symptoms');
        await deleteRelated('patient_documents');
        await deleteRelated('patient_asd_profile');
        await deleteRelated('patient_asd_forms');

        // Finally delete the patient
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM patients WHERE id = ?', [patientId], function (err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });

        res.json({ message: 'Patient deleted successfully' });
    } catch (err) {
        console.error('Error deleting patient:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
