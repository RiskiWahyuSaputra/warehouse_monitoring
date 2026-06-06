import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Search, ScanBarcode, History, CheckCircle, XCircle, AlertTriangle, Camera, Keyboard } from 'lucide-react';

export default function BarcodePage() {
  const [mode, setMode] = useState('manual'); // manual, camera
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = async (e) => {
    e?.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.post('/barcode/scan', { code: code.trim(), action: 'lookup' });
      setResult({ ...res.data, type: 'found' });
    } catch (err) {
      if (err.response?.status === 404) {
        setResult({ ...err.response.data, type: 'not_found' });
      } else {
        setError(err.response?.data?.message || 'Scan failed');
      }
    }

    setLoading(false);
    setCode('');
    inputRef.current?.focus();
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/barcode/history');
      setHistory(res.data.data || []);
    } catch {}
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
    if (!showHistory) fetchHistory();
  };

  const handleKeyPress = (e) => {
    // Auto-submit when Enter is pressed (simulates scanner input)
    if (e.key === 'Enter') {
      handleScan(e);
    }
  };

  const recentScans = history.slice(0, 5);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanBarcode size={24} /> Barcode Scanner
          </h1>
          <p className="text-gray-500 text-sm">Scan or type barcode to lookup inventory items</p>
        </div>
        <button onClick={toggleHistory} className={`btn-secondary gap-2 ${showHistory ? 'bg-gray-100' : ''}`}>
          <History size={16} /> History
        </button>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Scan History</h3>
          </div>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No scan history yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Barcode</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Item</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b">
                    <td className="px-4 py-2 font-mono text-xs">{h.scanned_code}</td>
                    <td className="px-4 py-2">{h.inventory_item?.name || '-'}</td>
                    <td className="px-4 py-2">
                      {h.found ? (
                        <span className="badge-success text-xs">Found</span>
                      ) : (
                        <span className="badge-danger text-xs">Not Found</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{new Date(h.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Scan input */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setMode('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${mode === 'manual' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Keyboard size={14} /> Manual Input
          </button>
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed"
            title="Camera scanner requires browser API"
          >
            <Camera size={14} /> Camera (soon)
          </button>
        </div>

        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <div className="relative">
              <ScanBarcode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                className="input pl-10 text-lg font-mono tracking-wider"
                placeholder="Scan or type barcode..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="off"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Tip: Use a USB barcode scanner or type the code and press Enter
            </p>
          </div>
          <button type="submit" disabled={loading || !code.trim()} className="btn-primary gap-2">
            <Search size={16} />
            {loading ? 'Scanning...' : 'Lookup'}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-l-4 border-l-red-500 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle size={16} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Result: Found */}
      {result?.type === 'found' && (
        <div className="card p-5 border-l-4 border-l-green-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <CheckCircle size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800">{result.item.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                SKU: {result.item.sku} &middot; Barcode: {result.code || result.item.barcode} &middot; Format: {result.format}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Stock</p>
                  <p className="text-lg font-bold">{result.item.total_stock}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Min Stock</p>
                  <p className="text-lg font-bold">{result.item.min_stock}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Unit</p>
                  <p className="text-lg font-bold">{result.item.unit}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-bold mt-1">
                    {result.item.status === 'Out of Stock' ? (
                      <span className="text-red-600">Out</span>
                    ) : result.item.status === 'Low' ? (
                      <span className="text-yellow-600">Low</span>
                    ) : (
                      <span className="text-green-600">OK</span>
                    )}
                  </p>
                </div>
              </div>

              {result.item.locations?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Locations:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.item.locations.map((loc, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {loc.zone}-{loc.rack}:{loc.bin} = {loc.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Result: Not Found */}
      {result?.type === 'not_found' && (
        <div className="card p-5 border-l-4 border-l-yellow-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-yellow-800">Item Not Found</h3>
              <p className="text-sm text-gray-600 mt-1">
                Barcode <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{result.code}</code> ({result.format}) is not registered in the system.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {result.hint}
              </p>
              <a
                href="/inventory"
                className="inline-flex items-center gap-1 mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                → Register new item in Inventory
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Quick history */}
      {recentScans.length > 0 && !showHistory && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Recent Scans</h3>
          <div className="space-y-1.5">
            {recentScans.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between p-2 bg-white rounded-lg border text-xs"
              >
                <code className="font-mono text-gray-700">{h.scanned_code}</code>
                <span className="text-gray-500">
                  {h.found ? h.inventory_item?.name || 'Found' : 'Not found'} — {new Date(h.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
