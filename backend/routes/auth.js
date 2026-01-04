const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');

// JWT secret - should match across all routes
const JWT_SECRET = process.env.SESSION_SECRET || 'your_secret_key';

// POST /auth/login - Employee login (requires clinic session or JWT)
router.post('/login', async (req, res) => {
    const { username, password, clinicToken } = req.body;

    // Get clinic info from session OR from JWT token (for mobile)
    let clinicId = req.session.clinic_id;
    let clinicName = req.session.clinic_name;

    // If no session, try to get clinic from JWT token (mobile fallback)
    if (!clinicId) {
        // Check Authorization header first
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded.type === 'clinic') {
                    clinicId = decoded.clinic_id;
                    clinicName = decoded.clinic_name;
                }
            } catch (err) {
                // Token invalid
            }
        }

        // Also check clinicToken in body (alternative for mobile)
        if (!clinicId && clinicToken) {
            try {
                const decoded = jwt.verify(clinicToken, JWT_SECRET);
                if (decoded.type === 'clinic') {
                    clinicId = decoded.clinic_id;
                    clinicName = decoded.clinic_name;
                }
            } catch (err) {
                // Token invalid
            }
        }
    }

    if (!clinicId) {
        return res.status(401).json({ message: 'Clinic session required. Please login to a clinic first.' });
    }

    // Query users table joined with employees table
    db.get(
        `SELECT e.id as employee_id, e.clinic_id, e.role as employee_role, e.active,
                u.id as user_id, u.username, u.password_hash, u.role as user_role
         FROM users u
         JOIN employees e ON e.user_id = u.id
         WHERE u.username = ? AND e.clinic_id = ?`,
        [username, clinicId],
        async (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!result) return res.status(401).json({ message: 'Invalid credentials' });

            if (!result.active) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const match = await bcrypt.compare(password, result.password_hash);
            if (match) {
                const role = result.employee_role || result.user_role;

                // Set session (works on desktop)
                req.session.employeeId = result.employee_id;
                req.session.username = result.username;
                req.session.role = role;
                req.session.clinic_id = clinicId;
                req.session.clinic_name = clinicName;

                // Generate employee JWT token for mobile
                const employeeToken = jwt.sign(
                    {
                        type: 'employee',
                        employee_id: result.employee_id,
                        username: result.username,
                        role: role,
                        clinic_id: clinicId,
                        clinic_name: clinicName
                    },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );

                res.json({
                    message: 'Logged in successfully',
                    user: {
                        id: result.employee_id,
                        username: result.username,
                        role: role,
                        clinic_id: clinicId
                    },
                    token: employeeToken // JWT token for mobile browsers
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

// GET /auth/me - Returns clinic + employee info (supports both session and JWT)
router.get('/me', (req, res) => {
    // First check session (works on desktop)
    if (req.session.employeeId) {
        const clinic = req.session.clinic_id ? {
            id: req.session.clinic_id,
            name: req.session.clinic_name
        } : null;

        return res.json({
            authenticated: true,
            user: {
                id: req.session.employeeId,
                username: req.session.username,
                role: req.session.role,
                clinic_id: req.session.clinic_id
            },
            clinic: clinic
        });
    }

    // Fallback to JWT token (for mobile browsers)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            // Check for employee token
            if (decoded.type === 'employee') {
                return res.json({
                    authenticated: true,
                    user: {
                        id: decoded.employee_id,
                        username: decoded.username,
                        role: decoded.role,
                        clinic_id: decoded.clinic_id
                    },
                    clinic: {
                        id: decoded.clinic_id,
                        name: decoded.clinic_name
                    }
                });
            }

            // Check for clinic-only token (employee not yet logged in)
            if (decoded.type === 'clinic') {
                return res.json({
                    authenticated: false,
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

    // No session and no valid token
    const clinic = req.session.clinic_id ? {
        id: req.session.clinic_id,
        name: req.session.clinic_name
    } : null;

    res.json({
        authenticated: false,
        clinic: clinic
    });
});

module.exports = router;
