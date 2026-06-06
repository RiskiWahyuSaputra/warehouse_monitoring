import { useState, useEffect } from 'react';
import api, { downloadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, AlertTriangle, RefreshCw, FileSpreadsheet, FileText } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Stock Forecasts</h1>
          <p className="text-gray-500">AI-powered stock requirement predictions</p>
        </div>
        <div className="flex gap-2 items-center">
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
        <div className="card p-4 border-l-4 border-l-red-500">
          <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} /> Stockout Warnings ({warnings.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {warnings.slice(0, 6).map((w, i) => (
              <div key={i} className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium">{w.item.name}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">Stock: {w.current_stock}</span>
                  <span className="text-xs text-red-600 font-medium">~{w.days_until_stockout}d left</span>
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
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Predicted</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Low</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">High</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">MAPE</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Target Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : forecasts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No forecasts yet. Click Generate to create predictions.</td></tr>
              ) : forecasts.map((f) => (
                <tr key={f.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{f.inventory_item?.name || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium">{f.predicted_quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{f.confidence_low}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{f.confidence_high}</td>
                  <td className="px-4 py-3 text-right">
                    {f.mape ? <span className={f.mape < 20 ? 'badge-success' : f.mape < 50 ? 'badge-warning' : 'badge-danger'}>{f.mape}%</span> : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{f.target_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
