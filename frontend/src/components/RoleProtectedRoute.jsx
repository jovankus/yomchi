import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Role groups matching backend
export const ROLES = {
    SENIOR_DOCTOR: 'SENIOR_DOCTOR',
    PERMANENT_DOCTOR: 'PERMANENT_DOCTOR',
    DOCTOR: 'DOCTOR',
    SECRETARY: 'SECRETARY'
};

export const ADMIN_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR];
export const CLINICAL_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR, ROLES.DOCTOR];
export const ALL_ROLES = [ROLES.SENIOR_DOCTOR, ROLES.PERMANENT_DOCTOR, ROLES.DOCTOR, ROLES.SECRETARY];

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

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/not-authorized" replace />;
    }

    // If children provided, render them; otherwise render Outlet for nested routes
    return children ? children : <Outlet />;
}

// Helper function to check role access (for conditional rendering)
export function hasAccess(userRole, allowedRoles) {
    if (!userRole || !allowedRoles) return false;
    return allowedRoles.includes(userRole);
}
