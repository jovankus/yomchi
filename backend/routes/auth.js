const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');

// JWT secret - should match across all routes
const JWT_SECRET = process.env.SESSION_SECRET || 'your_secret_key';
const DEVICE_TOKEN_EXPIRY_DAYS = 60; // 60 days for device tokens

// Helper to generate secure device token
function generateDeviceToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Helper to hash device token for storage
function hashDeviceToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// POST /auth/login - Role-based login (requires clinic session or JWT)
router.post('/login', async (req, res) => {
    const { role, password, clinicToken, rememberDevice, deviceName } = req.body;

    // Get clinic info from session OR from JWT token (for mobile)
    let clinicId = req.session.clinic_id;
    let clinicName = req.session.clinic_name;

    // If no session, try to get clinic from JWT token (mobile fallback)
    if (!clinicId) {
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

                let deviceToken = null;

                // If rememberDevice is checked, create a long-lived device token
                if (rememberDevice) {
                    deviceToken = generateDeviceToken();
                    const tokenHash = hashDeviceToken(deviceToken);
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + DEVICE_TOKEN_EXPIRY_DAYS);

                    db.run(
                        `INSERT INTO device_sessions (clinic_id, role, token_hash, device_name, expires_at)
                         VALUES (?, ?, ?, ?, ?)`,
                        [clinicId, roleRecord.role, tokenHash, deviceName || 'Unknown Device', expiresAt.toISOString()],
                        (err) => {
                            if (err) console.error('Failed to save device session:', err);
                        }
                    );
                }

                res.json({
                    message: 'Logged in successfully',
                    user: {
                        id: roleRecord.id,
                        role: roleRecord.role.toLowerCase(),
                        clinic_id: clinicId
                    },
                    token: employeeToken,
                    deviceToken: deviceToken // Only set if rememberDevice was true
                });
            } else {
                res.status(401).json({ message: 'Invalid credentials' });
            }
        }
    );
});

// POST /auth/device-login - Auto-login using device token
router.post('/device-login', async (req, res) => {
    const { deviceToken, clinicToken } = req.body;

    if (!deviceToken) {
        return res.status(400).json({ message: 'Device token required' });
    }

    // Get clinic from session or token
    let clinicId = req.session.clinic_id;
    let clinicName = req.session.clinic_name;

    if (!clinicId && clinicToken) {
        try {
            const decoded = jwt.verify(clinicToken, JWT_SECRET);
            if (decoded.type === 'clinic') {
                clinicId = decoded.clinic_id;
                clinicName = decoded.clinic_name;
            }
        } catch (err) {
            // Invalid token
        }
    }

    if (!clinicId) {
        return res.status(401).json({ message: 'Clinic session required' });
    }

    const tokenHash = hashDeviceToken(deviceToken);

    db.get(
        `SELECT id, clinic_id, role, expires_at, revoked_at
         FROM device_sessions
         WHERE token_hash = ? AND clinic_id = ?`,
        [tokenHash, clinicId],
        (err, session) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!session) return res.status(401).json({ message: 'Invalid device token' });

            // Check if revoked
            if (session.revoked_at) {
                return res.status(401).json({ message: 'Device session has been revoked' });
            }

            // Check if expired
            if (new Date(session.expires_at) < new Date()) {
                return res.status(401).json({ message: 'Device session has expired' });
            }

            // Update last_used_at
            db.run(
                `UPDATE device_sessions SET last_used_at = ? WHERE id = ?`,
                [new Date().toISOString(), session.id]
            );

            // Set session
            req.session.role = session.role;
            req.session.clinic_id = clinicId;
            req.session.clinic_name = clinicName;

            // Generate employee JWT token
            const employeeToken = jwt.sign(
                {
                    type: 'employee',
                    role: session.role,
                    clinic_id: clinicId,
                    clinic_name: clinicName
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                message: 'Device login successful',
                user: {
                    role: session.role.toLowerCase(),
                    clinic_id: clinicId
                },
                token: employeeToken
            });
        }
    );
});

// POST /auth/revoke-device - Revoke a device session (admin only - SENIOR_DOCTOR, PERMANENT_DOCTOR)
router.post('/revoke-device', (req, res) => {
    const { deviceSessionId } = req.body;

    if (!req.session.role || !['SENIOR_DOCTOR', 'PERMANENT_DOCTOR'].includes(req.session.role)) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    if (!deviceSessionId) {
        return res.status(400).json({ message: 'Device session ID required' });
    }

    db.run(
        `UPDATE device_sessions SET revoked_at = ? WHERE id = ? AND clinic_id = ?`,
        [new Date().toISOString(), deviceSessionId, req.session.clinic_id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ message: 'Device session not found' });
            res.json({ message: 'Device session revoked' });
        }
    );
});

// GET /auth/devices - List device sessions for current clinic (admin only)
router.get('/devices', (req, res) => {
    if (!req.session.role || !['SENIOR_DOCTOR', 'PERMANENT_DOCTOR'].includes(req.session.role)) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    db.all(
        `SELECT id, role, device_name, last_used_at, expires_at, revoked_at, created_at
         FROM device_sessions
         WHERE clinic_id = ?
         ORDER BY last_used_at DESC`,
        [req.session.clinic_id],
        (err, sessions) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ devices: sessions || [] });
        }
    );
});

// POST /auth/logout - Clear employee session (keep clinic session)
router.post('/logout', (req, res) => {
    req.session.roleId = null;
    req.session.role = null;
    req.session.employeeId = null;
    req.session.username = null;
    res.json({ message: 'Logged out successfully' });
});

// GET /auth/me - Returns clinic + role info
router.get('/me', (req, res) => {
    // First check session for role-based auth
    if (req.session.roleId || req.session.role) {
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
