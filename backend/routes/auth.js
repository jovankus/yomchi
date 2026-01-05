const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');

// JWT secret - should match across all routes
const JWT_SECRET = process.env.SESSION_SECRET || 'your_secret_key';

// POST /auth/login - Role-based login (requires clinic session or JWT)
router.post('/login', async (req, res) => {
    const { role, password, clinicToken } = req.body;

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

    if (!role || !password) {
        return res.status(400).json({ message: 'Role and password are required' });
    }

    // Query clinic_roles table for role-based auth
    db.get(
        `SELECT id, clinic_id, role, password_hash, active
         FROM clinic_roles
         WHERE clinic_id = ? AND role = ?`,
        [clinicId, role.toUpperCase()],
        async (err, roleRecord) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!roleRecord) return res.status(401).json({ message: 'Invalid credentials' });

            if (!roleRecord.active) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const match = await bcrypt.compare(password, roleRecord.password_hash);
            if (match) {
                // Set session (works on desktop)
                req.session.roleId = roleRecord.id;
                req.session.role = roleRecord.role;
                req.session.clinic_id = clinicId;
                req.session.clinic_name = clinicName;

                // Generate employee JWT token for mobile
                const employeeToken = jwt.sign(
                    {
                        type: 'employee',
                        role_id: roleRecord.id,
                        role: roleRecord.role,
                        clinic_id: clinicId,
                        clinic_name: clinicName
                    },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );

                res.json({
                    message: 'Logged in successfully',
                    user: {
                        id: roleRecord.id,
                        role: roleRecord.role.toLowerCase(),
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
    // Clear only role-related session data, keep clinic
    req.session.roleId = null;
    req.session.role = null;
    // Also clear old employee data if present
    req.session.employeeId = null;
    req.session.username = null;
    res.json({ message: 'Logged out successfully' });
});

// GET /auth/me - Returns clinic + role info (supports both session and JWT)
router.get('/me', (req, res) => {
    // First check session for role-based auth
    if (req.session.roleId) {
        const clinic = req.session.clinic_id ? {
            id: req.session.clinic_id,
            name: req.session.clinic_name
        } : null;

        return res.json({
            authenticated: true,
            user: {
                id: req.session.roleId,
                role: req.session.role?.toLowerCase(),
                clinic_id: req.session.clinic_id
            },
            clinic: clinic
        });
    }

    // Legacy: Check for old employee session
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
                role: req.session.role?.toLowerCase(),
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

            // Check for employee/role token
            if (decoded.type === 'employee') {
                return res.json({
                    authenticated: true,
                    user: {
                        id: decoded.role_id || decoded.employee_id,
                        role: decoded.role?.toLowerCase(),
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
