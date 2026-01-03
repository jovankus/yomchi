const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');

// POST /auth/login - Employee login (requires clinic session)
router.post('/login', (req, res) => {
    // Check clinic session first
    if (!req.session.clinic_id) {
        return res.status(401).json({ message: 'Clinic session required. Please login to a clinic first.' });
    }

    const { username, password } = req.body;
    const clinicId = req.session.clinic_id;

    db.get(
        'SELECT id, clinic_id, username, role, password_hash, active FROM employees WHERE username = ? AND clinic_id = ?',
        [username, clinicId],
        async (err, employee) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!employee) return res.status(401).json({ message: 'Invalid credentials' });

            if (!employee.active) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const match = await bcrypt.compare(password, employee.password_hash);
            if (match) {
                req.session.employeeId = employee.id;
                req.session.username = employee.username;
                req.session.role = employee.role;
                // clinic_id already in session from clinic login

                res.json({
                    message: 'Logged in successfully',
                    user: {
                        id: employee.id,
                        username: employee.username,
                        role: employee.role,
                        clinic_id: clinicId
                    }
                });
            } else {
                res.status(401).json({ message: 'Invalid credentials' });
            }
        }
    );
});

// POST /auth/logout - Clear employee session (keep clinic session)
router.post('/logout', (req, res) => {
    // Clear only employee-related session data, keep clinic
    req.session.employeeId = null;
    req.session.username = null;
    req.session.role = null;
    res.json({ message: 'Logged out successfully' });
});

// GET /auth/me - Returns clinic + employee info
router.get('/me', (req, res) => {
    const clinic = req.session.clinic_id ? {
        id: req.session.clinic_id,
        name: req.session.clinic_name
    } : null;

    if (req.session.employeeId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.employeeId,
                username: req.session.username,
                role: req.session.role,
                clinic_id: req.session.clinic_id
            },
            clinic: clinic
        });
    } else {
        res.json({
            authenticated: false,
            clinic: clinic
        });
    }
});

module.exports = router;
