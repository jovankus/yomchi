const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// JWT secret - should match across all routes
const JWT_SECRET = process.env.SESSION_SECRET || 'your_secret_key';

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

            // Set clinic in session (for cookie-based auth)
            req.session.clinic_id = clinic.id;
            req.session.clinic_name = clinic.name;

            // Generate JWT token for token-based auth (mobile browsers)
            const token = jwt.sign(
                { clinic_id: clinic.id, clinic_name: clinic.name, type: 'clinic' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Explicitly save session to ensure cookie is set before responding
            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('Session save error:', saveErr);
                    // Still return response with token even if session fails
                }

                res.json({
                    message: 'Clinic login successful',
                    clinic: { id: clinic.id, name: clinic.name },
                    token: token // JWT token for mobile browsers
                });
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

// GET /clinic/me - Get current clinic session state (supports both session and JWT)
router.get('/me', (req, res) => {
    // First check session (works on desktop)
    if (req.session.clinic_id) {
        return res.json({
            authenticated: true,
            clinic: {
                id: req.session.clinic_id,
                name: req.session.clinic_name
            }
        });
    }

    // Fallback to JWT token (for mobile browsers)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.type === 'clinic') {
                // Set session data from token for subsequent requests on this connection
                req.session.clinic_id = decoded.clinic_id;
                req.session.clinic_name = decoded.clinic_name;

                return res.json({
                    authenticated: true,
                    clinic: {
                        id: decoded.clinic_id,
                        name: decoded.clinic_name
                    }
                });
            }
        } catch (err) {
            // Token invalid or expired
            console.log('JWT verification failed:', err.message);
        }
    }

    res.json({
        authenticated: false,
        clinic: null
    });
});

module.exports = router;
