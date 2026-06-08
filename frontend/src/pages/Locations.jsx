import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Plus, Search, Edit2, Trash2, X, MapPin, Warehouse } from 'lucide-react';
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
  const [form, setForm] = useState({ zone: '', rack: '', bin: '', capacity: 100 });
  const [saving, setSaving] = useState(false);

  const isAdmin = hasRole('admin', 'manager');

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/locations');
      setLocations(res.data.data || res.data);
    } catch (err) {
      toast('Failed to load locations', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { fetchLocations(); }, []);

  const resetForm = () => {
    setForm({ zone: '', rack: '', bin: '', capacity: 100 });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/locations/${editing.id}`, form);
        toast('Location updated successfully', 'success');
      } else {
        await api.post('/locations', form);
        toast('Location created successfully', 'success');
      }
      resetForm();
      fetchLocations();
    } catch (err) {
      toast(err.response?.data?.message || 'Error saving location', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (loc) => {
    const result = await confirm({
      title: 'Delete Location',
      message: `Are you sure you want to delete location ${loc.zone}-${loc.rack}:${loc.bin}?`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!result) return;
    try {
      await api.delete(`/locations/${loc.id}`);
      toast('Location deleted successfully', 'success');
      fetchLocations();
    } catch (err) {
      toast(err.response?.data?.message || 'Error deleting location', 'error');
    }
  };

  const startEdit = (loc) => {
    setForm({ zone: loc.zone, rack: loc.rack, bin: loc.bin, capacity: loc.capacity });
    setEditing(loc);
    setShowForm(true);
  };

  const filtered = locations.filter((l) =>
    `${l.zone}-${l.rack}:${l.bin}`.toLowerCase().includes(search.toLowerCase())
  );

  const zones = [...new Set(filtered.map((l) => l.zone))].sort();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse size={24} /> Locations
          </h1>
          <p className="text-gray-500 text-sm">{locations.length} locations across {zones.length} zones</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2">
            <Plus size={16} /> Add Location
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by zone, rack, or bin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={isAdmin ? 6 : 5} />
          </div>
        ) : filtered.length === 0 ? (
          search ? (
            <EmptySearch searchTerm={search} onClear={() => setSearch('')} />
          ) : (
            <EmptyState
              icon="locations"
              title="No locations yet"
              description="Create your first warehouse location to start tracking inventory."
              action={
                isAdmin && (
                  <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2">
                    <Plus size={16} /> Add Location
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Zone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rack</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Bin</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Capacity</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Stock</th>
                  {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((loc) => (
                  <tr key={loc.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                        {loc.zone}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{loc.rack}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <MapPin size={12} className="text-gray-400" />
                        {loc.bin}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">{loc.capacity}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        (loc.current_stock || 0) >= loc.capacity
                          ? 'bg-red-50 text-red-700'
                          : (loc.current_stock || 0) >= loc.capacity * 0.8
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {loc.current_stock || 0}/{loc.capacity}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => startEdit(loc)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(loc)} className="p-1.5 rounded hover:bg-red-50 text-red-500 ml-1" title="Delete">
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
              <h2 className="text-lg font-semibold">{editing ? 'Edit Location' : 'Add Location'}</h2>
              <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Zone *</label>
                  <input className="input" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} required placeholder="A" maxLength={255} />
                </div>
                <div>
                  <label className="label">Rack *</label>
                  <input className="input" value={form.rack} onChange={(e) => setForm({ ...form, rack: e.target.value })} required placeholder="01" maxLength={255} />
                </div>
                <div>
                  <label className="label">Bin *</label>
                  <input className="input" value={form.bin} onChange={(e) => setForm({ ...form, bin: e.target.value })} required placeholder="A1" maxLength={255} />
                </div>
              </div>
              <div>
                <label className="label">Capacity</label>
                <input className="input" type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} />
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
