import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const DashboardContext = createContext(null);

// Default widgets per role (fallback jika API gagal)
const DEFAULT_WIDGETS_BY_ROLE = {
  admin: [
    { id: 'd1', widget_key: 'stat_total_units', widget_type: 'stat', title: 'Total Units', position: 0, visible: true, meta: null },
    { id: 'd2', widget_key: 'stat_stockout', widget_type: 'stat', title: 'Stockout Items', position: 1, visible: true, meta: null },
    { id: 'd3', widget_key: 'stat_pending', widget_type: 'stat', title: 'Pending Approvals', position: 2, visible: true, meta: null },
    { id: 'd4', widget_key: 'stat_warnings', widget_type: 'stat', title: 'Early Warnings', position: 3, visible: true, meta: null },
    { id: 'd5', widget_key: 'chart_category', widget_type: 'chart', title: 'Category Distribution', position: 4, visible: true, meta: { chartType: 'pie', size: 'half' } },
    { id: 'd6', widget_key: 'chart_trends', widget_type: 'chart', title: '30-Day Stock Trends', position: 5, visible: true, meta: { chartType: 'area', size: 'half' } },
    { id: 'd7', widget_key: 'chart_top_moving', widget_type: 'chart', title: 'Top Moving Items', position: 6, visible: true, meta: { chartType: 'bar', size: 'full' } },
    { id: 'd8', widget_key: 'list_warnings', widget_type: 'warning', title: 'Early Stockout Warnings', position: 7, visible: true, meta: { maxItems: 6, size: 'full' } },
  ],
  manager: [
    { id: 'd1', widget_key: 'stat_total_units', widget_type: 'stat', title: 'Total Units', position: 0, visible: true, meta: null },
    { id: 'd2', widget_key: 'stat_stockout', widget_type: 'stat', title: 'Stockout Items', position: 1, visible: true, meta: null },
    { id: 'd3', widget_key: 'stat_pending', widget_type: 'stat', title: 'Pending Approvals', position: 2, visible: true, meta: null },
    { id: 'd4', widget_key: 'stat_warnings', widget_type: 'stat', title: 'Early Warnings', position: 3, visible: true, meta: null },
    { id: 'd5', widget_key: 'chart_category', widget_type: 'chart', title: 'Category Distribution', position: 4, visible: true, meta: { chartType: 'pie', size: 'half' } },
    { id: 'd6', widget_key: 'chart_trends', widget_type: 'chart', title: '30-Day Stock Trends', position: 5, visible: true, meta: { chartType: 'area', size: 'half' } },
    { id: 'd7', widget_key: 'chart_top_moving', widget_type: 'chart', title: 'Top Moving Items', position: 6, visible: true, meta: { chartType: 'bar', size: 'full' } },
    { id: 'd8', widget_key: 'list_warnings', widget_type: 'warning', title: 'Early Stockout Warnings', position: 7, visible: true, meta: { maxItems: 6, size: 'full' } },
  ],
  staff: [
    { id: 'd1', widget_key: 'stat_total_units', widget_type: 'stat', title: 'Total Units', position: 0, visible: true, meta: null },
    { id: 'd2', widget_key: 'stat_stockout', widget_type: 'stat', title: 'Stockout Items', position: 1, visible: true, meta: null },
    { id: 'd3', widget_key: 'stat_pending', widget_type: 'stat', title: 'Pending Approvals', position: 2, visible: true, meta: null },
    { id: 'd4', widget_key: 'chart_trends', widget_type: 'chart', title: '30-Day Stock Trends', position: 3, visible: true, meta: { chartType: 'area', size: 'full' } },
    { id: 'd5', widget_key: 'list_warnings', widget_type: 'warning', title: 'Early Stockout Warnings', position: 4, visible: true, meta: { maxItems: 3, size: 'full' } },
  ],
};

// All available widget definitions (static registry)
export const AVAILABLE_WIDGETS = [
  { key: 'stat_total_units', type: 'stat', title: 'Total Units', description: 'Total number of inventory items' },
  { key: 'stat_stockout', type: 'stat', title: 'Stockout Items', description: 'Items with zero stock' },
  { key: 'stat_pending', type: 'stat', title: 'Pending Approvals', description: 'Awaiting approval requests' },
  { key: 'stat_warnings', type: 'stat', title: 'Early Warnings', description: 'Stockout predictions' },
  { key: 'chart_category', type: 'chart', title: 'Category Distribution', description: 'Pie chart of items by category', meta: { chartType: 'pie', size: 'half' } },
  { key: 'chart_trends', type: 'chart', title: '30-Day Stock Trends', description: 'Area chart of daily movements', meta: { chartType: 'area', size: 'half' } },
  { key: 'chart_top_moving', type: 'chart', title: 'Top Moving Items', description: 'Bar chart of highest outflow', meta: { chartType: 'bar', size: 'full' } },
  { key: 'list_warnings', type: 'warning', title: 'Early Stockout Warnings', description: 'Items predicted to run out soon', meta: { maxItems: 6, size: 'full' } },
];

export function DashboardProvider({ children }) {
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchWidgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/widgets');
      setWidgets(res.data);
    } catch (err) {
      console.error('Failed to load dashboard widgets, using defaults:', err);
      // Fallback: use local defaults based on user role
      try {
        const userRes = await api.get('/me');
        const roleSlug = userRes.data.user?.role?.slug || 'staff';
        setWidgets(DEFAULT_WIDGETS_BY_ROLE[roleSlash] || DEFAULT_WIDGETS_BY_ROLE.staff);
      } catch {
        // If even /me fails, use all widgets as visible
        setWidgets(DEFAULT_WIDGETS_BY_ROLE.staff);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  const updateLayout = useCallback(async (updatedWidgets) => {
    setSaving(true);
    try {
      const payload = updatedWidgets.map((w, i) => ({
        id: w.id,
        position: i,
        visible: w.visible,
      }));
      const res = await api.put('/dashboard/widgets/layout', { widgets: payload });
      setWidgets(res.data);
      return true;
    } catch (err) {
      console.error('Failed to update layout:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleWidget = useCallback(async (widgetId) => {
    try {
      const res = await api.patch(`/dashboard/widgets/${widgetId}/toggle`);
      setWidgets(prev => prev.map(w => w.id === widgetId ? res.data : w));
      return true;
    } catch (err) {
      console.error('Failed to toggle widget:', err);
      return false;
    }
  }, []);

  const resetToDefaults = useCallback(async () => {
    setSaving(true);
    try {
      const res = await api.post('/dashboard/widgets/reset');
      setWidgets(res.data);
      return true;
    } catch (err) {
      console.error('Failed to reset widgets:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Get visible widgets sorted by position
  const visibleWidgets = widgets
    .filter(w => w.visible)
    .sort((a, b) => a.position - b.position);

  // Get widget definition by key
  const getWidgetDef = useCallback((key) => {
    return AVAILABLE_WIDGETS.find(w => w.key === key);
  }, []);

  return (
    <DashboardContext.Provider value={{
      widgets,
      visibleWidgets,
      loading,
      saving,
      updateLayout,
      toggleWidget,
      resetToDefaults,
      fetchWidgets,
      getWidgetDef,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export const useDashboard = () => useContext(DashboardContext);
