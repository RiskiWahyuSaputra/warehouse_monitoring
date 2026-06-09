import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDashboard, AVAILABLE_WIDGETS } from '../context/DashboardContext';
import { useToast } from '../context/ToastContext';
import { X, GripVertical, Eye, EyeOff, RotateCcw, Settings2, Check } from 'lucide-react';

export default function DashboardCustomizeModal({ open, onClose }) {
  const { widgets, updateLayout, toggleWidget, resetToDefaults, saving } = useDashboard();
  const toast = useToast();
  const [localWidgets, setLocalWidgets] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (open) {
      setLocalWidgets([...widgets].sort((a, b) => a.position - b.position));
      setHasChanges(false);
    }
  }, [open, widgets]);

  if (!open) return null;

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setLocalWidgets(prev => {
        const oldIndex = prev.findIndex(w => w.id === active.id);
        const newIndex = prev.findIndex(w => w.id === over.id);
        const updated = arrayMove(prev, oldIndex, newIndex).map((w, i) => ({ ...w, position: i }));
        return updated;
      });
      setHasChanges(true);
    }
  };

  const handleToggle = (widgetId) => {
    setLocalWidgets(prev => prev.map(w =>
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const success = await updateLayout(localWidgets);
    if (success) {
      toast('Dashboard layout saved', 'success');
      setHasChanges(false);
      onClose();
    } else {
      toast('Failed to save layout', 'error');
    }
  };

  const handleReset = async () => {
    const success = await resetToDefaults();
    if (success) {
      toast('Dashboard reset to defaults', 'success');
      setHasChanges(false);
      onClose();
    } else {
      toast('Failed to reset', 'error');
    }
  };

  // Group widgets by type for the UI
  const grouped = {
    stat: localWidgets.filter(w => w.widget_type === 'stat'),
    chart: localWidgets.filter(w => w.widget_type === 'chart'),
    warning: localWidgets.filter(w => w.widget_type === 'warning'),
    list: localWidgets.filter(w => w.widget_type === 'list'),
  };

  const typeLabels = {
    stat: 'Stat Cards',
    chart: 'Charts',
    warning: 'Warnings',
    list: 'Lists',
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-900/20">
              <Settings2 size={18} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Customize Dashboard</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Drag to reorder, toggle visibility</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localWidgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {localWidgets.map((widget) => {
                  const def = AVAILABLE_WIDGETS.find(d => d.key === widget.widget_key);
                  return (
                    <SortableWidgetItem
                      key={widget.id}
                      widget={widget}
                      def={def}
                      onToggle={handleToggle}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <RotateCcw size={13} />
            Reset to Defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableWidgetItem({ widget, def, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
        isDragging
          ? 'bg-primary-50 border-primary-200 shadow-lg dark:bg-primary-900/20 dark:border-primary-800'
          : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-750'
      } ${!widget.visible ? 'opacity-60' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex-shrink-0 p-0.5"
      >
        <GripVertical size={16} />
      </button>

      {/* Widget info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{widget.title}</p>
        {def?.description && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{def.description}</p>
        )}
      </div>

      {/* Type badge */}
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
        widget.widget_type === 'stat' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
        widget.widget_type === 'chart' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
        'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
      }`}>
        {widget.widget_type}
      </span>

      {/* Toggle */}
      <button
        onClick={() => onToggle(widget.id)}
        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
          widget.visible
            ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
            : 'text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-700'
        }`}
        title={widget.visible ? 'Hide' : 'Show'}
      >
        {widget.visible ? <Eye size={15} /> : <EyeOff size={15} />}
      </button>
    </div>
  );
}

// Need to import CSS from @dnd-kit/utilities
import { CSS } from '@dnd-kit/utilities';
