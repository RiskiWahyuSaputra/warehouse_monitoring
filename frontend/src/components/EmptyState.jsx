import { Inbox, Search, FolderOpen, MapPin, Truck, FileText, ClipboardCheck, Bell, Users, Package, ArrowRightLeft, TrendingUp } from 'lucide-react';

const iconMap = {
  default: Inbox,
  search: Search,
  categories: FolderOpen,
  locations: MapPin,
  suppliers: Truck,
  audit: FileText,
  approvals: ClipboardCheck,
  notifications: Bell,
  users: Users,
  inventory: Package,
  movements: ArrowRightLeft,
  forecasts: TrendingUp,
};

export function EmptyState({
  icon = 'default',
  title = 'No data',
  description = 'There are no items to display.',
  action,
}) {
  const Icon = iconMap[icon] || Inbox;

  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-gray-300" />
      </div>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function EmptySearch({ searchTerm, onClear }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
        <Search size={28} className="text-gray-300" />
      </div>
      <h3 className="text-sm font-medium text-gray-500">No results found</h3>
      <p className="text-xs text-gray-400 mt-1">
        No items match "<span className="font-medium text-gray-500">{searchTerm}</span>"
      </p>
      {onClear && (
        <button onClick={onClear} className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium">
          Clear search
        </button>
      )}
    </div>
  );
}
