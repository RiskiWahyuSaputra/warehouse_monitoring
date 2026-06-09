import { useState, useEffect, useCallback } from 'react';
import api, { downloadFile } from '../services/api';
import { useDashboard } from '../context/DashboardContext';
import { Package, AlertTriangle, ClipboardCheck, BarChart3, FileSpreadsheet, FileText, RefreshCw, Settings2 } from 'lucide-react';
import { Skeleton, StatCardSkeleton, CardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import DashboardCustomizeModal from '../components/DashboardCustomize';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { DraggableWidget } from '../components/DashboardWidget';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur-md border border-gray-100 shadow-xl rounded-xl px-4 py-3 dark:bg-gray-800/90 dark:border-gray-700">
      <p className="text-xs font-semibold text-gray-500 mb-1 dark:text-gray-400">{label}</p>
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
    <div className="bg-white/90 backdrop-blur-md border border-gray-100 shadow-xl rounded-xl px-4 py-3 dark:bg-gray-800/90 dark:border-gray-700">
      <p className="text-sm font-bold">{d.name}</p>
      <p className="text-xs text-gray-500">{d.value} items ({d.payload?.percent ? (d.payload.percent * 100).toFixed(0) : 0}%)</p>
    </div>
  );
}

function PieLabel({ name, percent }) {
  return percent > 0.05 ? (
    <text
      fill="#374151"
      fontSize={11}
      fontWeight={600}
      style={{ fill: 'var(--pie-label-fill, #374151)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
}

export default function DashboardPage() {
  const { visibleWidgets, loading: widgetsLoading, updateLayout, toggleWidget } = useDashboard();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchData = useCallback(async () => {
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
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const ts = new Date().toISOString().slice(0, 10);
      if (type === 'stock-excel') {
        await downloadFile('/api/export/stock/excel', `stock_report_${ts}.csv`);
      } else if (type === 'stock-pdf') {
        await downloadFile('/api/export/stock/pdf', `stock_report_${ts}.html`);
      } else if (type === 'movement-excel') {
        await downloadFile('/api/export/movements/excel', `movement_report_${ts}.csv`);
      } else if (type === 'movement-pdf') {
        await downloadFile('/api/export/movements/pdf', `movement_report_${ts}.html`);
      } else if (type === 'forecast-excel') {
        await downloadFile('/api/export/forecasts/excel', `forecast_report_${ts}.csv`);
      } else if (type === 'forecast-pdf') {
        await downloadFile('/api/export/forecasts/pdf', `forecast_report_${ts}.html`);
      }
    } catch (err) {
      alert('Export failed: ' + (err.message || 'Unknown error'));
    }
    setExporting('');
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = visibleWidgets.findIndex(w => w.id === active.id);
      const newIndex = visibleWidgets.findIndex(w => w.id === over.id);
      const reordered = arrayMove(visibleWidgets, oldIndex, newIndex);
      await updateLayout(reordered);
    }
  };

  const loading = widgetsLoading || dataLoading;
  const totalCategories = charts?.categories?.length || 0;

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 mt-2" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1,2].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 dark:bg-gray-900 dark:border-gray-800"><CardSkeleton /></div>)}
      </div>
    </div>
  );

  // Render a widget by its key
  const renderWidget = (widget) => {
    switch (widget.widget_key) {
      case 'stat_total_units':
        return (
          <StatCard icon={Package} label="Total Units" value={stats?.total_units || 0} trend={stats?.total_units > 0 ? `${totalCategories} categories` : null} color="indigo" />
        );
      case 'stat_stockout':
        return (
          <StatCard icon={AlertTriangle} label="Stockout Items" value={stats?.stockout_items || 0} trend={stats?.stockout_items > 0 ? 'Needs attention' : 'All good'} color={stats?.stockout_items > 0 ? 'red' : 'green'} />
        );
      case 'stat_pending':
        return (
          <StatCard icon={ClipboardCheck} label="Pending Approvals" value={stats?.pending_approvals || 0} trend={stats?.pending_approvals > 0 ? 'Awaiting review' : 'None pending'} color={stats?.pending_approvals > 0 ? 'yellow' : 'green'} />
        );
      case 'stat_warnings':
        return (
          <StatCard icon={BarChart3} label="Early Warnings" value={warnings.length} trend={warnings.length > 0 ? 'Stock alerts' : 'No warnings'} color={warnings.length > 0 ? 'purple' : 'green'} />
        );
      case 'chart_category':
        return (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Category Distribution</h3>
            <p className="text-xs text-gray-400 mb-4 dark:text-gray-500">Items grouped by category</p>
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
                      <span className="text-gray-600 truncate flex-1 dark:text-gray-400">{c.name}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-gray-400 text-center py-12 dark:text-gray-500">No data</p>}
          </div>
        );
      case 'chart_trends':
        return (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">30-Day Stock Trends</h3>
            <p className="text-xs text-gray-400 mb-4 dark:text-gray-500">Daily stock in / out movements</p>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} className="dark:stroke-gray-800" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => v?.slice(5) || ''} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(107, 114, 128, 0.3)' }} />
                  <Area type="monotone" dataKey="in" stroke="#10b981" strokeWidth={2.5} fill="url(#inGradient)" name="In" dot={false} activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="out" stroke="#ef4444" strokeWidth={2.5} fill="url(#outGradient)" name="Out" dot={false} activeDot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-12 dark:text-gray-500">No data</p>}
          </div>
        );
      case 'chart_top_moving':
        return (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Top Moving Items</h3>
            <p className="text-xs text-gray-400 mb-4 dark:text-gray-500">Highest stock-out quantities in the last 30 days</p>
            {charts?.top_moving_items?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.top_moving_items} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} className="dark:stroke-gray-800" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.15)' }} />
                  <Bar dataKey="total_out" fill="url(#barGradient)" name="Out Qty" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-12 dark:text-gray-500">No data</p>}
          </div>
        );
      case 'list_warnings':
        return (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Early Stockout Warnings</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">Items predicted to run out within 7 days</p>
              </div>
            </div>
            {warnings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {warnings.slice(0, widget.meta?.maxItems || 6).map((w, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 bg-red-50/70 rounded-xl border border-red-100/50 dark:bg-red-900/20 dark:border-red-900/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate dark:text-gray-200">{w.item.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">SKU: {w.item.sku}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">{w.current_stock}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">~{w.days_until_stockout}d left</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-3 dark:bg-green-900/20">
                  <ClipboardCheck size={20} className="text-green-500 dark:text-green-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">No warnings</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">All stock levels are healthy</p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="p-5">
            <p className="text-gray-400 text-center py-8 dark:text-gray-500">Unknown widget: {widget.widget_key}</p>
          </div>
        );
    }
  };

  // Determine grid class based on widget size
  const getWidgetGridClass = (widget) => {
    const size = widget.meta?.size || (widget.widget_type === 'stat' ? 'quarter' : 'half');
    switch (size) {
      case 'full': return 'col-span-1 lg:col-span-2';
      case 'half': return 'col-span-1';
      case 'quarter':
      default: return 'col-span-1';
    }
  };

  // Separate stat widgets from others for the top row
  const statWidgets = visibleWidgets.filter(w => w.widget_type === 'stat');
  const otherWidgets = visibleWidgets.filter(w => w.widget_type !== 'stat');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-400">Warehouse monitoring overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Customize button */}
          <button
            onClick={() => setCustomizeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Customize dashboard widgets"
          >
            <Settings2 size={14} />
            Customize
          </button>

          <button onClick={() => { setDataLoading(true); fetchData(); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 dark:hover:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-300" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Auto-refresh 30s
          </div>
          <div className="h-6 w-px bg-gray-200 hidden sm:block dark:bg-gray-700" />
          <button onClick={() => handleExport('stock-excel')} disabled={!!exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Export Stock Report (CSV)">
            <FileSpreadsheet size={14} className="text-green-600" />
            Stock CSV
          </button>
          <button onClick={() => handleExport('stock-pdf')} disabled={!!exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Export Stock Report (PDF-HTML)">
            <FileText size={14} className="text-red-500" />
            Stock PDF
          </button>
          <button onClick={() => handleExport('movement-excel')} disabled={!!exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Export Movement Report (CSV)">
            <FileSpreadsheet size={14} className="text-green-600" />
            Move CSV
          </button>
          <button onClick={() => handleExport('forecast-excel')} disabled={!!exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Export Forecast Report (CSV)">
            <FileSpreadsheet size={14} className="text-green-600" />
            Forecast CSV
          </button>
        </div>
      </div>

      {/* Stats row - always in a 4-col grid */}
      {statWidgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statWidgets.map(widget => (
            <DraggableWidget
              key={widget.id}
              widget={widget}
              onToggle={toggleWidget}
              isCustomizing={isCustomizing}
            >
              {renderWidget(widget)}
            </DraggableWidget>
          ))}
        </div>
      )}

      {/* Charts & other widgets - drag and drop */}
      {otherWidgets.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={otherWidgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {otherWidgets.map(widget => (
                <DraggableWidget
                  key={widget.id}
                  widget={widget}
                  onToggle={toggleWidget}
                  isCustomizing={isCustomizing}
                >
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow dark:bg-gray-900 dark:border-gray-800">
                    {renderWidget(widget)}
                  </div>
                </DraggableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Empty state when all widgets are hidden */}
      {visibleWidgets.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 dark:bg-gray-900 dark:border-gray-800">
          <EmptyState
            icon="dashboard"
            title="No widgets visible"
            description="Click 'Customize' to add widgets to your dashboard."
            action={
              <button
                onClick={() => setCustomizeOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                <Settings2 size={16} />
                Customize Dashboard
              </button>
            }
          />
        </div>
      )}

      {/* Customize modal */}
      <DashboardCustomizeModal open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5 dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900 tracking-tight dark:text-gray-100">{value.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          {trend && <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{trend}</p>}
        </div>
        <div className={`p-3 rounded-xl ${c.bg}`}>
          <Icon size={20} className={c.icon} />
        </div>
      </div>
    </div>
  );
}
