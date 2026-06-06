import { useState, useEffect } from 'react';
import api, { downloadFile } from '../services/api';
import { TrendingUp, TrendingDown, Package, AlertTriangle, ClipboardCheck, BarChart3, Boxes, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur-md border border-gray-100 shadow-xl rounded-xl px-4 py-3">
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-bold" style={{ color: p.color }}>{p.name}: {p.value.toLocaleString()}</p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white/90 backdrop-blur-md border border-gray-100 shadow-xl rounded-xl px-4 py-3">
      <p className="text-sm font-bold">{d.name}</p>
      <p className="text-xs text-gray-500">{d.value} items ({d.payload?.percent ? (d.payload.percent * 100).toFixed(0) : 0}%)</p>
    </div>
  );
}

function PieLabel({ name, percent }) {
  return percent > 0.05 ? (
    <text fill="#374151" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, c, w] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/charts'),
          api.get('/forecasts/early-warnings'),
        ]);
        setStats(s.data);
        setCharts(c.data);
        setWarnings(w.data.warnings || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-gray-100 border-t-primary-600" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Boxes size={16} className="text-primary-600" />
        </div>
      </div>
    </div>
  );

  const totalCategories = charts?.categories?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Warehouse monitoring overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-200">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Live
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Units" value={stats?.total_units || 0} trend={stats?.total_units > 0 ? `${totalCategories} categories` : null} color="indigo" />
        <StatCard icon={AlertTriangle} label="Stockout Items" value={stats?.stockout_items || 0} trend={stats?.stockout_items > 0 ? 'Needs attention' : 'All good'} color={stats?.stockout_items > 0 ? 'red' : 'green'} />
        <StatCard icon={ClipboardCheck} label="Pending Approvals" value={stats?.pending_approvals || 0} trend={stats?.pending_approvals > 0 ? 'Awaiting review' : 'None pending'} color={stats?.pending_approvals > 0 ? 'yellow' : 'green'} />
        <StatCard icon={BarChart3} label="Early Warnings" value={warnings.length} trend={warnings.length > 0 ? 'Stock alerts' : 'No warnings'} color={warnings.length > 0 ? 'purple' : 'green'} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Category Distribution</h3>
          <p className="text-xs text-gray-400 mb-4">Items grouped by category</p>
          {charts?.categories?.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={260}>
                <PieChart>
                  <Pie data={charts.categories.map(d => ({ ...d, percent: d.count / charts.categories.reduce((s, c) => s + c.count, 0) }))} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} strokeWidth={0} label={PieLabel}>
                    {charts.categories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {charts.categories.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-gray-600 truncate flex-1">{c.name}</span>
                    <span className="font-semibold text-gray-800">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-gray-400 text-center py-12">No data</p>}
        </div>

        {/* 30-day trends */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">30-Day Stock Trends</h3>
          <p className="text-xs text-gray-400 mb-4">Daily stock in / out movements</p>
          {charts?.trends?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={charts.trends}>
                <defs>
                  <linearGradient id="inGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => v?.slice(5) || ''} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="in" stroke="#10b981" strokeWidth={2.5} fill="url(#inGradient)" name="In" dot={false} activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="out" stroke="#ef4444" strokeWidth={2.5} fill="url(#outGradient)" name="Out" dot={false} activeDot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-12">No data</p>}
        </div>
      </div>

      {/* Top moving items */}
      {charts?.top_moving_items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Top Moving Items</h3>
          <p className="text-xs text-gray-400 mb-4">Highest stock-out quantities in the last 30 days</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.top_moving_items} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="total_out" fill="url(#barGradient)" name="Out Qty" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Early warnings */}
      {warnings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow border-l-4 border-l-red-400">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-700">Early Stockout Warnings</h3>
              <p className="text-xs text-gray-400">Items predicted to run out within 7 days</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {warnings.slice(0, 6).map((w, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 bg-red-50/70 rounded-xl border border-red-100/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{w.item.name}</p>
                  <p className="text-xs text-gray-400">SKU: {w.item.sku}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold text-red-600">{w.current_stock}</p>
                  <p className="text-[11px] text-gray-400">~{w.days_until_stockout}d left</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, color }) {
  const colors = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'text-indigo-600' },
    red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-600' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'text-yellow-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'text-purple-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600', icon: 'text-green-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-600' },
  };
  const c = colors[color] || colors.indigo;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{value.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {trend && <p className="text-[11px] font-medium text-gray-400">{trend}</p>}
        </div>
        <div className={`p-3 rounded-xl ${c.bg}`}>
          <Icon size={20} className={c.icon} />
        </div>
      </div>
    </div>
  );
}
