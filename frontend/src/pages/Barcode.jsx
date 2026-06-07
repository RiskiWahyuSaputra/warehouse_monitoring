import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Search, ScanBarcode, History, CheckCircle, XCircle, AlertTriangle, Camera, Keyboard, CameraOff, Zap, Upload } from 'lucide-react';
import jsQR from 'jsqr';
import { Html5Qrcode } from 'html5-qrcode';

// ── jsQR decoder for upload images only ───────────
function decodeJsQR(imageData) {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  const expectedLength = imageData.width * imageData.height * 4;
  if (imageData.data.length !== expectedLength) {
    return null;
  }
  if (imageData.width < 21 || imageData.height < 21) {
    return null;
  }
  for (const inversion of ['dontInvert', 'onlyInvert', 'attemptBoth']) {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: inversion,
      });
      if (code && code.data) {
        return code.data;
      }
    } catch (e) {
      // jsQR internal error, try next inversion
    }
  }
  return null;
}

// ── Decode barcode/QR from an uploaded image file ──
async function decodeImageFile(file) {
  // Strategy 1: html5-qrcode (ZXing-based, most robust)
  try {
    const scanner = new Html5Qrcode('upload-scanner', { verbose: false });
    const text = await scanner.scanFile(file, false);
    try { await scanner.clear(); } catch {}
    if (text) return text;
  } catch (err) {
    try { const s = new Html5Qrcode('upload-scanner'); await s.clear(); } catch {}
  }

  // Strategy 2: Draw to canvas and try jsQR
  try {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const canvas = document.createElement('canvas');
    let { width, height } = img;
    const maxDim = 800;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(img.src);

    const imageData = canvas.getContext('2d').getImageData(0, 0, width, height);
    const result = decodeJsQR(imageData);
    if (result) return result;
  } catch (err) {
    console.error('[decodeImageFile] failed:', err);
  }

  return null;
}

