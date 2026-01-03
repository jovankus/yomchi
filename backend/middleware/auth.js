// Role-based access control middleware

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

// Check if employee is authenticated
const requireAuth = (req, res, next) => {
    if (req.session && req.session.employeeId) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized - Employee login required' });
    }
};

// Check if clinic is authenticated
const requireClinic = (req, res, next) => {
    if (req.session && req.session.clinic_id) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized - Clinic login required' });
    }
};

// Require specific roles (accepts array of allowed roles)
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.employeeId) {
            return res.status(401).json({ message: 'Unauthorized - Login required' });
        }

        const userRole = req.session.role;

        if (!userRole) {
            return res.status(403).json({ message: 'Forbidden - No role assigned' });
        }

        // Check if user's role is in the allowed roles array
        if (allowedRoles.includes(userRole)) {
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

// Shorthand role groups
const ADMIN_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR];
const CLINICAL_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR, ROLES.DOCTOR];
const ALL_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR, ROLES.DOCTOR, ROLES.SECRETARY];

module.exports = {
    requireAuth,
    requireClinic,
    requireRole,
    ROLES,
    ROLE_LEVELS,
    ADMIN_ROLES,
    CLINICAL_ROLES,
    ALL_ROLES
};
