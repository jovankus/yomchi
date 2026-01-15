import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import { usePharmacy } from '../context/PharmacyContext';
import { hasAccess, ADMIN_ROLES, CLINICAL_ROLES, REPORT_ROLES, ALL_ROLES } from './RoleProtectedRoute';
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    if (!user) return null;

    const userRole = user.role;

    // Role checks
    const canViewPatients = hasAccess(userRole, CLINICAL_ROLES);
    const canViewPatientReports = hasAccess(userRole, REPORT_ROLES);
    const canViewAccounting = hasAccess(userRole, ADMIN_ROLES);
    const canViewInventory = hasAccess(userRole, ADMIN_ROLES);

    // Logout: clears employee session, keeps clinic session
    const handleLogout = async () => {
        setIsMobileMenuOpen(false);
        await logout();
        navigate('/login');
    };

    // Switch Clinic: clears BOTH sessions
    const handleSwitchClinic = async () => {
        setIsMobileMenuOpen(false);
        await logout();
        await logoutClinic();
        navigate('/clinic-login');
    };

    return (
        <nav className="bg-white border-b border-slate-200 shadow-sm relative z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo and Navigation */}
                    <div className="flex items-center gap-6">
                        <Link to="/" className="flex items-center shrink-0">
                            <span className="text-xl font-bold text-primary-600">Yomchi Healthcare</span>
                            {clinic && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full hidden sm:inline-block">
                                    {clinic.name}
                                </span>
                            )}
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-1">
                            {/* Patients - Doctors only */}
                            {canViewPatients && (
                                <NavLink to="/patients">👥 Patients</NavLink>
                            )}

                            {/* Patient Reports - Senior Doctor only (read-only view) */}
                            {canViewPatientReports && (
                                <NavLink to="/patient-reports">📋 Patient Reports</NavLink>
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

                    {/* Right side: Desktop Pharmacy selector + User info */}
                    <div className="hidden md:flex items-center gap-4">
                        {canViewInventory && <PharmacySelector />}

                        <div className="flex items-center gap-3">
                            <div className="text-sm text-right">
                                <div className="font-medium text-slate-900">{user.username}</div>
                                <div className="text-slate-500 text-xs px-2 py-0.5 bg-slate-100 rounded-full inline-block">
                                    {user.role.replace('_', ' ')}
                                </div>
                            </div>

                            {/* Logout dropdown or buttons */}
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={handleLogout}
                                    className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                                >
                                    Logout
                                </button>
                                <button
                                    onClick={handleSwitchClinic}
                                    className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                                >
                                    Switch Clinic
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
                        >
                            {isMobileMenuOpen ? (
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Drawer */}
            {/* Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Side Drawer */}
            <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 md:hidden flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                {/* Drawer Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <div className="font-bold text-slate-900 truncate">{user.username}</div>
                            <div className="text-xs text-slate-500 capitalize">{user.role.replace('_', ' ')}</div>
                        </div>
                    </div>
                    {clinic && (
                        <div className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 font-medium text-center shadow-sm">
                            🏥 {clinic.name}
                        </div>
                    )}
                </div>

                {/* Drawer Links - Scrollable */}
                <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-2">Menu</div>

                    <Link to="/appointments" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-primary-600 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <span>📅</span> Appointments
                    </Link>

                    {canViewPatients && (
                        <Link to="/patients" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-primary-600 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                            <span>👥</span> Patients
                        </Link>
                    )}

                    {canViewPatientReports && (
                        <Link to="/patient-reports" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-primary-600 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                            <span>📋</span> Patient Reports
                        </Link>
                    )}

                    {canViewAccounting && (
                        <>
                            <div className="my-2 border-t border-slate-100" />
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-2">Accounting</div>
                            <Link to="/daily-summary" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 ml-2" onClick={() => setIsMobileMenuOpen(false)}>Daily Ledger</Link>
                            <Link to="/monthly-report" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 ml-2" onClick={() => setIsMobileMenuOpen(false)}>Monthly Report</Link>
                            <Link to="/financial-events" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 ml-2" onClick={() => setIsMobileMenuOpen(false)}>All Events</Link>
                            <Link to="/backup-settings" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 ml-2" onClick={() => setIsMobileMenuOpen(false)}>Backup</Link>
                        </>
                    )}

                    {canViewInventory && (
                        <>
                            <div className="my-2 border-t border-slate-100" />
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-2">Inventory</div>
                            <Link to="/inventory-items" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 ml-2" onClick={() => setIsMobileMenuOpen(false)}>Items Catalog</Link>
                            <Link to="/inventory-batches" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 ml-2" onClick={() => setIsMobileMenuOpen(false)}>Stock & Batches</Link>
                            <Link to="/inventory-dispense" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 ml-2" onClick={() => setIsMobileMenuOpen(false)}>Dispense</Link>
                            <Link to="/inventory-movements" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 ml-2" onClick={() => setIsMobileMenuOpen(false)}>Movement Log</Link>
                            <Link to="/suppliers" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 ml-2" onClick={() => setIsMobileMenuOpen(false)}>Suppliers</Link>
                            <Link to="/pharmacies" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 ml-2" onClick={() => setIsMobileMenuOpen(false)}>Pharmacies</Link>
                            <Link to="/inventory-alerts" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 ml-2" onClick={() => setIsMobileMenuOpen(false)}>Alerts & Expiry</Link>
                        </>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-4 border-t border-slate-200 space-y-2 bg-slate-50">
                    <button onClick={handleSwitchClinic} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors">
                        🏥 Switch Clinic
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors">
                        🚪 Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}
