const db = require('../db');

/**
 * Log an audit event. Fire-and-forget — never blocks the response.
 * 
 * @param {object} req - Express request (for session/IP extraction)
 * @param {object} opts
 * @param {string} opts.action - CREATE | UPDATE | DELETE | LOGIN | LOGOUT
 * @param {string} opts.entityType - APPOINTMENT | PATIENT | FINANCIAL_EVENT | INVENTORY_ITEM | INVENTORY_BATCH | AUTH etc.
 * @param {number|string|null} opts.entityId - ID of the affected record
 * @param {object|string|null} opts.details - Additional context (will be JSON.stringified if object)
 */
function logAudit(req, { action, entityType, entityId = null, details = null }) {
    try {
        const userRole = req.session?.role || null;
        const userRoleId = req.session?.roleId || null;
        const clinicId = req.session?.clinic_id || null;
        const ipAddress = req.ip || req.connection?.remoteAddress || null;
        const detailsStr = details
            ? (typeof details === 'string' ? details : JSON.stringify(details))
            : null;

        db.run(
            `INSERT INTO audit_logs (action, entity_type, entity_id, user_role, user_role_id, clinic_id, details, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [action, entityType, entityId, userRole, userRoleId, clinicId, detailsStr, ipAddress],
            function (err) {
                if (err) {
                    console.error('[AUDIT] Failed to log audit event:', err.message);
                }
            }
        );
    } catch (err) {
        console.error('[AUDIT] Error in logAudit:', err.message);
    }
}

module.exports = { logAudit };
