import { useState, useRef, useEffect } from 'react';
import { useGlobalSearch } from '../context/GlobalSearchContext';
import { Search, X, SlidersHorizontal, Calendar, Tag, ArrowRightLeft, ChevronDown, Bookmark, Trash2 } from 'lucide-react';

export default function GlobalSearchBar() {
  const {
    query, setQuery, isOpen, setIsOpen,
    activeFilters, setActiveFilters,
    presets, savePreset, loadPreset, deletePreset,
    clearFilters, activeFilterCount,
  } = useGlobalSearch();

  const [showFilters, setShowFilters] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(null); // 'from' | 'to'
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowFilters(false);
        setShowPresets(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setIsOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setShowFilters(false);
        setShowPresets(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setIsOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const handleSavePreset = () => {
    if (presetName.trim()) {
      savePreset(presetName.trim());
      setPresetName('');
      setShowPresets(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div ref={containerRef} className="fixed inset-x-0 top-0 z-[80] flex justify-center pt-20 px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setIsOpen(false); setShowFilters(false); setShowPresets(false); }} />

      <div className="relative w-full max-w-2xl">
        {/* Search input */}
        <div className="card shadow-2xl overflow-hidden dark:bg-gray-900">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <Search size={18} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-sm outline-none dark:text-gray-100 dark:placeholder-gray-500"
              placeholder="Search items, movements, suppliers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold bg-primary-600 text-white px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-colors ${showFilters ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-800'}`}
              title="Filters"
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              onClick={() => setShowPresets(!showPresets)}
              className={`p-1.5 rounded-lg transition-colors ${showPresets ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-800'}`}
              title="Saved presets"
            >
              <Bookmark size={16} />
            </button>
            {query || activeFilterCount > 0 ? (
              <button onClick={clearFilters} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-800" title="Clear all">
                <X size={16} />
              </button>
            ) : null}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-4">
              {/* Date range */}
              <div>
                <label className="label flex items-center gap-1.5"><Calendar size={12} /> Date Range</label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1 relative">
                    <input
                      type="date"
                      className="input text-xs py-1.5"
                      value={activeFilters.dateFrom}
                      onChange={(e) => setActiveFilters({ ...activeFilters, dateFrom: e.target.value })}
                    />
                    {activeFilters.dateFrom && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
                        {formatDate(activeFilters.dateFrom)}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 self-center text-xs">—</span>
                  <div className="flex-1">
                      <input
                        type="date"
                        className="input text-xs py-1.5"
                        value={activeFilters.dateTo}
                        onChange={(e) => setActiveFilters({ ...activeFilters, dateTo: e.target.value })}
                      />
                    </div>
                  <button
                    onClick={() => setActiveFilters({ ...activeFilters, dateFrom: '', dateTo: '' })}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-800"
                    title="Clear dates"
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* Quick date presets */}
                <div className="flex gap-1.5 mt-2">
                  {[
                    { label: 'Today', days: 0 },
                    { label: '7 Days', days: 7 },
                    { label: '30 Days', days: 30 },
                    { label: '90 Days', days: 90 },
                  ].map((p) => {
                    const to = new Date();
                    const from = new Date();
                    from.setDate(from.getDate() - p.days);
                    const fromStr = from.toISOString().slice(0, 10);
                    const toStr = to.toISOString().slice(0, 10);
                    const isActive = activeFilters.dateFrom === fromStr && activeFilters.dateTo === toStr;
                    return (
                      <button
                        key={p.label}
                        onClick={() => setActiveFilters({ ...activeFilters, dateFrom: fromStr, dateTo: toStr })}
                        className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${isActive ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Movement type */}
              <div>
                <label className="label flex items-center gap-1.5"><ArrowRightLeft size={12} /> Movement Type</label>
                <div className="flex gap-1.5 mt-1">
                  {[
                    { value: '', label: 'All' },
                    { value: 'in', label: 'Stock In' },
                    { value: 'out', label: 'Stock Out' },
                    { value: 'adjustment', label: 'Adjustment' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setActiveFilters({ ...activeFilters, type: t.value })}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${activeFilters.type === t.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save preset */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <input
                  className="input text-xs py-1.5 flex-1"
                  placeholder="Save current filters as preset..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                />
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  className="btn-primary btn-sm disabled:opacity-40"
                >
                  <Bookmark size={12} /> Save
                </button>
              </div>
            </div>
          )}

          {/* Presets dropdown */}
          {showPresets && (
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              {presets.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2 dark:text-gray-500">No saved presets yet</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {presets.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 group">
                      <button
                        onClick={() => loadPreset(p)}
                        className="flex-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300"
                      >
                        {p.name}
                        {p.query && <span className="text-gray-400 ml-1 dark:text-gray-500">"{p.query}"</span>}
                      </button>
                      <span className="text-[10px] text-gray-400 dark:text-gray-600">
                        {new Date(p.createdAt).toLocaleDateString('id-ID')}
                      </span>
                      <button
                        onClick={() => deletePreset(p.id)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search hint */}
          <div className="px-4 py-2 flex items-center justify-between">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Search across items, movements & suppliers • Use filters to narrow results
            </p>
            <kbd className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:text-gray-500">ESC</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
