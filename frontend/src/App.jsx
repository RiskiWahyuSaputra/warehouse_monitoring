import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ThemeProvider } from './context/ThemeContext';
import { GlobalSearchProvider } from './context/GlobalSearchContext';
import { DashboardProvider } from './context/DashboardContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import InventoryPage from './pages/Inventory';
import MovementsPage from './pages/Movements';
import ApprovalsPage from './pages/Approvals';
import EmailSettingsPage from './pages/EmailSettings';
import ForecastsPage from './pages/Forecasts';
import UsersPage from './pages/Users';
import NotificationsPage from './pages/Notifications';
import AuditLogsPage from './pages/AuditLogs';
import BackupPage from './pages/Backup';
import CategoriesPage from './pages/Categories';
import LocationsPage from './pages/Locations';
import SuppliersPage from './pages/Suppliers';
import BarcodePage from './pages/Barcode';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <ThemeProvider>
            <GlobalSearchProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/" element={<ProtectedRoute><DashboardProvider><DashboardPage /></DashboardProvider></ProtectedRoute>} />
                  <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
                  <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
                  <Route path="/locations" element={<ProtectedRoute><LocationsPage /></ProtectedRoute>} />
                  <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
                  <Route path="/audit-logs" element={<ProtectedRoute roles={['admin', 'manager']}><AuditLogsPage /></ProtectedRoute>} />
                  <Route path="/backup" element={<ProtectedRoute roles={['admin', 'manager']}><BackupPage /></ProtectedRoute>} />
                  <Route path="/barcode" element={<ProtectedRoute><BarcodePage /></ProtectedRoute>} />
                  <Route path="/movements" element={<ProtectedRoute><MovementsPage /></ProtectedRoute>} />
                  <Route path="/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
                  <Route path="/forecasts" element={<ProtectedRoute><ForecastsPage /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                  <Route path="/email-settings" element={<ProtectedRoute roles={['admin', 'manager']}><EmailSettingsPage /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute roles={['admin', 'manager']}><UsersPage /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </GlobalSearchProvider>
          </ThemeProvider>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
