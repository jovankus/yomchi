import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Role groups matching backend (lowercase to match database)
export const ROLES = {
    SENIOR_DOCTOR: 'senior_doctor',
    PERMANENT_DOCTOR: 'permanent_doctor',
    DOCTOR: 'doctor',
    SECRETARY: 'secretary',
    // Also support legacy/alternative role names
    ADMIN: 'admin',
    STAFF: 'staff'
};

// RBAC Role Groups per requirements:
// SENIOR_DOCTOR: Final reports only (no patient data)
// PERMANENT_DOCTOR: Full access
// DOCTOR: Patient demographics + history only  
// SECRETARY: Appointments only

// Admin roles - full access to accounting/inventory
export const ADMIN_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR, ROLES.ADMIN];
// Clinical roles - can access patient data (excludes SENIOR_DOCTOR as they only see reports)
export const CLINICAL_ROLES = [ROLES.PERMANENT_DOCTOR, ROLES.ADMIN, ROLES.DOCTOR];
// All roles for appointments
export const ALL_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR, ROLES.ADMIN, ROLES.DOCTOR, ROLES.SECRETARY, ROLES.STAFF];

// Component that protects routes based on allowed roles
export default function RoleProtectedRoute({ allowedRoles, children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check if user's role is in the allowed roles (normalize to lowercase)
    const userRole = user.role?.toLowerCase() || '';
    if (!allowedRoles.includes(userRole)) {
        return <Navigate to="/not-authorized" replace />;
    }

    // If children provided, render them; otherwise render Outlet for nested routes
    return children ? children : <Outlet />;
}

// Helper function to check role access (for conditional rendering)
export function hasAccess(userRole, allowedRoles) {
    if (!userRole || !allowedRoles) return false;
    const normalizedRole = userRole.toLowerCase();
    return allowedRoles.includes(normalizedRole);
}
