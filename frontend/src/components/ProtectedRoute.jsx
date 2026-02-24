import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Role check - just ensure they have some valid role matching the structure
    // Specific role restrictions are handled by RoleProtectedRoute
    if (!user.role) {
        return <Navigate to="/not-authorized" replace />;
    }

    return <Outlet />;
}
