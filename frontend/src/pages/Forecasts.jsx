import { useState, useEffect } from 'react';
import api, { downloadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, AlertTriangle, RefreshCw, FileSpreadsheet, FileText } from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

export default function ForecastsPage() {
  const { hasRole } = useAuth();
  const [forecasts, setForecasts] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);
  const [generating, setGenerating] = useState(false);
  const isAdmin = hasRole('admin', 'manager');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [f, w] = await Promise.all([
        api.get(`/forecasts?period=${period}&latest=1`),
        api.get('/forecasts/early-warnings'),
      ]);
      setForecasts(f.data.data || []);
      setWarnings(w.data.warnings || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [period]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/forecasts/generate');
      fetchData();
    } catch (err) { alert('Error generating forecasts'); }
    setGenerating(false);
  };

  const handleExport = async (format) => {
    try {
      const ts = new Date().toISOString().slice(0, 10);
      const params = period ? { period } : {};
      if (format === 'excel') {
        await downloadFile('/api/export/forecasts/excel', `forecast_report_${ts}.csv`, params);
      } else {
        await downloadFile('/api/export/forecasts/pdf', `forecast_report_${ts}.html`, params);
      }
    } catch (err) {
      alert('Export failed: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Stock Forecasts</h1>
          <p className="text-gray-500">AI-powered stock requirement predictions</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button onClick={() => handleExport('excel')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            title="Export as CSV">
            <FileSpreadsheet size={14} className="text-green-600" />
            CSV
          </button>
          <button onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            title="Export as PDF-HTML">
            <FileText size={14} className="text-red-500" />
            PDF
          </button>
          <select className="input w-auto" value={period} onChange={(e) => setPeriod(parseInt(e.target.value))}>
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>
          {isAdmin && (
            <button onClick={handleGenerate} disabled={generating} className="btn-primary gap-2">
              <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Generating...' : 'Generate'}
            </button>
          )}
        </div>
      </div>

      {/* Early warnings */}
      {warnings.length > 0 && (
        <div className="card p-4 border-l-4 border-l-red-500 dark:bg-gray-900">
          <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2 dark:text-red-400">
            <AlertTriangle size={16} /> Stockout Warnings ({warnings.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {warnings.slice(0, 6).map((w, i) => (
              <div key={i} className="p-3 bg-red-50 rounded-lg dark:bg-red-900/20">
                <p className="text-sm font-medium dark:text-gray-200">{w.item.name}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Stock: {w.current_stock}</span>
                  <span className="text-xs text-red-600 font-medium dark:text-red-400">~{w.days_until_stockout}d left</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecasts table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b dark:bg-gray-800/50 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Item</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Predicted</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Low</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">High</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">MAPE</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Target Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-4"><TableSkeleton rows={5} cols={6} /></td></tr>
              ) : forecasts.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState
                    icon="forecasts"
                    title="No forecasts yet"
                    description="Click Generate to create AI-powered stock predictions."
                    action={
                      isAdmin && (
                        <button onClick={handleGenerate} disabled={generating} className="btn-primary gap-2">
                          <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
                          {generating ? 'Generating...' : 'Generate'}
                        </button>
                      )
                    }
                  />
                </td></tr>
              ) : forecasts.map((f) => (
                <tr key={f.id} className="border-b hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium dark:text-gray-200">{f.inventory_item?.name || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium dark:text-gray-200">{f.predicted_quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{f.confidence_low}</td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{f.confidence_high}</td>
                  <td className="px-4 py-3 text-right">
                    {f.mape ? <span className={f.mape < 20 ? 'badge-success' : f.mape < 50 ? 'badge-warning' : 'badge-danger'}>{f.mape}%</span> : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{f.target_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
