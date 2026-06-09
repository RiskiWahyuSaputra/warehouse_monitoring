import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import { HardDrive, Download, Trash2, RefreshCw, Plus, FileArchive, Calendar, Clock, Shield, AlertTriangle } from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

export default function BackupPage() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const isAdmin = hasRole('admin');

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/backup');
      setBackups(res.data);
    } catch (err) {
      toast('Failed to load backups', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    if (!isAdmin) {
      toast('Only admin can create backups', 'error');
      return;
    }
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/zip',
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Backup failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'backup.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast('Backup created and downloaded', 'success');
      fetchBackups();
    } catch (err) {
      toast(err.message || 'Failed to create backup', 'error');
    }
    setCreating(false);
  };

  const handleDownload = async (filename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/backup/download/${filename}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Download failed: ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast('Download started', 'success');
    } catch (err) {
      toast(err.message || 'Failed to download', 'error');
    }
  };

  const handleDelete = async (backup) => {
    if (!isAdmin) {
      toast('Only admin can delete backups', 'error');
      return;
    }
    const ok = await confirm({
      title: 'Delete Backup',
      message: `Delete "${backup.filename}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(`/backup/${backup.filename}`);
      toast('Backup deleted', 'success');
      fetchBackups();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete backup', 'error');
    }
  };

  const totalSize = backups.reduce((sum, b) => sum + (b.size || 0), 0);
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-gray-100">
            <HardDrive size={24} />
            Backup & Restore
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-400">
            Database and storage backups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBackups}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {isAdmin && (
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {creating ? 'Creating...' : 'Create Backup'}
            </button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <FileArchive size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{backups.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Backups</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <HardDrive size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {totalSize > 0 ? formatSize(totalSize) : '0 B'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Size</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20">
              <Shield size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">Daily</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Auto-backup at 2:00 AM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule info */}
      <div className="bg-blue-50/70 rounded-2xl border border-blue-100/50 p-4 dark:bg-blue-900/10 dark:border-blue-900/20">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex-shrink-0">
            <AlertTriangle size={14} />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Automatic Backups</p>
            <p className="text-xs text-blue-600 mt-0.5 dark:text-blue-400">
              System creates daily backups at 2:00 AM and keeps the last 7 backups (DB dump + storage folder as ZIP).
              Ensure the scheduler/cron is running on the server for automatic backups.
            </p>
          </div>
        </div>
      </div>

      {/* Backup list */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 dark:bg-gray-900 dark:border-gray-800">
          <TableSkeleton rows={3} cols={4} />
        </div>
      ) : backups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 dark:bg-gray-900 dark:border-gray-800">
          <EmptyState
            icon="audit"
            title="No backups yet"
            description="Create your first backup to protect your data."
            action={
              isAdmin ? (
                <button
                  onClick={handleCreateBackup}
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  <Plus size={16} />
                  Create First Backup
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 dark:text-gray-400">Filename</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 dark:text-gray-400">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 dark:text-gray-400">Time</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 dark:text-gray-400">Size</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {backups.map((backup) => (
                  <tr key={backup.filename} className="hover:bg-gray-50/50 transition-colors dark:hover:bg-gray-800/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                          <FileArchive size={16} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 font-mono">
                          {backup.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar size={13} className="text-gray-400" />
                        {formatDate(backup.created_at)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <Clock size={13} className="text-gray-400" />
                        {formatTime(backup.created_at)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {backup.size_formatted}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownload(backup.filename)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors dark:hover:bg-blue-900/20 dark:text-blue-400"
                          title="Download"
                        >
                          <Download size={15} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(backup)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors dark:hover:bg-red-900/20 dark:text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return size.toFixed(1) + ' ' + units[i];
}
