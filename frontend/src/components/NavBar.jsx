import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import { usePharmacy } from '../context/PharmacyContext';
import { useTheme } from '../context/ThemeContext';
import { hasAccess, ADMIN_ROLES, CLINICAL_ROLES, REPORT_ROLES, ALL_ROLES } from './RoleProtectedRoute';
import DropdownMenu, { DropdownLink } from './DropdownMenu';

function PharmacySelector() {
    const { pharmacies, selectedPharmacyId, selectPharmacy } = usePharmacy();

    if (pharmacies.length === 0) return null;

    return (
        <select
            value={selectedPharmacyId}
            onChange={(e) => selectPharmacy(e.target.value)}
            className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--panel)] text-[var(--text)] hover:bg-[var(--panel-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
            <option value="">Select Pharmacy...</option>
            {pharmacies.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
            ))}
        </select>
    );
}

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--text)] hover:bg-[var(--panel-hover)] hover:text-primary focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            )}
        </button>
    );
}

function NavLink({ to, children }) {
    const location = useLocation();
    const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

    return (
        <Link
            to={to}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${isActive
                ? 'bg-primary text-[var(--primary-contrast)] shadow-sm shadow-primary/20'
                : 'text-[var(--text)] hover:bg-[var(--panel-hover)] hover:text-primary'
                }`}
        >
            {children}
            {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-[var(--ring)] rounded-full" />
            )}
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
        <nav className="bg-[var(--panel)] border-b border-[var(--border)] shadow-lg relative z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo and Navigation */}
                    <div className="flex items-center gap-6">
                        <Link to="/" className="flex items-center shrink-0">
                            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-700 bg-clip-text text-transparent">
                                Yomchi Healthcare
                            </span>
                            {clinic && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full hidden sm:inline-block">
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
                                    <div className="border-t border-[var(--border)] my-1"></div>
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
                                    <div className="border-t border-[var(--border)] my-1"></div>
                                    <DropdownLink to="/suppliers">Suppliers</DropdownLink>
                                    <DropdownLink to="/pharmacies">Pharmacies</DropdownLink>
                                    <div className="border-t border-[var(--border)] my-1"></div>
                                    <DropdownLink to="/inventory-alerts">⚠️ Alerts & Expiry</DropdownLink>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>

                    {/* Right side: Desktop Pharmacy selector + User info */}
                    <div className="hidden md:flex items-center gap-4">
                        {canViewInventory && <PharmacySelector />}

                        <ThemeToggle />

                        <div className="flex items-center gap-3">
                            <div className="text-sm text-right">
                                <div className="font-medium text-[var(--text)]">{user?.username || 'User'}</div>
                                <div className="text-[var(--muted)] text-xs px-2 py-0.5 bg-[var(--bg-2)] border border-[var(--border)] rounded-full inline-block">
                                    {user?.role?.replace('_', ' ') || 'Unknown'}
                                </div>
                            </div>

                            {/* Logout dropdown or buttons */}
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={handleLogout}
                                    className="text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] hover:underline transition-colors"
                                >
                                    Logout
                                </button>
                                <button
                                    onClick={handleSwitchClinic}
                                    className="text-xs font-medium text-danger hover:text-danger-600 hover:underline transition-colors"
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
                            className="p-2 rounded-md text-[var(--text)] hover:text-primary hover:bg-[var(--panel-hover)] focus:outline-none transition-colors"
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
                    className="fixed inset-0 bg-black/70 z-40 md:hidden transition-opacity backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Side Drawer */}
            <div className={`fixed inset-y-0 left-0 w-72 bg-[var(--panel)] border-r border-[var(--border)] shadow-2xl z-50 transform transition-transform duration-300 md:hidden flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                {/* Drawer Header */}
                <div className="p-4 bg-[var(--bg-2)] border-b border-[var(--border)]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-lg">
                            {user?.username?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <div className="font-bold text-[var(--text)] truncate">{user?.username || 'User'}</div>
                            <div className="text-xs text-[var(--muted)] capitalize">{user?.role?.replace('_', ' ') || 'Unknown'}</div>
                        </div>
                    </div>
                    {clinic && (
                        <div className="px-3 py-1.5 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-xs text-[var(--muted)] font-medium text-center shadow-sm">
                            🏥 {clinic.name}
                        </div>
                    )}
                </div>

                {/* Drawer Links - Scrollable */}
                <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
                    <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 px-3 mt-2">Menu</div>

                    <Link
                        to="/appointments"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text)] hover:bg-[var(--panel-hover)] hover:text-primary transition-all"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <span>📅</span> Appointments
                    </Link>

                    {canViewPatients && (
                        <Link
                            to="/patients"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text)] hover:bg-[var(--panel-hover)] hover:text-primary transition-all"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <span>👥</span> Patients
                        </Link>
                    )}

                    {canViewPatientReports && (
                        <Link
                            to="/patient-reports"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text)] hover:bg-[var(--panel-hover)] hover:text-primary transition-all"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <span>📋</span> Patient Reports
                        </Link>
                    )}

                    {canViewAccounting && (
                        <>
                            <div className="my-2 border-t border-[var(--border)]" />
                            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 px-3 mt-2">Accounting</div>
                            <Link to="/daily-summary" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)] ml-2 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Daily Ledger</Link>
                            <Link to="/monthly-report" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)] ml-2 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Monthly Report</Link>
                            <Link to="/financial-events" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)] ml-2 transition-all" onClick={() => setIsMobileMenuOpen(false)}>All Events</Link>
                            <Link to="/backup-settings" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)] ml-2 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Backup</Link>
                        </>
                    )}

                    {canViewInventory && (
                        <>
                            <div className="my-2 border-t border-[var(--border)]" />
                            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 px-3 mt-2">Inventory</div>
                            <Link to="/inventory-items" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)] ml-2 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Items Catalog</Link>
                            <Link to="/inventory-batches" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)] ml-2 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Stock & Batches</Link>
                            <Link to="/inventory-dispense" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)] ml-2 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Dispense</Link>
                            <Link to="/inventory-movements" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)] ml-2 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Movement Log</Link>
                            <Link to="/suppliers" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)] ml-2 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Suppliers</Link>
                            <Link to="/pharmacies" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)] ml-2 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Pharmacies</Link>
                            <Link to="/inventory-alerts" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)] ml-2 transition-all" onClick={() => setIsMobileMenuOpen(false)}>Alerts & Expiry</Link>
                        </>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-4 border-t border-[var(--border)] space-y-2 bg-[var(--bg-2)]">
                    <button
                        onClick={handleSwitchClinic}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-danger bg-[var(--panel)] border border-danger/30 hover:bg-danger/10 transition-all"
                    >
                        🏥 Switch Clinic
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--panel)] border border-[var(--border)] hover:bg-[var(--panel-hover)] transition-all"
                    >
                        🚪 Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}
