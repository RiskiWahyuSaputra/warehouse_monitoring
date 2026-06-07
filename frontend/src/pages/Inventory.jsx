import { useState, useEffect } from 'react';
import api, { downloadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Edit2, Trash2, X, Filter, FileSpreadsheet, FileText, ScanBarcode, Printer, Eye, Download } from 'lucide-react';

export default function InventoryPage() {
  const { hasRole } = useAuth();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [barcodeItem, setBarcodeItem] = useState(null);

  const [locations, setLocations] = useState([]);

  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', description: '', category_id: '', min_stock: 0, unit: 'pcs', initial_stock: 0, location_id: '',
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, search, category_id: categoryFilter, stock_status: statusFilter });
      const res = await api.get(`/inventory-items?${params}`);
      setItems(res.data.data);
      setMeta({ current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try { const res = await api.get('/categories'); setCategories(res.data); } catch {}
  };

  useEffect(() => { fetchItems(); }, [page, search, categoryFilter, statusFilter]);
  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => {
    api.get('/locations').then((res) => setLocations(res.data.data || res.data)).catch(() => {});
  }, []);

  const resetForm = () => {
    setForm({ name: '', sku: '', barcode: '', description: '', category_id: '', min_stock: 0, unit: 'pcs', initial_stock: 0, location_id: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/inventory-items/${editing.id}`, form);
      } else {
        await api.post('/inventory-items', { ...form, location_id: form.location_id || undefined, initial_stock: form.initial_stock || undefined });
      }
      resetForm();
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving item');
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try { await api.delete(`/inventory-items/${item.id}`); fetchItems(); } catch {}
  };

  const startEdit = (item) => {
    const firstSl = item.stock_levels?.[0];
    setForm({
      name: item.name, sku: item.sku, barcode: item.barcode, description: item.description,
      category_id: item.category_id, min_stock: item.min_stock, unit: item.unit,
      initial_stock: firstSl?.quantity || 0, location_id: firstSl?.location_id || '',
    });
    setEditing(item);
    setShowForm(true);
  };

  const isAdmin = hasRole('admin', 'manager');

  const handleExport = async (format) => {
    try {
      const ts = new Date().toISOString().slice(0, 10);
      const params = {};
      if (categoryFilter) params.category_id = categoryFilter;
      if (statusFilter) params.stock_status = statusFilter;
      const queryString = new URLSearchParams(params).toString();

      if (format === 'excel') {
        await downloadFile('/api/export/stock/excel', `stock_report_${ts}.csv`, params);
      } else {
        await downloadFile('/api/export/stock/pdf', `stock_report_${ts}.html`, params);
      }
    } catch (err) {
      alert('Export failed: ' + (err.message || 'Unknown error'));
    }
  };

  const openPrintWindow = async (url) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(res.statusText);
      const html = await res.text();
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    } catch (err) {
      alert('Failed to load: ' + err.message);
    }
  };

  const downloadSvg = async (url, filename) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(res.statusText);
      const svg = await res.text();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert('Failed to download: ' + err.message);
    }
  };

  const openQrView = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/inventory/items/${id}/qr-code`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(res.statusText);
      const svg = await res.text();
      const win = window.open('', '_blank');
      if (win) { win.document.write(svg); win.document.close(); }
    } catch (err) {
      alert('Failed to load QR: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-500">{meta.total || 0} items total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => handleExport('excel')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            title="Export as CSV">
            <FileSpreadsheet size={14} className="text-green-600" />
            CSV
          </button>
          <button onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            title="Export as PDF-HTML">
            <FileText size={14} className="text-red-500" />
            PDF
          </button>
          {isAdmin && (
            <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary gap-2">
              <Plus size={16} /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search name, SKU, barcode..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="input w-auto" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input w-auto" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
            <option value="available">Available</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stock</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Min</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Barcode</th>
                {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="border-b"><td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr className="border-b"><td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-gray-400">No items found</td></tr>
              ) : items.map((item) => {
                const totalStock = item.stock_levels?.reduce((s, sl) => s + sl.quantity, 0) || 0;
                const isLow = totalStock <= item.min_stock && item.min_stock > 0;
                const isOut = totalStock === 0;
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.sku}</td>
                    <td className="px-4 py-3 text-gray-600">{item.category?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{totalStock}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{item.min_stock}</td>
                    <td className="px-4 py-3">
                      {isOut ? <span className="badge-danger">Out</span> : isLow ? <span className="badge-warning">Low</span> : <span className="badge-success">OK</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setBarcodeItem(item)}
                        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-mono"
                        title="View barcode"
                      >
                        <ScanBarcode size={14} />
                        <span className="hidden sm:inline">{item.barcode || item.sku}</span>
                        <span className="sm:hidden">{item.barcode ? 'BC' : 'SKU'}</span>
                      </button>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => startEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Edit"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 text-red-500 ml-1" title="Delete"><Trash2 size={14} /></button>
                      </td>
                    )}
                  </tr>
                );
              })}
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
              <h2 className="text-lg font-semibold">{editing ? 'Edit Item' : 'Add Item'}</h2>
              <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Name *</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">SKU *</label>
                  <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Barcode</label>
                  <input className="input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                </div>
                <div>
                  <label className="label">Category *</label>
                  <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
                    <option value="">Select...</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Unit *</label>
                  <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Min Stock</label>
                  <input className="input" type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <label className="label">{editing ? 'Stock' : 'Initial Stock'}</label>
                  <input className="input" type="number" min="0" value={form.initial_stock} onChange={(e) => setForm({ ...form, initial_stock: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="label">Location</label>
                  <select className="input" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
                    <option value="">Select location...</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.zone}-{l.rack}-{l.bin}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode / QR modal */}
      {barcodeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{barcodeItem.name}</h2>
              <button onClick={() => setBarcodeItem(null)} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-6">
              {/* Barcode section */}
              <p className="text-xs text-gray-500 mb-1 font-medium">Barcode</p>
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-lg p-4 mb-4 text-center">
                <img
                  src={`/api/inventory/items/${barcodeItem.id}/barcode/svg`}
                  alt={`Barcode ${barcodeItem.barcode || barcodeItem.sku}`}
                  className="mx-auto max-w-full h-24"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <p className="text-sm font-mono mt-2 tracking-wider">{barcodeItem.barcode || barcodeItem.sku}</p>
              </div>
              <div className="flex justify-center gap-2 mb-6">
                <button onClick={() => downloadSvg(`/api/inventory/items/${barcodeItem.id}/barcode/svg`, `barcode-${barcodeItem.sku}.svg`)} className="btn-secondary btn-sm gap-1.5">
                  <Download size={14} /> Download
                </button>
                <button onClick={() => openPrintWindow(`/api/inventory/items/${barcodeItem.id}/barcode/print`)} className="btn-primary btn-sm gap-1.5">
                  <Printer size={14} /> Print Barcode
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* QR Code section */}
              <p className="text-xs text-gray-500 mb-1 font-medium">QR Code</p>
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-lg p-4 mb-4 text-center">
                <img
                  src={`/api/inventory/items/${barcodeItem.id}/qr-code`}
                  alt={`QR Code ${barcodeItem.sku}`}
                  className="mx-auto w-32 h-32"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <p className="text-xs text-gray-400 mt-2">Scan to lookup item</p>
              </div>
              <div className="flex justify-center gap-2">
                <button onClick={() => downloadSvg(`/api/inventory/items/${barcodeItem.id}/qr-code`, `qr-${barcodeItem.sku}.svg`)} className="btn-secondary btn-sm gap-1.5">
                  <Download size={14} /> Download
                </button>
                <button onClick={() => openPrintWindow(`/api/inventory/items/${barcodeItem.id}/qr-print`)} className="btn-primary btn-sm gap-1.5">
                  <Printer size={14} /> Print QR
                </button>
                <button onClick={() => openQrView(barcodeItem.id)} className="btn-secondary btn-sm gap-1.5">
                  <Eye size={14} /> View QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
