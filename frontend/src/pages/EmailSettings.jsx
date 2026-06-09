import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Mail, Send, CheckCircle, XCircle, Settings, Clock, Shield, AlertTriangle } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';

export default function EmailSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState('');
  const [emailConfig, setEmailConfig] = useState({
    driver: 'log',
    host: '',
    port: 587,
    username: '',
    from_address: '',
  });
  const [schedules, setSchedules] = useState([
    { name: 'Low Stock Alert', time: 'Daily at 9:00 AM', command: 'emails:low-stock', status: 'active' },
    { name: 'Daily Summary', time: 'Daily at 6:00 PM', command: 'emails:daily-summary', status: 'active' },
    { name: 'Weekly Summary', time: 'Every Monday at 7:00 AM', command: 'emails:weekly-summary', status: 'active' },
  ]);

  useEffect(() => {
    // Load current mail config from env (via API or display defaults)
    setLoading(false);
  }, []);

  const handleTestEmail = async (type) => {
    setSending(type);
    try {
      const res = await api.post('/email/test', { type });
      toast(res.data.message || 'Test email sent', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send test email';
      toast(msg, 'error');
    }
    setSending('');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 mt-2" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-gray-100">
          <Mail size={24} />
          Email Notifications
        </h1>
        <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-400">
          Configure email alerts and scheduled reports
        </p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <Settings size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Mail Driver</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 uppercase">{emailConfig.driver}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20">
              <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Schedules</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{schedules.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20">
              <Shield size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Recipients</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Admin & Manager</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-amber-50/70 rounded-2xl border border-amber-100/50 p-4 dark:bg-amber-900/10 dark:border-amber-900/20">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
            <AlertTriangle size={14} />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Email Configuration</p>
            <p className="text-xs text-amber-600 mt-0.5 dark:text-amber-400">
              Current driver: <strong>{emailConfig.driver}</strong>. To enable real email delivery, configure SMTP settings in <code className="bg-amber-100 px-1 rounded dark:bg-amber-900/30">.env</code> file (MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_ENCRYPTION) and set MAIL_MAILER=smtp.
              With the "log" driver, emails are written to storage/logs/laravel.log for testing.
            </p>
          </div>
        </div>
      </div>

      {/* Test emails */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 dark:bg-gray-900 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Send Test Email</h3>
        <p className="text-xs text-gray-400 mb-4 dark:text-gray-500">Send a test email to verify your configuration</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleTestEmail('low-stock')}
            disabled={!!sending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {sending === 'low-stock' ? (
              <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Low Stock Alert
          </button>
          <button
            onClick={() => handleTestEmail('daily-summary')}
            disabled={!!sending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {sending === 'daily-summary' ? (
              <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Daily Summary
          </button>
          <button
            onClick={() => handleTestEmail('approval')}
            disabled={!!sending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {sending === 'approval' ? (
              <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Approval Request
          </button>
        </div>
      </div>

      {/* Scheduled emails */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden dark:bg-gray-900 dark:border-gray-800">
        <div className="p-5 pb-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Scheduled Emails</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Automated email reports sent to admin & manager</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-b border-gray-100 dark:border-gray-800">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 dark:text-gray-400">Type</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 dark:text-gray-400">Schedule</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 dark:text-gray-400">Command</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {schedules.map((s) => (
                <tr key={s.command} className="hover:bg-gray-50/50 transition-colors dark:hover:bg-gray-800/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <Clock size={13} className="text-gray-400" />
                      {s.time}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {s.command}
                    </code>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full dark:bg-green-900/20 dark:text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email types info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 dark:bg-gray-900 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 dark:text-gray-200">Notification Types</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 flex-shrink-0">
              <AlertTriangle size={14} className="text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Low Stock Alert</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sent when stock falls below minimum threshold. Includes item name, SKU, current stock, and minimum stock level.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
              <Mail size={14} className="text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Approval Request</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sent to admin/manager when a new approval request is created. Includes item, quantity, and requester info.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex-shrink-0">
              <Clock size={14} className="text-purple-500 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Daily / Weekly Summary</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Periodic report with total items, stockout count, low stock, pending approvals, and top moving items.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
