import { useState } from 'react';
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (!user) return null;

    const userRole = user.role;

    // Role checks
    const canViewPatients = hasAccess(userRole, CLINICAL_ROLES);
    const canViewAccounting = hasAccess(userRole, ADMIN_ROLES);
    const canViewInventory = hasAccess(userRole, ADMIN_ROLES);

    // Logout: clears employee session, keeps clinic session
    const handleLogout = async () => {
        setIsMobileMenuOpen(false);
        await logout();
    };

    // Switch Clinic: clears BOTH sessions
    const handleSwitchClinic = async () => {
        setIsMobileMenuOpen(false);
        await logout();
        await logoutClinic();
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

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-slate-200 absolute w-full shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <div className="px-4 py-3 space-y-1">
                        <div className="pb-3 mb-3 border-b border-slate-100">
                            <div className="font-medium text-slate-900">{user.username}</div>
                            <div className="text-sm text-slate-500">{clinic?.name}</div>
                        </div>

                        {canViewPatients && (
                            <Link to="/patients" className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>👥 Patients</Link>
                        )}
                        <Link to="/appointments" className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>📅 Appointments</Link>

                        {canViewAccounting && (
                            <div className="space-y-1 pt-2">
                                <div className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Accounting</div>
                                <Link to="/daily-summary" className="block px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Daily Ledger</Link>
                                <Link to="/monthly-report" className="block px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Monthly Report</Link>
                                <Link to="/financial-events" className="block px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>All Events</Link>
                                <Link to="/backup-settings" className="block px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Backup</Link>
                            </div>
                        )}

                        {canViewInventory && (
                            <div className="space-y-1 pt-2">
                                <div className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory</div>
                                <Link to="/inventory-items" className="block px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Items Catalog</Link>
                                <Link to="/inventory-batches" className="block px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Stock & Batches</Link>
                                <Link to="/inventory-dispense" className="block px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Dispense</Link>
                                <Link to="/inventory-movements" className="block px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Movement Log</Link>
                                <Link to="/suppliers" className="block px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Suppliers</Link>
                                <Link to="/pharmacies" className="block px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Pharmacies</Link>
                                <Link to="/inventory-alerts" className="block px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Alerts & Expiry</Link>
                            </div>
                        )}

                        <div className="pt-4 pb-2 border-t border-slate-100 mt-2">
                            <button onClick={handleLogout} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:bg-slate-50">
                                Logout
                            </button>
                            <button onClick={handleSwitchClinic} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50">
                                Switch Clinic
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
