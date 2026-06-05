import { useState, useEffect } from 'react';
import api from '../services/api';
import { TrendingUp, TrendingDown, Package, AlertTriangle, ClipboardCheck, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Warehouse monitoring overview</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Units" value={stats?.total_units || 0} color="blue" />
        <StatCard icon={AlertTriangle} label="Stockout Items" value={stats?.stockout_items || 0} color="red" />
        <StatCard icon={ClipboardCheck} label="Pending Approvals" value={stats?.pending_approvals || 0} color="yellow" />
        <StatCard icon={BarChart3} label="Early Warnings" value={warnings.length} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category distribution */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Category Distribution</h3>
          {charts?.categories?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={charts.categories} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {charts.categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-12">No data</p>}
        </div>

        {/* 30-day trends */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">30-Day Stock Trends</h3>
          {charts?.trends?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={charts.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="in" stroke="#10b981" name="In" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="out" stroke="#ef4444" name="Out" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-12">No data</p>}
        </div>
      </div>

      {/* Top moving items */}
      {charts?.top_moving_items?.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Moving Items (30 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.top_moving_items}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total_out" fill="#3b82f6" name="Out Qty" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Early warnings */}
      {warnings.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} /> Early Stockout Warnings (7 days)
          </h3>
          <div className="space-y-2">
            {warnings.slice(0, 5).map((w, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{w.item.name}</p>
                  <p className="text-xs text-gray-500">SKU: {w.item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-600">{w.current_stock} left</p>
                  <p className="text-xs text-gray-500">~{w.days_until_stockout} days</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colors[color]}`}><Icon size={20} /></div>
        <div>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
