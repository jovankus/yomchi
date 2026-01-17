import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PharmacyProvider } from './context/PharmacyContext';
import { ClinicProvider, useClinic } from './context/ClinicContext';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import ClinicLogin from './pages/ClinicLogin';
import NotAuthorized from './pages/NotAuthorized';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientForm from './pages/PatientForm';
import PatientPrintView from './pages/PatientPrintView';
import PatientReports from './pages/PatientReports';
import PatientReportView from './pages/PatientReportView';
import PrescriptionForm from './pages/PrescriptionForm';
import Appointments from './pages/Appointments';
import TodayAppointments from './pages/TodayAppointments';
import AppointmentForm from './pages/AppointmentForm';
import Pharmacies from './pages/Pharmacies';
import InventoryItems from './pages/InventoryItems';
import Suppliers from './pages/Suppliers';
import InventoryBatches from './pages/InventoryBatches';
import StockMovements from './pages/StockMovements';
import DispenseStock from './pages/DispenseStock';
import InventoryAlerts from './pages/InventoryAlerts';
import FinancialEvents from './pages/FinancialEvents';
import DailySummary from './pages/DailySummary';
import MonthlyReport from './pages/MonthlyReport';
import BackupSettings from './pages/BackupSettings';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute, { ADMIN_ROLES, CLINICAL_ROLES, REPORT_ROLES, ALL_ROLES } from './components/RoleProtectedRoute';

// Component that gates all routes behind clinic authentication
function ClinicGate({ children }) {
    const { clinic, loading } = useClinic();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!clinic) {
        return <Navigate to="/clinic-login" replace />;
    }

    return children;
}

function AppRoutes() {
    const { clinic, loading } = useClinic();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Clinic login is always accessible */}
            <Route path="/clinic-login" element={
                clinic ? <Navigate to="/" replace /> : <ClinicLogin />
            } />

            {/* Not authorized page */}
            <Route path="/not-authorized" element={
                <ClinicGate><NotAuthorized /></ClinicGate>
            } />

            {/* Employee login requires clinic session */}
            <Route path="/login" element={
                <ClinicGate><Login /></ClinicGate>
            } />

            {/* Protected routes - require both clinic and employee auth */}
            <Route element={<ClinicGate><ProtectedRoute /></ClinicGate>}>
                {/* Appointments - All roles */}
                <Route path="/today" element={<AppShell><ErrorBoundary><TodayAppointments /></ErrorBoundary></AppShell>} />
                <Route path="/appointments" element={<AppShell><ErrorBoundary><Appointments /></ErrorBoundary></AppShell>} />
                <Route path="/appointments/new" element={<AppShell><ErrorBoundary><AppointmentForm /></ErrorBoundary></AppShell>} />
                <Route path="/appointments/:id" element={<AppShell><ErrorBoundary><AppointmentForm /></ErrorBoundary></AppShell>} />

                {/* Patients - Clinical roles (doctors) */}
                <Route element={<RoleProtectedRoute allowedRoles={CLINICAL_ROLES} />}>
                    <Route path="/patients" element={<AppShell><ErrorBoundary><Patients /></ErrorBoundary></AppShell>} />
                    <Route path="/patients/new" element={<AppShell><ErrorBoundary><PatientForm /></ErrorBoundary></AppShell>} />
                    <Route path="/patients/:id" element={<AppShell><ErrorBoundary><PatientForm /></ErrorBoundary></AppShell>} />
                    <Route path="/patients/:id/print" element={<PatientPrintView />} />
                    <Route path="/patients/:id/prescription" element={<PrescriptionForm />} />
                </Route>

                {/* Patient Reports - Senior Doctor only (read-only view) */}
                <Route element={<RoleProtectedRoute allowedRoles={REPORT_ROLES} />}>
                    <Route path="/patient-reports" element={<AppShell><ErrorBoundary><PatientReports /></ErrorBoundary></AppShell>} />
                    <Route path="/patient-reports/:id" element={<PatientReportView />} />
                </Route>

                {/* Accounting + Dashboard - Admin roles only */}
                <Route element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES} />}>
                    <Route path="/" element={<AppShell><ErrorBoundary><Dashboard /></ErrorBoundary></AppShell>} />
                    <Route path="/financial-events" element={<AppShell><ErrorBoundary><FinancialEvents /></ErrorBoundary></AppShell>} />
                    <Route path="/daily-summary" element={<AppShell><ErrorBoundary><DailySummary /></ErrorBoundary></AppShell>} />
                    <Route path="/monthly-report" element={<AppShell><ErrorBoundary><MonthlyReport /></ErrorBoundary></AppShell>} />
                    <Route path="/backup-settings" element={<AppShell><ErrorBoundary><BackupSettings /></ErrorBoundary></AppShell>} />
                </Route>

                {/* Inventory - Admin roles only */}
                <Route element={<RoleProtectedRoute allowedRoles={ADMIN_ROLES} />}>
                    <Route path="/pharmacies" element={<AppShell><ErrorBoundary><Pharmacies /></ErrorBoundary></AppShell>} />
                    <Route path="/inventory-items" element={<AppShell><ErrorBoundary><InventoryItems /></ErrorBoundary></AppShell>} />
                    <Route path="/inventory-batches" element={<AppShell><ErrorBoundary><InventoryBatches /></ErrorBoundary></AppShell>} />
                    <Route path="/inventory-dispense" element={<AppShell><ErrorBoundary><DispenseStock /></ErrorBoundary></AppShell>} />
                    <Route path="/inventory-movements" element={<AppShell><ErrorBoundary><StockMovements /></ErrorBoundary></AppShell>} />
                    <Route path="/inventory-alerts" element={<AppShell><ErrorBoundary><InventoryAlerts /></ErrorBoundary></AppShell>} />
                    <Route path="/suppliers" element={<AppShell><ErrorBoundary><Suppliers /></ErrorBoundary></AppShell>} />
                </Route>
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <ClinicProvider>
                <AuthProvider>
                    <PharmacyProvider>
                        <AppRoutes />
                    </PharmacyProvider>
                </AuthProvider>
            </ClinicProvider>
        </BrowserRouter>
    );
}

export default App;
