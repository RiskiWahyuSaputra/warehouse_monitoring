import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Plus, Search, Edit2, Trash2, X, MapPin } from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';
import { EmptyState, EmptySearch } from '../components/EmptyState';

export default function LocationsPage() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ zone: '', rack: '', bin: '', description: '' });
  const [saving, setSaving] = useState(false);

  const isAdmin = hasRole('admin', 'manager');

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/locations');
      setLocations(res.data.data || res.data);
    } catch (err) { toast('Failed to load locations', 'error'); }
    setLoading(false);
  };

  useEffect(() => { fetchLocations(); }, []);

  const resetForm = () => { setForm({ zone: '', rack: '', bin: '', description: '' }); setEditing(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/locations/${editing.id}`, form);
        toast('Location updated', 'success');
      } else {
        await api.post('/locations', form);
        toast('Location created', 'success');
      }
      resetForm();
      fetchLocations();
    } catch (err) { toast(err.response?.data?.message || 'Error', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (loc) => {
    const ok = await confirm({ title: 'Delete Location', message: `Delete "${loc.zone}-${loc.rack}-${loc.bin}"?`, confirmText: 'Delete', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/locations/${loc.id}`);
      toast('Location deleted', 'success');
      fetchLocations();
    } catch (err) { toast(err.response?.data?.message || 'Error', 'error'); }
  };

  const filtered = locations.filter((l) =>
    `${l.zone}-${l.rack}-${l.bin}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-gray-100"><MapPin size={24} /> Locations</h1>
          <p className="text-gray-500 text-sm dark:text-gray-400">{locations.length} locations total</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2"><Plus size={16} /> Add Location</button>
        )}
      </div>

      <div className="card p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by zone, rack, bin..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4"><TableSkeleton rows={5} cols={isAdmin ? 5 : 4} /></div>
        ) : filtered.length === 0 ? (
          search ? <EmptySearch searchTerm={search} onClear={() => setSearch('')} /> : (
            <EmptyState icon="locations" title="No locations yet" description="Define warehouse locations to organize your inventory."
              action={isAdmin && <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2"><Plus size={16} /> Add Location</button>}
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b dark:bg-gray-800/50 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Zone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Rack</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Bin</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell dark:text-gray-400">Description</th>
                  {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((loc) => (
                  <tr key={loc.id} className="border-b hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium dark:text-gray-200">{loc.zone}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{loc.rack}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{loc.bin}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell dark:text-gray-400">{loc.description || '-'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setForm({ zone: loc.zone, rack: loc.rack, bin: loc.bin, description: loc.description || '' }); setEditing(loc); setShowForm(true); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(loc)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 ml-1"><Trash2 size={14} /></button>
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
              <h2 className="text-lg font-semibold dark:text-gray-100">{editing ? 'Edit Location' : 'Add Location'}</h2>
              <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Zone *</label><input className="input" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} required /></div>
                <div><label className="label">Rack *</label><input className="input" value={form.rack} onChange={(e) => setForm({ ...form, rack: e.target.value })} required /></div>
                <div><label className="label">Bin *</label><input className="input" value={form.bin} onChange={(e) => setForm({ ...form, bin: e.target.value })} required /></div>
              </div>
              <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
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
