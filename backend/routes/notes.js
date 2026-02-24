const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// POST /notes
router.post('/', requireAuth, (req, res) => {
    const {
        patient_id,
        appointment_id,
        content,
        note_type,
        changes_since_last_visit,
        medication_adherence_change,
        side_effects_change
    } = req.body;
    const author_id = req.session.roleId || req.session.employeeId || null;

    if (!patient_id || !content) {
        return res.status(400).json({ error: 'Patient and content are required' });
    }

    // Validate note_type if provided
    const validNoteTypes = ['GENERAL', 'FOLLOW_UP'];
    const finalNoteType = note_type || 'GENERAL';

    if (!validNoteTypes.includes(finalNoteType)) {
        return res.status(400).json({ error: 'note_type must be GENERAL or FOLLOW_UP' });
    }

    const sql = `INSERT INTO clinical_notes 
                (patient_id, appointment_id, author_id, content, note_type, 
                 changes_since_last_visit, medication_adherence_change, side_effects_change) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        patient_id,
        appointment_id || null,
        author_id,
        content,
        finalNoteType,
        changes_since_last_visit || null,
        medication_adherence_change || null,
        side_effects_change || null
    ];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });

        db.get('SELECT * FROM clinical_notes WHERE id = ?', [this.lastID], (err, row) => {
            if (err || !row) return res.status(201).json({ id: this.lastID, message: 'Note created' });

            // Add author name from session for immediate display
            row.author_username = req.session.username;
            res.status(201).json(row);
        });
    });
});

module.exports = router;
