const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

// POST /clinic/login - Authenticate clinic
router.post('/login', (req, res) => {
    const { clinic_name, clinic_password } = req.body;

    if (!clinic_name || !clinic_password) {
        return res.status(400).json({ error: 'Clinic name and password are required' });
    }

    db.get(
        'SELECT id, name, password_hash, active FROM clinics WHERE name = ?',
        [clinic_name],
        (err, clinic) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!clinic) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (!clinic.active) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const validPassword = bcrypt.compareSync(clinic_password, clinic.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Set clinic in session
            req.session.clinic_id = clinic.id;
            req.session.clinic_name = clinic.name;

            res.json({
                message: 'Clinic login successful',
                clinic: { id: clinic.id, name: clinic.name }
            });
        }
    );
});

// POST /clinic/logout - Clear clinic session
router.post('/logout', (req, res) => {
    req.session.clinic_id = null;
    req.session.clinic_name = null;
    res.json({ message: 'Clinic session cleared' });
});

// GET /clinic/me - Get current clinic session state
router.get('/me', (req, res) => {
    if (req.session.clinic_id) {
        res.json({
            authenticated: true,
            clinic: {
                id: req.session.clinic_id,
                name: req.session.clinic_name
            }
        });
    } else {
        res.json({
            authenticated: false,
            clinic: null
        });
    }
});

module.exports = router;
