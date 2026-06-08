import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Plus, Search, Edit2, Trash2, X, FolderOpen, Tag } from 'lucide-react';
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
  const [form, setForm] = useState({ name: '', description: '', parent_id: '' });
  const [saving, setSaving] = useState(false);

  const isAdmin = hasRole('admin', 'manager');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      toast('Failed to load categories', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', parent_id: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form);
        toast('Category updated successfully', 'success');
      } else {
        await api.post('/categories', form);
        toast('Category created successfully', 'success');
      }
      resetForm();
      fetchCategories();
    } catch (err) {
      toast(err.response?.data?.message || 'Error saving category', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (cat) => {
    const result = await confirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete "${cat.name}"? This may affect items in this category.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!result) return;
    try {
      await api.delete(`/categories/${cat.id}`);
      toast('Category deleted successfully', 'success');
      fetchCategories();
    } catch (err) {
      toast(err.response?.data?.message || 'Error deleting category', 'error');
    }
  };

  const startEdit = (cat) => {
    setForm({ name: cat.name, description: cat.description || '', parent_id: cat.parent_id || '' });
    setEditing(cat);
    setShowForm(true);
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen size={24} /> Categories
          </h1>
          <p className="text-gray-500 text-sm">{categories.length} categories total</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2">
            <Plus size={16} /> Add Category
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={isAdmin ? 5 : 4} />
          </div>
        ) : filtered.length === 0 ? (
          search ? (
            <EmptySearch searchTerm={search} onClear={() => setSearch('')} />
          ) : (
            <EmptyState
              icon="categories"
              title="No categories yet"
              description="Create your first category to organize your inventory items."
              action={
                isAdmin && (
                  <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2">
                    <Plus size={16} /> Add Category
                  </button>
                )
              }
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Parent</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Items</th>
                  {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => (
                  <tr key={cat.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-indigo-500 flex-shrink-0" />
                        <span className="font-medium">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate hidden sm:table-cell">{cat.description || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{cat.parent?.name || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {cat.items_count || 0}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => startEdit(cat)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(cat)} className="p-1.5 rounded hover:bg-red-50 text-red-500 ml-1" title="Delete">
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
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Elektronik"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description..."
                />
              </div>
              <div>
                <label className="label">Parent Category</label>
                <select
                  className="input"
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                >
                  <option value="">None (Top Level)</option>
                  {categories
                    .filter((c) => !editing || c.id !== editing.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
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
