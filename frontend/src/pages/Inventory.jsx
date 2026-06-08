import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Plus, Search, Edit2, Trash2, X, Package, Tag } from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';
import { EmptyState, EmptySearch } from '../components/EmptyState';

export default function InventoryPage() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', description: '', category_id: '', barcode: '', min_stock: 0, price: 0 });
  const [saving, setSaving] = useState(false);

  const isAdmin = hasRole('admin', 'manager');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: 10, search });
      const res = await api.get(`/inventory-items?${params}`);
      setItems(res.data.data);
      setMeta({ current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total });
    } catch (err) {
      toast('Failed to load inventory', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    api.get('/categories').then((r) => setCategories(r.data.data || r.data)).catch(() => {});
  }, [page, search]);

  const resetForm = () => {
    setForm({ name: '', sku: '', description: '', category_id: '', barcode: '', min_stock: 0, price: 0 });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, min_stock: Number(form.min_stock), price: Number(form.price) };
      if (editing) {
        await api.put(`/inventory-items/${editing.id}`, data);
        toast('Item updated', 'success');
      } else {
        await api.post('/inventory-items', data);
        toast('Item created', 'success');
      }
      resetForm();
      fetchItems();
    } catch (err) {
      toast(err.response?.data?.message || 'Error saving item', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (item) => {
    const ok = await confirm({ title: 'Delete Item', message: `Delete "${item.name}"?`, confirmText: 'Delete', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/inventory-items/${item.id}`);
      toast('Item deleted', 'success');
      fetchItems();
    } catch (err) {
      toast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const startEdit = (item) => {
    setForm({ name: item.name, sku: item.sku, description: item.description || '', category_id: item.category_id || '', barcode: item.barcode || '', min_stock: item.min_stock, price: item.price });
    setEditing(item);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-gray-100"><Package size={24} /> Inventory</h1>
          <p className="text-gray-500 text-sm dark:text-gray-400">{meta.total || 0} items total</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2"><Plus size={16} /> Add Item</button>
        )}
      </div>

      <div className="card p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name, SKU..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4"><TableSkeleton rows={5} cols={isAdmin ? 7 : 6} /></div>
        ) : items.length === 0 ? (
          search ? (
            <EmptySearch searchTerm={search} onClear={() => { setSearch(''); setPage(1); }} />
          ) : (
            <EmptyState icon="inventory" title="No items yet" description="Add your first inventory item to start tracking stock."
              action={isAdmin && <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2"><Plus size={16} /> Add Item</button>}
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b dark:bg-gray-800/50 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Item</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell dark:text-gray-400">SKU</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell dark:text-gray-400">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell dark:text-gray-400">Min</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell dark:text-gray-400">Price</th>
                  {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <p className="font-medium dark:text-gray-200">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{item.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell dark:text-gray-400 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {item.category ? <span className="badge badge-info">{item.category.name}</span> : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={item.current_stock <= item.min_stock ? 'text-red-600 font-semibold dark:text-red-400' : 'font-medium dark:text-gray-200'}>
                        {item.current_stock || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell dark:text-gray-400">{item.min_stock}</td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell dark:text-gray-400">{item.price ? `Rp ${Number(item.price).toLocaleString()}` : '-'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => startEdit(item)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="Edit"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 ml-1" title="Delete"><Trash2 size={14} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
              <h2 className="text-lg font-semibold dark:text-gray-100">{editing ? 'Edit Item' : 'Add Item'}</h2>
              <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">SKU *</label>
                  <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">Select...</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Barcode</label>
                  <input className="input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                </div>
                <div>
                  <label className="label">Min Stock</label>
                  <input className="input" type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Price</label>
                <input className="input" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary" disabled={saving}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
