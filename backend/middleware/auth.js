// Role-based access control middleware for Yomchi Healthcare
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.SESSION_SECRET || 'your_secret_key';

const ROLES = {
    SENIOR_DOCTOR: 'SENIOR_DOCTOR',
    PERMANENT_DOCTOR: 'PERMANENT_DOCTOR',
    DOCTOR: 'DOCTOR',
    SECRETARY: 'SECRETARY'
};

// Role hierarchy for permission checks
const ROLE_LEVELS = {
    SENIOR_DOCTOR: 4,
    PERMANENT_DOCTOR: 3,
    DOCTOR: 2,
    SECRETARY: 1
};

// Helper to extract JWT from Authorization header and populate session
const extractJwtToSession = (req) => {
    // If session already has role info, skip JWT extraction
    if (req.session && (req.session.role || req.session.roleId || req.session.employeeId)) {
        return;
    }

    // Try to extract JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, JWT_SECRET);

            if (decoded.type === 'employee') {
                // Populate session with JWT data for mobile browsers
                req.session.roleId = decoded.role_id;
                req.session.role = decoded.role;
                req.session.clinic_id = decoded.clinic_id;
                req.session.clinic_name = decoded.clinic_name;
            } else if (decoded.type === 'clinic') {
                // Clinic-only token
                req.session.clinic_id = decoded.clinic_id;
                req.session.clinic_name = decoded.clinic_name;
            }
        } catch (err) {
            // Invalid token - leave session as-is
            console.log('JWT extraction failed:', err.message);
        }
    }
};

// Check if employee is authenticated (works with both old and new session structure)
const requireAuth = (req, res, next) => {
    // First try to extract JWT to session (for mobile browsers)
    extractJwtToSession(req);

    // Check for role-based auth (new) or employeeId (legacy)
    if (req.session && (req.session.role || req.session.roleId || req.session.employeeId)) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized - Login required' });
    }
};

// Check if clinic is authenticated
const requireClinic = (req, res, next) => {
    // First try to extract JWT to session (for mobile browsers)
    extractJwtToSession(req);

    if (req.session && req.session.clinic_id) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized - Clinic login required' });
    }
};

// Require specific roles (accepts array of allowed roles)
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // First try to extract JWT to session (for mobile browsers)
        extractJwtToSession(req);

        // Check for authentication
        if (!req.session || (!req.session.role && !req.session.employeeId)) {
            return res.status(401).json({ message: 'Unauthorized - Login required' });
        }

        const userRole = req.session.role?.toUpperCase();

        if (!userRole) {
            return res.status(403).json({ message: 'Forbidden - No role assigned' });
        }

        // Normalize role names for comparison
        const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());

        if (normalizedAllowedRoles.includes(userRole)) {
            next();
        } else {
            res.status(403).json({
                message: 'Forbidden - Insufficient privileges',
                required: allowedRoles,
                current: userRole
            });
        }
    };
};

// Shorthand role groups based on new RBAC requirements
// SENIOR_DOCTOR: Final reports only
// PERMANENT_DOCTOR: Full access  
// DOCTOR: Patient demographics + history only
// SECRETARY: Appointments only

const ADMIN_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR];
const CLINICAL_ROLES = [ROLES.PERMANENT_DOCTOR, ROLES.DOCTOR]; // Doctors who can edit patient data
const PATIENT_VIEW_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR, ROLES.DOCTOR]; // Can view patients (SENIOR_DOCTOR for reports)
const REPORT_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR]; // Can access reports
const APPOINTMENT_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR, ROLES.DOCTOR, ROLES.SECRETARY]; // All can manage appointments
const ALL_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR, ROLES.DOCTOR, ROLES.SECRETARY];

module.exports = {
    requireAuth,
    requireClinic,
    requireRole,
    extractJwtToSession,
    ROLES,
    ROLE_LEVELS,
    ADMIN_ROLES,
    CLINICAL_ROLES,
    PATIENT_VIEW_ROLES,
    REPORT_ROLES,
    APPOINTMENT_ROLES,
    ALL_ROLES
};
