import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Plus, Search, Edit2, Trash2, X, FolderOpen } from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';
import { EmptyState, EmptySearch } from '../components/EmptyState';

export default function CategoriesPage() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const isAdmin = hasRole('admin', 'manager');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data || res.data);
    } catch (err) { toast('Failed to load categories', 'error'); }
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const resetForm = () => { setForm({ name: '', description: '' }); setEditing(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form);
        toast('Category updated', 'success');
      } else {
        await api.post('/categories', form);
        toast('Category created', 'success');
      }
      resetForm();
      fetchCategories();
    } catch (err) { toast(err.response?.data?.message || 'Error', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (cat) => {
    const ok = await confirm({ title: 'Delete Category', message: `Delete "${cat.name}"?`, confirmText: 'Delete', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/categories/${cat.id}`);
      toast('Category deleted', 'success');
      fetchCategories();
    } catch (err) { toast(err.response?.data?.message || 'Error', 'error'); }
  };

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-gray-100"><FolderOpen size={24} /> Categories</h1>
          <p className="text-gray-500 text-sm dark:text-gray-400">{categories.length} categories total</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2"><Plus size={16} /> Add Category</button>
        )}
      </div>

      <div className="card p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4"><TableSkeleton rows={5} cols={isAdmin ? 4 : 3} /></div>
        ) : filtered.length === 0 ? (
          search ? <EmptySearch searchTerm={search} onClear={() => setSearch('')} /> : (
            <EmptyState icon="categories" title="No categories yet" description="Organize your inventory with categories."
              action={isAdmin && <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2"><Plus size={16} /> Add Category</button>}
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b dark:bg-gray-800/50 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell dark:text-gray-400">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Items</th>
                  {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => (
                  <tr key={cat.id} className="border-b hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium dark:text-gray-200">{cat.name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell dark:text-gray-400">{cat.description || '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{cat.items_count || 0}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setForm({ name: cat.name, description: cat.description || '' }); setEditing(cat); setShowForm(true); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(cat)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 ml-1"><Trash2 size={14} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-gray-100">{editing ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
