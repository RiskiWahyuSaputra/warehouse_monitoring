import { useState, useEffect } from 'react';
import api from '../services/api';
import { Bell, CheckCheck, AlertTriangle, Package, Truck, Settings, Inbox } from 'lucide-react';

const typeIcons = {
  low_stock: AlertTriangle,
  approval_request: Bell,
  delivery_update: Truck,
  system_alert: Settings,
};

const typeColors = {
  low_stock: 'text-red-500 bg-red-50',
  approval_request: 'text-yellow-500 bg-yellow-50',
  delivery_update: 'text-blue-500 bg-blue-50',
  system_alert: 'text-purple-500 bg-purple-50',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/in-app-notifications?filter=${filter}`);
      setNotifications(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [filter]);

  const markAsRead = async (id) => {
    try {
      await api.post(`/in-app-notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/in-app-notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-gray-500 text-sm">{unreadCount} unread</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${filter === 'unread' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Unread
            </button>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="btn-secondary btn-sm gap-1.5">
              <CheckCheck size={14} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Inbox size={40} className="mx-auto mb-3 text-gray-300" />
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = typeIcons[n.type] || Bell;
            const color = typeColors[n.type] || 'text-gray-500 bg-gray-50';
            return (
              <div
                key={n.id}
                className={`card p-4 flex items-start gap-3 transition-colors ${!n.read_at ? 'border-l-4 border-l-primary-500 bg-primary-50/30' : ''}`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-medium ${!n.read_at ? 'text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    </div>
                    {!n.read_at && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-xs text-primary-600 hover:text-primary-700 flex-shrink-0 font-medium"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
