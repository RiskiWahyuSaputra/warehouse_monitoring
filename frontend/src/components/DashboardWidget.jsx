import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, X } from 'lucide-react';

export function DraggableWidget({ widget, children, onToggle, onRemove, isCustomizing }) {
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
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'shadow-2xl scale-[1.02]' : ''} transition-shadow`}
    >
      {/* Customize overlay controls */}
      {isCustomizing && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 rounded-lg bg-white/90 dark:bg-gray-800/90 shadow-md border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 backdrop-blur-sm transition-colors"
            title="Drag to reorder"
          >
            <GripVertical size={14} />
          </button>
          {/* Toggle visibility */}
          <button
            onClick={() => onToggle(widget.id)}
            className={`p-1.5 rounded-lg shadow-md border backdrop-blur-sm transition-colors ${
              widget.visible
                ? 'bg-white/90 border-gray-200 text-green-600 hover:text-green-700 dark:bg-gray-800/90 dark:border-gray-700 dark:text-green-400'
                : 'bg-gray-100/90 border-gray-300 text-gray-400 hover:text-gray-500 dark:bg-gray-700/90 dark:border-gray-600 dark:text-gray-500'
            }`}
            title={widget.visible ? 'Hide widget' : 'Show widget'}
          >
            {widget.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>
      )}

      {/* Widget content */}
      <div className={`${!widget.visible && isCustomizing ? 'opacity-40' : ''} transition-opacity`}>
        {children}
      </div>
    </div>
  );
}

export function WidgetCard({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow dark:bg-gray-900 dark:border-gray-800 ${className}`}>
      {children}
    </div>
  );
}

export function WidgetHeader({ icon: Icon, title, subtitle, extra }) {
  return (
    <div className="p-5 pb-0">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Icon size={14} className="text-gray-500 dark:text-gray-400" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5 dark:text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {extra && <div>{extra}</div>}
      </div>
    </div>
  );
}
