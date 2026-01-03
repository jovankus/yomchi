const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole, ADMIN_ROLES } = require('../middleware/auth');
const googleSheets = require('../services/google-sheets');

// Store last backup info
let lastBackup = {
    timestamp: null,
    status: 'never',
    details: null,
};

/**
 * Get backup configuration status
 * GET /backup/status
 */
router.get('/status', requireAuth, requireRole(ADMIN_ROLES), (req, res) => {
    res.json({
        configured: googleSheets.isConfigured(),
        config: googleSheets.getConfigStatus(),
        lastBackup,
    });
});

/**
 * Trigger full backup to Google Sheets
 * POST /backup/google-sheets
 */
router.post('/google-sheets', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
    try {
        // Check configuration
        if (!googleSheets.isConfigured()) {
            return res.status(400).json({
                error: 'Google Sheets not configured',
                config: googleSheets.getConfigStatus(),
                instructions: 'Set GOOGLE_SPREADSHEET_ID env var and place google-credentials.json in backend folder',
            });
        }

        const results = {
            patients: 0,
            appointments: 0,
            clinicalNotes: 0,
        };

        // Export Patients
        const patients = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM patients ORDER BY id', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        results.patients = await googleSheets.exportPatients(patients);

        // Export Appointments with patient and clinician info
        const appointments = await new Promise((resolve, reject) => {
            const query = `
                SELECT a.*, 
                       p.first_name, p.last_name,
                       u.username as clinician_username
                FROM appointments a
                LEFT JOIN patients p ON a.patient_id = p.id
                LEFT JOIN users u ON a.clinician_id = u.id
                ORDER BY a.start_at DESC
            `;
            db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        results.appointments = await googleSheets.exportAppointments(appointments);

        // Export Clinical Notes with patient and author info
        const notes = await new Promise((resolve, reject) => {
            const query = `
                SELECT n.*, 
                       p.first_name || ' ' || p.last_name as patient_name,
                       u.username as author_username
                FROM clinical_notes n
                LEFT JOIN patients p ON n.patient_id = p.id
                LEFT JOIN users u ON n.author_id = u.id
                ORDER BY n.created_at DESC
            `;
            db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        results.clinicalNotes = await googleSheets.exportClinicalNotes(notes);

        // Update last backup info
        lastBackup = {
            timestamp: new Date().toISOString(),
            status: 'success',
            details: results,
        };

        res.json({
            message: 'Backup completed successfully',
            timestamp: lastBackup.timestamp,
            rowsExported: results,
        });

    } catch (error) {
        console.error('Backup failed:', error);

        lastBackup = {
            timestamp: new Date().toISOString(),
            status: 'failed',
            details: error.message,
        };

        res.status(500).json({
            error: 'Backup failed',
            message: error.message,
        });
    }
});

module.exports = router;
