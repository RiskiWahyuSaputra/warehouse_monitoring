import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const GlobalSearchContext = createContext(null);

const STORAGE_KEY = 'warehouse_search_presets';

export function GlobalSearchProvider({ children }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    dateFrom: '',
    dateTo: '',
    categoryId: '',
    type: '', // 'in', 'out', 'adjustment' for movements
    status: '', // for approvals
  });
  const [presets, setPresets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Save presets to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  const savePreset = useCallback((name) => {
    const preset = {
      id: Date.now().toString(),
      name,
      filters: { ...activeFilters },
      query,
      createdAt: new Date().toISOString(),
    };
    setPresets((prev) => [...prev, preset]);
  }, [activeFilters, query]);

  const loadPreset = useCallback((preset) => {
    setActiveFilters(preset.filters);
    setQuery(preset.query || '');
  }, []);

  const deletePreset = useCallback((id) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters({
      dateFrom: '',
      dateTo: '',
      categoryId: '',
      type: '',
      status: '',
    });
    setQuery('');
  }, []);

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length + (query ? 1 : 0);

  return (
    <GlobalSearchContext.Provider
      value={{
        query, setQuery,
        isOpen, setIsOpen,
        activeFilters, setActiveFilters,
        presets, savePreset, loadPreset, deletePreset,
        clearFilters,
        activeFilterCount,
      }}
    >
      {children}
    </GlobalSearchContext.Provider>
  );
}

export const useGlobalSearch = () => useContext(GlobalSearchContext);
