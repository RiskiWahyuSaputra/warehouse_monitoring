import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useGlobalSearch } from '../context/GlobalSearchContext';
import { Plus, Search, Edit2, Trash2, X, Truck, Star, Mail, Phone, MapPin } from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';
import { EmptyState, EmptySearch } from '../components/EmptyState';

export default function SuppliersPage() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { query: globalQuery, activeFilters } = useGlobalSearch();
  const [suppliers, setSuppliers] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '', performance_score: '' });
  const [saving, setSaving] = useState(false);

  const isAdmin = hasRole('admin', 'manager');

  // Sync global search
  useEffect(() => {
    if (globalQuery !== search) setSearch(globalQuery);
  }, [globalQuery]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, search });
      if (activeFilters.dateFrom) params.set('date_from', activeFilters.dateFrom);
      if (activeFilters.dateTo) params.set('date_to', activeFilters.dateTo);
      const res = await api.get(`/suppliers?${params}`);
      setSuppliers(res.data.data);
      setMeta({ current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total });
    } catch (err) {
      toast('Failed to load suppliers', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { fetchSuppliers(); }, [page, search, activeFilters]);

  const resetForm = () => {
    setForm({ name: '', contact_person: '', email: '', phone: '', address: '', performance_score: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.performance_score) delete data.performance_score;
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, data);
        toast('Supplier updated successfully', 'success');
      } else {
        await api.post('/suppliers', data);
        toast('Supplier created successfully', 'success');
      }
      resetForm();
      fetchSuppliers();
    } catch (err) {
      toast(err.response?.data?.message || 'Error saving supplier', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (sup) => {
    const result = await confirm({
      title: 'Delete Supplier',
      message: `Are you sure you want to delete "${sup.name}"?`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!result) return;
    try {
      await api.delete(`/suppliers/${sup.id}`);
      toast('Supplier deleted successfully', 'success');
      fetchSuppliers();
    } catch (err) {
      toast(err.response?.data?.message || 'Error deleting supplier', 'error');
    }
  };

  const startEdit = (sup) => {
    setForm({ name: sup.name, contact_person: sup.contact_person || '', email: sup.email || '', phone: sup.phone || '', address: sup.address || '', performance_score: sup.performance_score || '' });
    setEditing(sup);
    setShowForm(true);
  };

  const renderStars = (score) => {
    if (!score) return <span className="text-gray-400 text-xs dark:text-gray-500">No rating</span>;
    const stars = Math.round(score);
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={12} className={i <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'} />
        ))}
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{score}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-gray-100">
            <Truck size={24} /> Suppliers
          </h1>
          <p className="text-gray-500 text-sm dark:text-gray-400">{meta.total || 0} suppliers total</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2">
            <Plus size={16} /> Add Supplier
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, email, or contact..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={isAdmin ? 6 : 5} />
          </div>
        ) : suppliers.length === 0 ? (
          search ? (
            <EmptySearch searchTerm={search} onClear={() => { setSearch(''); setPage(1); }} />
          ) : (
            <EmptyState
              icon="suppliers"
              title="No suppliers yet"
              description="Add your first supplier to start tracking procurement."
              action={
                isAdmin && (
                  <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2">
                    <Plus size={16} /> Add Supplier
                  </button>
                )
              }
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b dark:bg-gray-800/50 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Supplier</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell dark:text-gray-400">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell dark:text-gray-400">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell dark:text-gray-400">Phone</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Rating</th>
                  {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((sup) => (
                  <tr key={sup.id} className="border-b hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 font-semibold text-xs dark:bg-purple-900/30 dark:text-purple-400">
                          {sup.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium dark:text-gray-200">{sup.name}</p>
                          {sup.address && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 dark:text-gray-500">
                              <MapPin size={10} /> {sup.address.slice(0, 30)}{sup.address.length > 30 ? '...' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell dark:text-gray-400">{sup.contact_person || '-'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {sup.email ? (
                        <a href={`mailto:${sup.email}`} className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs dark:text-blue-400 dark:hover:text-blue-300">
                          <Mail size={12} /> {sup.email}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {sup.phone ? (
                        <span className="flex items-center gap-1 text-gray-600 text-xs dark:text-gray-400">
                          <Phone size={12} /> {sup.phone}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">{renderStars(sup.performance_score)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => startEdit(sup)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(sup)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 ml-1" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Page {meta.current_page} of {meta.last_page}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary btn-sm">Prev</button>
              <button onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page >= meta.last_page} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-gray-100">{editing ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="label">Company Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. PT Teknologi Maju" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Contact Person *</label>
                  <input className="input" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} required placeholder="e.g. Budi Santoso" />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="e.g. 021-5550001" />
                </div>
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="e.g. budi@supplier.co.id" />
              </div>
              <div>
                <label className="label">Address *</label>
                <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required placeholder="Full address..." />
              </div>
              <div>
                <label className="label">Performance Score (0-5)</label>
                <input className="input" type="number" min="0" max="5" step="0.1" value={form.performance_score} onChange={(e) => setForm({ ...form, performance_score: e.target.value })} placeholder="e.g. 4.5" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary" disabled={saving}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
