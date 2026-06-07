import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Edit2, Trash2, X, Truck, Star, Mail, Phone, MapPin } from 'lucide-react';

export default function SuppliersPage() {
  const { hasRole } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', contact_person: '', email: '', phone: '', address: '', performance_score: '',
  });

  const isAdmin = hasRole('admin', 'manager');

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, search });
      const res = await api.get(`/suppliers?${params}`);
      setSuppliers(res.data.data);
      setMeta({ current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchSuppliers(); }, [page, search]);

  const resetForm = () => {
    setForm({ name: '', contact_person: '', email: '', phone: '', address: '', performance_score: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (!data.performance_score) delete data.performance_score;
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, data);
      } else {
        await api.post('/suppliers', data);
      }
      resetForm();
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving supplier');
    }
  };

  const handleDelete = async (sup) => {
    if (!confirm(`Delete "${sup.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${sup.id}`);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting supplier');
    }
  };

  const startEdit = (sup) => {
    setForm({
      name: sup.name,
      contact_person: sup.contact_person || '',
      email: sup.email || '',
      phone: sup.phone || '',
      address: sup.address || '',
      performance_score: sup.performance_score || '',
    });
    setEditing(sup);
    setShowForm(true);
  };

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  const renderStars = (score) => {
    if (!score) return <span className="text-gray-400 text-xs">No rating</span>;
    const stars = Math.round(score);
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={12} className={i <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
        ))}
        <span className="text-xs text-gray-500 ml-1">{score}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck size={24} /> Suppliers
          </h1>
          <p className="text-gray-500 text-sm">{meta.total || 0} suppliers total</p>
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
            placeholder="Search by name, email, or contact person..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Rating</th>
                {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="border-b">
                  <td colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-gray-400">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-gray-400">
                    {search ? 'No suppliers found' : 'No suppliers yet. Add one to get started.'}
                  </td>
                </tr>
              ) : filtered.map((sup) => (
                <tr key={sup.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 font-semibold text-xs">
                        {sup.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{sup.name}</p>
                        {sup.address && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} /> {sup.address.slice(0, 40)}{sup.address.length > 40 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{sup.contact_person || '-'}</td>
                  <td className="px-4 py-3">
                    {sup.email ? (
                      <a href={`mailto:${sup.email}`} className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <Mail size={12} /> {sup.email}
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {sup.phone ? (
                      <span className="flex items-center gap-1 text-gray-600">
                        <Phone size={12} /> {sup.phone}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">{renderStars(sup.performance_score)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => startEdit(sup)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(sup)} className="p-1.5 rounded hover:bg-red-50 text-red-500 ml-1" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">Page {meta.current_page} of {meta.last_page}</p>
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
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="label">Company Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. PT Teknologi Maju"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Contact Person *</label>
                  <input
                    className="input"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    required
                    placeholder="e.g. Budi Santoso"
                  />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    placeholder="e.g. 021-5550001"
                  />
                </div>
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="e.g. budi@supplier.co.id"
                />
              </div>
              <div>
                <label className="label">Address *</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                  placeholder="Full address..."
                />
              </div>
              <div>
                <label className="label">Performance Score (0-5)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.performance_score}
                  onChange={(e) => setForm({ ...form, performance_score: e.target.value })}
                  placeholder="e.g. 4.5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
