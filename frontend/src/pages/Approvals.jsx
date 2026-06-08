import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

export default function ApprovalsPage() {
  const { user, hasRole } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [decisionRemarks, setDecisionRemarks] = useState({});

  const isManager = hasRole('admin', 'manager');

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/approvals?page=${page}`);
      setApprovals(res.data.data);
      setMeta({ current_page: res.data.current_page, last_page: res.data.last_page });
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchApprovals(); }, [page]);

  const handleDecide = async (id, decision) => {
    try {
      await api.post(`/approvals/${id}/decide`, {
        decision,
        remarks: decisionRemarks[id] || '',
      });
      fetchApprovals();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing decision');
    }
  };

  const statusIcon = (status) => {
    if (status === 'pending') return <Clock size={14} className="text-yellow-500" />;
    if (status === 'approved') return <CheckCircle size={14} className="text-green-500" />;
    return <XCircle size={14} className="text-red-500" />;
  };

  const statusBadge = (status) => {
    if (status === 'pending') return <span className="badge-warning">Pending</span>;
    if (status === 'approved') return <span className="badge-success">Approved</span>;
    return <span className="badge-danger">Rejected</span>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold dark:text-gray-100">Approval Requests</h1>
        <p className="text-gray-500 dark:text-gray-400">Review and decide on outgoing stock requests</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b dark:bg-gray-800/50 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Item</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Requester</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Qty</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
                {isManager && <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-4"><TableSkeleton rows={5} cols={isManager ? 7 : 6} /></td></tr>
              ) : approvals.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState
                    icon="approvals"
                    title="No approval requests"
                    description="Approval requests for outgoing stock will appear here."
                  />
                </td></tr>
              ) : approvals.map((a) => (
                <tr key={a.id} className="border-b hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.item?.name || '-'}</p>
                    <p className="text-xs text-gray-400">{a.item?.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.requester?.name || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium">{a.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">{a.location ? `${a.location.zone}-${a.location.rack}` : '-'}</td>
                  <td className="px-4 py-3">{statusBadge(a.status)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.created_at).toLocaleDateString()}</td>
                  {isManager && a.status === 'pending' && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          className="input w-32 text-xs py-1"
                          placeholder="Remarks..."
                          value={decisionRemarks[a.id] || ''}
                          onChange={(e) => setDecisionRemarks({ ...decisionRemarks, [a.id]: e.target.value })}
                        />
                        <button onClick={() => handleDecide(a.id, 'approved')} className="p-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100" title="Approve">
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={() => handleDecide(a.id, 'rejected')} className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100" title="Reject">
                          <XCircle size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Page {meta.current_page} of {meta.last_page}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary btn-sm">Prev</button>
              <button onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page >= meta.last_page} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
