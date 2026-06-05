import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, ArrowRightLeft, X, Plus } from 'lucide-react';

export default function MovementsPage() {
  const { hasRole } = useAuth();
  const [movements, setMovements] = useState([]);
  const [meta, setMeta] = useState({});
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showBatch, setShowBatch] = useState(false);

  const [form, setForm] = useState({ inventory_item_id: '', location_id: '', type: 'in', quantity: 1, remarks: '', supplier_id: '' });
  const [transferForm, setTransferForm] = useState({ inventory_item_id: '', from_location_id: '', to_location_id: '', quantity: 1, remarks: '' });
  const [batchForm, setBatchForm] = useState({ movements: [{ inventory_item_id: '', location_id: '', type: 'in', quantity: 1 }] });

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory/movements?page=${page}`);
      setMovements(res.data.data);
      setMeta({ current_page: res.data.current_page, last_page: res.data.last_page });
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchMovements(); }, [page]);
  useEffect(() => {
    Promise.all([api.get('/inventory-items?per_page=100'), api.get('/locations')]).then(([i, l]) => {
      setItems(i.data.data || i.data);
      setLocations(l.data.data || l.data);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/movements', form);
      setForm({ inventory_item_id: '', location_id: '', type: 'in', quantity: 1, remarks: '', supplier_id: '' });
      setShowForm(false);
      fetchMovements();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/transfer', transferForm);
      setTransferForm({ inventory_item_id: '', from_location_id: '', to_location_id: '', quantity: 1, remarks: '' });
      setShowTransfer(false);
      fetchMovements();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleBatch = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        movements: batchForm.movements.map((m) => ({
          inventory_item_id: parseInt(m.inventory_item_id),
          location_id: parseInt(m.location_id),
          type: m.type,
          quantity: parseInt(m.quantity),
        })),
      };
      await api.post('/inventory/batch-movements', payload);
      setBatchForm({ movements: [{ inventory_item_id: '', location_id: '', type: 'in', quantity: 1 }] });
      setShowBatch(false);
      fetchMovements();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const addBatchRow = () => {
    setBatchForm((f) => ({ movements: [...f.movements, { inventory_item_id: '', location_id: '', type: 'in', quantity: 1 }] }));
  };

  const isAdmin = hasRole('admin', 'manager');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Stock Movements</h1>
          <p className="text-gray-500">{meta.total || 0} records</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowForm(true)} className="btn-primary gap-2"><Plus size={16} /> Record Movement</button>
          <button onClick={() => setShowTransfer(true)} className="btn-secondary gap-2"><ArrowRightLeft size={16} /> Transfer</button>
          <button onClick={() => setShowBatch(true)} className="btn-secondary gap-2"><RefreshCw size={16} /> Batch</button>
        </div>
      </div>

      {/* Movements table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No movements recorded</td></tr>
              ) : movements.map((m) => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.item?.name || '-'}</td>
                  <td className="px-4 py-3">
                    {m.type === 'in' && <span className="badge-success flex items-center gap-1 w-fit"><ArrowDownCircle size={12} /> In</span>}
                    {m.type === 'out' && <span className="badge-danger flex items-center gap-1 w-fit"><ArrowUpCircle size={12} /> Out</span>}
                    {m.type === 'adjustment' && <span className="badge-warning flex items-center gap-1 w-fit"><RefreshCw size={12} /> Adj</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{m.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">{m.location ? `${m.location.zone}-${m.location.rack}` : '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{m.user?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      {/* Single movement modal */}
      {showForm && (
        <Modal title="Record Movement" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Item *</label>
                <select className="input" value={form.inventory_item_id} onChange={(e) => setForm({ ...form, inventory_item_id: e.target.value })} required>
                  <option value="">Select item...</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Location *</label>
                <select className="input" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} required>
                  <option value="">Select location...</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.zone}-{l.rack}-{l.bin}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Type *</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="in">Stock In</option>
                  <option value="out">Stock Out</option>
                  {isAdmin && <option value="adjustment">Adjustment</option>}
                </select>
              </div>
              <div>
                <label className="label">Quantity *</label>
                <input className="input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} required />
              </div>
              <div className="col-span-2">
                <label className="label">Remarks</label>
                <input className="input" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Record</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transfer modal */}
      {showTransfer && (
        <Modal title="Transfer Stock" onClose={() => setShowTransfer(false)}>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="label">Item *</label>
              <select className="input" value={transferForm.inventory_item_id} onChange={(e) => setTransferForm({ ...transferForm, inventory_item_id: e.target.value })} required>
                <option value="">Select...</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">From *</label>
                <select className="input" value={transferForm.from_location_id} onChange={(e) => setTransferForm({ ...transferForm, from_location_id: e.target.value })} required>
                  <option value="">Select...</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.zone}-{l.rack}-{l.bin}</option>)}
                </select>
              </div>
              <div>
                <label className="label">To *</label>
                <select className="input" value={transferForm.to_location_id} onChange={(e) => setTransferForm({ ...transferForm, to_location_id: e.target.value })} required>
                  <option value="">Select...</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.zone}-{l.rack}-{l.bin}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Quantity *</label>
              <input className="input" type="number" min="1" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: parseInt(e.target.value) || 1 })} required />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowTransfer(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Transfer</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Batch modal */}
      {showBatch && (
        <Modal title="Batch Movements" onClose={() => setShowBatch(false)}>
          <form onSubmit={handleBatch} className="space-y-4">
            {batchForm.movements.map((m, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg">
                <select className="input" value={m.inventory_item_id} onChange={(e) => { const ms = [...batchForm.movements]; ms[idx].inventory_item_id = e.target.value; setBatchForm({ movements: ms }); }} required>
                  <option value="">Item...</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <select className="input" value={m.location_id} onChange={(e) => { const ms = [...batchForm.movements]; ms[idx].location_id = e.target.value; setBatchForm({ movements: ms }); }} required>
                  <option value="">Location...</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.zone}-{l.rack}</option>)}
                </select>
                <select className="input" value={m.type} onChange={(e) => { const ms = [...batchForm.movements]; ms[idx].type = e.target.value; setBatchForm({ movements: ms }); }}>
                  <option value="in">In</option>
                  <option value="out">Out</option>
                  {isAdmin && <option value="adjustment">Adj</option>}
                </select>
                <input className="input" type="number" min="1" value={m.quantity} onChange={(e) => { const ms = [...batchForm.movements]; ms[idx].quantity = parseInt(e.target.value) || 1; setBatchForm({ movements: ms }); }} required />
              </div>
            ))}
            <button type="button" onClick={addBatchRow} className="btn-secondary btn-sm gap-1"><Plus size={14} /> Add Row</button>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowBatch(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Process Batch</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
