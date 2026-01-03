import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import { usePharmacy } from '../context/PharmacyContext';
import { hasAccess, ADMIN_ROLES, CLINICAL_ROLES, ALL_ROLES } from './RoleProtectedRoute';
import DropdownMenu, { DropdownLink } from './DropdownMenu';

function PharmacySelector() {
    const { pharmacies, selectedPharmacyId, selectPharmacy } = usePharmacy();

    if (pharmacies.length === 0) return null;

    return (
        <select
            value={selectedPharmacyId}
            onChange={(e) => selectPharmacy(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
            <option value="">Select Pharmacy...</option>
            {pharmacies.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
            ))}
        </select>
    );
}

function NavLink({ to, children }) {
    const location = useLocation();
    const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

    return (
        <Link
            to={to}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                ? 'bg-primary-600 text-white'
                : 'text-slate-700 hover:bg-slate-100'
                }`}
        >
            {children}
        </Link>
    );
}

export default function NavBar() {
    const { user, logout } = useAuth();
    const { clinic, logoutClinic } = useClinic();

    if (!user) return null;

    const userRole = user.role;

    // Role checks
    const canViewPatients = hasAccess(userRole, CLINICAL_ROLES);
    const canViewAccounting = hasAccess(userRole, ADMIN_ROLES);
    const canViewInventory = hasAccess(userRole, ADMIN_ROLES);

    // Logout: clears employee session, keeps clinic session
    // User returns to employee login page (within same clinic)
    const handleLogout = async () => {
        await logout();
    };

    // Switch Clinic: clears BOTH sessions
    // User returns to clinic login page
    const handleSwitchClinic = async () => {
        await logout();
        await logoutClinic();
    };

    return (
        <nav className="bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo and Navigation */}
                    <div className="flex items-center gap-6">
                        <Link to="/" className="flex items-center">
                            <span className="text-xl font-bold text-primary-600">PracticeClone</span>
                            {clinic && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                                    {clinic.name}
                                </span>
                            )}
                        </Link>

                        <div className="flex items-center gap-1">
                            {/* Patients - Doctors only */}
                            {canViewPatients && (
                                <NavLink to="/patients">👥 Patients</NavLink>
                            )}

                            {/* Appointments - All roles */}
                            <NavLink to="/appointments">📅 Appointments</NavLink>

                            {/* Accounting - Admin roles only */}
                            {canViewAccounting && (
                                <DropdownMenu label="💰 Accounting" basePath="/daily-summary">
                                    <DropdownLink to="/daily-summary">📊 Daily Ledger</DropdownLink>
                                    <DropdownLink to="/monthly-report">📈 Monthly Report</DropdownLink>
                                    <DropdownLink to="/financial-events">📋 All Events</DropdownLink>
                                    <div className="border-t border-slate-200 my-1"></div>
                                    <DropdownLink to="/backup-settings">💾 Backup</DropdownLink>
                                </DropdownMenu>
                            )}

                            {/* Inventory - Admin roles only */}
                            {canViewInventory && (
                                <DropdownMenu label="📦 Inventory" basePath="/inventory">
                                    <DropdownLink to="/inventory-items">Items Catalog</DropdownLink>
                                    <DropdownLink to="/inventory-batches">Stock & Batches</DropdownLink>
                                    <DropdownLink to="/inventory-dispense">Dispense</DropdownLink>
                                    <DropdownLink to="/inventory-movements">Movement Log</DropdownLink>
                                    <div className="border-t border-slate-200 my-1"></div>
                                    <DropdownLink to="/suppliers">Suppliers</DropdownLink>
                                    <DropdownLink to="/pharmacies">Pharmacies</DropdownLink>
                                    <div className="border-t border-slate-200 my-1"></div>
                                    <DropdownLink to="/inventory-alerts">⚠️ Alerts & Expiry</DropdownLink>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>

                    {/* Right side: Pharmacy selector + User info */}
                    <div className="flex items-center gap-4">
                        {canViewInventory && <PharmacySelector />}

                        <div className="flex items-center gap-3">
                            <div className="text-sm">
                                <span className="font-medium text-slate-900">{user.username}</span>
                                <span className="text-slate-500 ml-2 text-xs px-2 py-0.5 bg-slate-100 rounded-full">
                                    {user.role.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Logout: keeps clinic, returns to employee login */}
                            <button
                                onClick={handleLogout}
                                title="Logout (stay in this clinic)"
                                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Logout
                            </button>

                            {/* Switch Clinic: clears both sessions */}
                            <button
                                onClick={handleSwitchClinic}
                                title="Logout and switch to a different clinic"
                                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                Switch Clinic
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