// ── Component ──────────────────────────────────────
export default function BarcodePage() {
  const [mode, setMode] = useState('manual');
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);

  // Camera state
  const html5QrcodeRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (mode === 'manual') inputRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode]);

  // ── Camera control using Html5Qrcode ─────────────
  const startCamera = async () => {
    setCameraError('');
    setScanning(false);

    // Clean up any existing instance
    if (html5QrcodeRef.current) {
      try { await html5QrcodeRef.current.stop(); } catch {}
      try { await html5QrcodeRef.current.clear(); } catch {}
      html5QrcodeRef.current = null;
    }

    try {
      const html5Qrcode = new Html5Qrcode('camera-scanner', {
        verbose: false,
        formatsToSupport: undefined,
      });
      html5QrcodeRef.current = html5Qrcode;

      setCameraActive(true);
      setScanning(true);

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 200 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success callback
          console.log('[Html5Qrcode] Found:', decodedText);
          stopCamera();
          setCode(decodedText);
          handleLookup(decodedText);
        },
        () => {
          // Ignore scan failures (no QR found in frame)
        }
      );
    } catch (err) {
      console.error('[startCamera] error:', err);
      setCameraError('Cannot access camera: ' + (err.message || 'Permission denied'));
      setCameraActive(false);
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    setScanning(false);
    setCameraActive(false);
    if (html5QrcodeRef.current) {
      try { await html5QrcodeRef.current.stop(); } catch {}
      try { await html5QrcodeRef.current.clear(); } catch {}
      html5QrcodeRef.current = null;
    }
  };

  // ── Core lookup ─────────────────────────────────
  const handleLookup = async (codeToLookup) => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.post('/barcode/scan', { code: codeToLookup, action: 'lookup' });
      setResult({ ...res.data, type: 'found' });
    } catch (err) {
      if (err.response?.status === 404) {
        setResult({ ...err.response.data, type: 'not_found' });
      } else {
        setError(err.response?.data?.message || 'Scan failed');
      }
    }
    setLoading(false);
  };

  // ── Upload image ────────────────────────────────
  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMode('upload');
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const decodedText = await decodeImageFile(file);
      if (decodedText) {
        setCode(decodedText);
        await handleLookup(decodedText);
      } else {
        setError('No barcode or QR code detected. Make sure the image is clear, well-lit, and the code fills most of the frame.');
      }
    } catch (err) {
      setError('Failed to process image: ' + (err.message || 'Unknown error'));
    }

    setLoading(false);
    e.target.value = '';
  };

  // ── Manual entry ────────────────────────────────
  const handleManualScan = (e) => {
    e?.preventDefault();
    if (!code.trim()) return;
    const codeToScan = code.trim();
    setCode('');
    handleLookup(codeToScan);
  };

  // ── History ─────────────────────────────────────
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

  const recentScans = history.slice(0, 5);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Hidden elements for scanners */}
      <div id="upload-scanner" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', visibility: 'hidden' }}></div>

      {/* Camera scanner container — responsive sizing */}
      {mode === 'camera' && (
        <div className="card p-4">
          <div id="camera-scanner" className="camera-scanner-wrapper"></div>
          {scanning && !result && !error && (
            <div className="mt-3 text-center">
              <p className="text-xs text-gray-400">Point camera at barcode or QR code</p>
            </div>
          )}
        </div>
      )}

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
                      {h.found ? <span className="badge-success text-xs">Found</span> : <span className="badge-danger text-xs">Not Found</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{new Date(h.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Scan area */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setMode('manual'); setResult(null); setError(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${mode === 'manual' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Keyboard size={14} /> <span className="hidden min-[400px]:inline">Manual</span>
            </button>
            <button
              onClick={() => { setMode('camera'); setResult(null); setError(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${mode === 'camera' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Camera size={14} /> <span className="hidden min-[400px]:inline">Camera</span>
            </button>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${mode === 'upload' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Upload size={14} /> <span className="hidden min-[400px]:inline">Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
            </label>
          </div>
          {result && (
            <button
              onClick={() => { setResult(null); setError(''); setCode(''); inputRef.current?.focus(); }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Upload mode — loading state */}
        {mode === 'upload' && loading && !result && !error && (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm">Analyzing image...</p>
            <p className="text-xs text-gray-400 mt-1">Detecting barcode or QR code</p>
          </div>
        )}

        {/* Manual mode */}
        {mode === 'manual' && (
          <form onSubmit={handleManualScan} className="space-y-4">
            <div>
              <div className="relative">
                <ScanBarcode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  className="input pl-10 text-lg font-mono tracking-wider"
                  placeholder="Type barcode or SKU and press Enter..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Tip: Connect a USB barcode scanner, or type the code / SKU manually and press Enter
              </p>
            </div>
            <button type="submit" disabled={loading || !code.trim()} className="btn-primary gap-2">
              <Search size={16} />
              {loading ? 'Scanning...' : 'Lookup'}
            </button>
          </form>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-l-4 border-l-red-500 bg-red-50">
          <div className="flex items-start gap-2 text-red-700">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{error}</p>
              <p className="text-xs text-red-500 mt-1">Try typing the code manually if scan keeps failing.</p>
            </div>
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
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-green-800">{result.item.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                SKU: {result.item.sku} &middot; Barcode: {result.code || result.item.barcode} &middot; Format: {result.format}
              </p>
              {result.item.description && (
                <p className="text-xs text-gray-400 mt-1">{result.item.description}</p>
              )}

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

              {result.item.category && (
                <div className="mt-3">
                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                    {result.item.category}
                  </span>
                </div>
              )}

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
                Code <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{result.code}</code> ({result.format}) is not registered in the system.
              </p>
              <p className="text-xs text-gray-400 mt-2">{result.hint}</p>
              <a href="/inventory" className="inline-flex items-center gap-1 mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium">
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
              <div key={h.id} className="flex items-center justify-between p-2 bg-white rounded-lg border text-xs">
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
