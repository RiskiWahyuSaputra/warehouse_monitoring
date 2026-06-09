import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useGlobalSearch } from '../context/GlobalSearchContext';
import {
  LayoutDashboard, Package, ArrowRightLeft, ClipboardCheck,
  Users, BarChart3, ScanBarcode, LogOut, Menu, X, Bell, Tag, MapPin, Truck, FileText, Sun, Moon, Search, HardDrive, Mail
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';
import GlobalSearchBar from '../components/GlobalSearchBar';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'staff'] },
  { to: '/inventory', icon: Package, label: 'Inventory', roles: ['admin', 'manager', 'staff'] },
  { to: '/categories', icon: Tag, label: 'Categories', roles: ['admin', 'manager', 'staff'] },
  { to: '/locations', icon: MapPin, label: 'Locations', roles: ['admin', 'manager', 'staff'] },
  { to: '/suppliers', icon: Truck, label: 'Suppliers', roles: ['admin', 'manager', 'staff'] },
  { to: '/barcode', icon: ScanBarcode, label: 'Scanner', roles: ['admin', 'manager', 'staff'] },
  { to: '/movements', icon: ArrowRightLeft, label: 'Movements', roles: ['admin', 'manager', 'staff'] },
  { to: '/approvals', icon: ClipboardCheck, label: 'Approvals', roles: ['admin', 'manager', 'staff'] },
  { to: '/forecasts', icon: BarChart3, label: 'Forecasts', roles: ['admin', 'manager', 'staff'] },
  { to: '/notifications', icon: Bell, label: 'Notifications', roles: ['admin', 'manager', 'staff'] },
  { to: '/audit-logs', icon: FileText, label: 'Audit Logs', roles: ['admin', 'manager'] },
  { to: '/backup', icon: HardDrive, label: 'Backup', roles: ['admin', 'manager'] },
  { to: '/email-settings', icon: Mail, label: 'Email Settings', roles: ['admin', 'manager'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['admin', 'manager'] },
];

export default function Layout({ children }) {
  const { user, logout, hasRole } = useAuth();
  const { dark, toggle: toggleDark } = useTheme();
  const { setIsOpen, activeFilterCount } = useGlobalSearch();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => { logout(); navigate('/login'); };
  const filteredNav = navItems.filter((item) => hasRole(...item.roles));

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/in-app-notifications/unread-count');
        setUnreadCount(res.data.unread_count || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:relative lg:translate-x-0 dark:bg-gray-900 dark:border-gray-800 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-lg font-bold text-primary-700 dark:text-primary-400">Warehouse Monitor</h1>
          <button className="lg:hidden dark:text-gray-400" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="p-4 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`
              }
            >
              <item.icon size={18} />
              {item.label}
              {item.to === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            {/* Global search trigger */}
            <button
              onClick={() => setIsOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-xs hover:bg-gray-100 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-700 min-w-[200px]"
            >
              <Search size={14} />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="text-[9px] bg-gray-200 px-1 py-0.5 rounded dark:bg-gray-700 dark:text-gray-500">⌘K</kbd>
            </button>
            <button
              onClick={() => setIsOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            >
              <Search size={18} />
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => navigate('/notifications')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative dark:text-gray-300"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-medium dark:bg-primary-900/40 dark:text-primary-400">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium dark:text-gray-200">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 capitalize">{user?.role?.name}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Global search overlay */}
      <GlobalSearchBar />
    </div>
  );
}
