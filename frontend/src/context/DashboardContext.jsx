import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const DashboardContext = createContext(null);

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
      console.error('Failed to load dashboard widgets:', err);
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
