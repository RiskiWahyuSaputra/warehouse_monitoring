import { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Eye, X, FileText, User, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const actionLabels = {
  login: { label: 'Login', color: 'bg-green-50 text-green-700' },
  logout: { label: 'Logout', color: 'bg-gray-100 text-gray-600' },
  stock_in: { label: 'Stock In', color: 'bg-blue-50 text-blue-700' },
  stock_out: { label: 'Stock Out', color: 'bg-red-50 text-red-700' },
  adjustment: { label: 'Adjustment', color: 'bg-yellow-50 text-yellow-700' },
  create: { label: 'Create', color: 'bg-indigo-50 text-indigo-700' },
  update: { label: 'Update', color: 'bg-orange-50 text-orange-700' },
  delete: { label: 'Delete', color: 'bg-red-50 text-red-700' },
  approve: { label: 'Approve', color: 'bg-green-50 text-green-700' },
  reject: { label: 'Reject', color: 'bg-red-50 text-red-700' },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, search });
      const res = await api.get(`/audit-logs?${params}`);
      setLogs(res.data.data);
      setMeta({ current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, search]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderJson = (data) => {
    if (!data) return <span className="text-gray-400">—</span>;
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return (
        <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return <span className="text-xs text-gray-500">{String(data)}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText size={24} /> Audit Logs
          </h1>
          <p className="text-gray-500 text-sm">{meta.total || 0} log entries total</p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by action, user, or model..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {loading ? (
          <div className="card p-12 text-center text-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">
            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
            <p>No audit logs found</p>
          </div>
        ) : logs.map((log) => {
          const action = actionLabels[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600' };
          const isExpanded = expandedId === log.id;
          return (
            <div key={log.id} className="card overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(log.id)}
              >
                <div className={`px-2.5 py-1 rounded-lg text-xs font-medium ${action.color}`}>
                  {action.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="font-medium">{log.user?.name || 'System'}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 truncate">
                      {log.auditable_type ? log.auditable_type.split('\\').pop() : 'System'}
                      {log.auditable_id ? ` #${log.auditable_id}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                  <Clock size={12} />
                  {new Date(log.created_at).toLocaleString()}
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>

              {isExpanded && (
                <div className="border-t px-4 py-3 bg-gray-50 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-gray-500 font-medium mb-1">IP Address</p>
                      <p className="text-gray-700">{log.ip_address || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium mb-1">User Agent</p>
                      <p className="text-gray-700 truncate">{log.user_agent || '—'}</p>
                    </div>
                  </div>
                  {log.old_values && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Old Values</p>
                      {renderJson(log.old_values)}
                    </div>
                  )}
                  {log.new_values && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">New Values</p>
                      {renderJson(log.new_values)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Page {meta.current_page} of {meta.last_page}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary btn-sm">Prev</button>
            <button onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page >= meta.last_page} className="btn-secondary btn-sm">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
