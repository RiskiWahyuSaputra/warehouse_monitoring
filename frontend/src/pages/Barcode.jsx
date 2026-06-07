import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { Search, ScanBarcode, History, CheckCircle, XCircle, AlertTriangle, Camera, Keyboard, CameraOff, Zap, Upload } from 'lucide-react';
import jsQR from 'jsqr';
import Quagga from 'quagga';
import { Html5Qrcode } from 'html5-qrcode';

function decodeQuagga(canvas) {
  return new Promise((resolve) => {
    Quagga.decodeSingle({
      decoder: { readers: ['code_128_reader', 'ean_reader', 'ean_8_reader', 'upc_reader', 'code_39_reader', 'codabar_reader'] },
      locate: true,
      src: canvas,
    }, (result) => {
      if (result && result.codeResult) {
        resolve({ rawValue: result.codeResult.code, format: result.codeResult.format || 'code_128' });
      } else {
        resolve(null);
      }
    });
  });
}

async function detectBarcode(canvas, frameCount = 0) {
  // 1. Native BarcodeDetector API (fast, supported in Chrome/Edge)
  if ('BarcodeDetector' in window) {
    try {
      const supported = await BarcodeDetector.getSupportedFormats();
      const formats = supported.filter((f) => ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'code_93', 'codabar'].includes(f));
      if (formats.length > 0) {
        const detector = new BarcodeDetector({ formats });
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) return barcodes[0];
      }
    } catch {}
  }

  // 2. Quagga for 1D barcodes (throttled to every 5th frame)
  if (frameCount % 5 === 0) {
    try {
      const result = await decodeQuagga(canvas);
      if (result) return result;
    } catch {}
  }

  // 3. jsQR fallback for QR codes
  if (frameCount % 3 === 0) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    if (code) return { rawValue: code.data, format: 'qr_code' };
  }

  return null;
}

// Decode barcode from an image file using multiple strategies
async function decodeImageFile(file) {
  // Strategy 1: html5-qrcode (ZXing-based, supports 1D + QR)
  try {
    const scanner = new Html5Qrcode('upload-scanner', {
      formatsToSupport: undefined,
      verbose: false,
    });
    const text = await scanner.scanFile(file, false);
    await scanner.clear();
    if (text) return text;
  } catch (err) {
    console.warn('html5-qrcode failed:', err);
    try { const s = new Html5Qrcode('upload-scanner'); await s.clear(); } catch {}
  }

  // Strategy 2: Draw to canvas and try jsQR + Quagga
  try {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const canvas = document.createElement('canvas');
    let { width, height } = img;
    // Limit size for performance but keep enough resolution for scanning
    const maxDim = 1200;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(img.src);

    // Try jsQR first (QR codes)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (qrCode && qrCode.data) return qrCode.data;

    // Try Quagga (1D barcodes)
    const quaggaResult = await decodeQuagga(canvas);
    if (quaggaResult) return quaggaResult.rawValue;

    // Try BarcodeDetector API if available
    if ('BarcodeDetector' in window) {
      try {
        const detector = new BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'code_93', 'codabar'],
        });
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0 && barcodes[0].rawValue) return barcodes[0].rawValue;
      } catch {}
    }
  } catch (err) {
    console.error('Canvas decode failed:', err);
  }

  return null;
}

export default function BarcodePage() {
  const [mode, setMode] = useState('manual'); // manual, camera, upload
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);

  // Camera state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const scanningRef = useRef(false);
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

  const startCamera = async () => {
    setCameraError('');
    setScanning(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraActive(true);
          setScanning(true);
          scanningRef.current = true;
          requestAnimationFrame(tick);
        };
      }
    } catch (err) {
      setCameraError('Cannot access camera: ' + (err.message || 'Permission denied'));
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    scanningRef.current = false;
    setScanning(false);
    setCameraActive(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const frameCount = useRef(0);
  const lastScannedCode = useRef(null);
  const lastScanTime = useRef(0);

  const tick = useCallback(async () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current || videoRef.current.readyState !== 4) {
      if (scanningRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    frameCount.current++;
    const barcode = await detectBarcode(canvas, frameCount.current);

    if (barcode && barcode.rawValue) {
      // Debounce: ignore same code within 3 seconds
      const now = Date.now();
      if (barcode.rawValue === lastScannedCode.current && now - lastScanTime.current < 3000) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      lastScannedCode.current = barcode.rawValue;
      lastScanTime.current = now;

      scanningRef.current = false;
      setScanning(false);
      stopCamera();
      setCode(barcode.rawValue);
      handleLookup(barcode.rawValue);
      return;
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  // Core lookup function — used by manual, camera, and upload
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
        setError('No barcode or QR code detected in the image. Try a clearer photo with better lighting.');
      }
    } catch (err) {
      console.error('Upload processing failed:', err);
      setError('Failed to process image: ' + (err.message || 'Unknown error'));
    }

    setLoading(false);
    e.target.value = '';
  };

  const handleManualScan = (e) => {
    e?.preventDefault();
    if (!code.trim()) return;
    const codeToScan = code.trim();
    setCode('');
    handleLookup(codeToScan);
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

  const recentScans = history.slice(0, 5);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Hidden element for html5-qrcode — must be in DOM with valid dimensions */}
      <div id="upload-scanner" style={{ position: 'absolute', width: '320px', height: '240px', visibility: 'hidden', pointerEvents: 'none' }}></div>

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
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMode('manual'); setResult(null); setError(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${mode === 'manual' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Keyboard size={14} /> Manual
            </button>
            <button
              onClick={() => { setMode('camera'); setResult(null); setError(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${mode === 'camera' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Camera size={14} /> Camera
            </button>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${mode === 'upload' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Upload size={14} /> Upload
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

        {/* Camera mode */}
        {mode === 'camera' && (
          <div className="mb-4">
            {cameraError ? (
              <div className="text-center py-8 text-red-500">
                <CameraOff size={32} className="mx-auto mb-2" />
                <p className="text-sm">{cameraError}</p>
                <button onClick={startCamera} className="btn-secondary btn-sm mt-3 gap-1.5">
                  <Zap size={14} /> Retry
                </button>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  className="w-full rounded-xl"
                  style={{ maxHeight: '320px', objectFit: 'cover' }}
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                {/* Scanning overlay */}
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-56 h-40 border-2 border-white/60 rounded-2xl relative">
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-pulse" />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 px-2 py-1 rounded whitespace-nowrap">
                        Align barcode within frame
                      </div>
                    </div>
                  </div>
                )}
                {cameraActive && !scanning && loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl px-4 py-3 text-sm font-medium">Processing...</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Upload mode — show loading state */}
        {mode === 'upload' && loading && !result && (
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
                  placeholder="Type barcode and press Enter..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Tip: Connect a USB barcode scanner and type the code, or enter manually and press Enter
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
                Barcode <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{result.code}</code> ({result.format}) is not registered in the system.
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
