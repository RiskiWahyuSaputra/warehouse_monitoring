<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BarcodeScan;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class BarcodeController extends Controller
{
    /**
     * GET /api/inventory/items/{inventoryItem}/barcode
     */
    public function generate(InventoryItem $inventoryItem): JsonResponse
    {
        return response()->json([
            'item'    => $inventoryItem->load('category', 'stockLevels.location'),
            'barcode' => $inventoryItem->barcode,
            'svg_url' => url('/api/inventory/items/' . $inventoryItem->id . '/barcode/svg'),
            'print_url' => url('/api/inventory/items/' . $inventoryItem->id . '/barcode/print'),
        ]);
    }

    /**
     * GET /api/inventory/items/{inventoryItem}/barcode/svg
     */
    public function svg(InventoryItem $inventoryItem): Response
    {
        $code = $inventoryItem->barcode ?: $inventoryItem->sku;
        $svg = $this->buildCode128Svg($code);

        return response($svg, 200, [
            'Content-Type'  => 'image/svg+xml',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * GET /api/inventory/items/{inventoryItem}/barcode/print
     */
    public function printLabel(InventoryItem $inventoryItem): Response
    {
        $code = $inventoryItem->barcode ?: $inventoryItem->sku;

        ob_start();
        ?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Barcode - <?php echo htmlspecialchars($inventoryItem->name); ?></title>
<style>
@page { size: 76mm 25mm; margin: 3mm; }
body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; font-family: Helvetica, Arial, sans-serif; }
.label { width: 70mm; text-align: center; }
.label .name { font-size: 9px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.label .sku { font-size: 7px; color: #666; margin-bottom: 3px; }
.barcode-img { width: 100%; height: 15mm; margin-bottom: 1px; }
.barcode-img svg { width: 100%; height: 100%; display: block; }
.label .code-text { font-size: 8px; font-family: monospace; letter-spacing: 1px; }
@media print { body { min-height: auto; } }
</style>
</head>
<body>
<div class="label">
<div class="name"><?php echo htmlspecialchars($inventoryItem->name); ?></div>
<div class="sku">SKU: <?php echo htmlspecialchars($inventoryItem->sku); ?></div>
<div class="barcode-img"><?php echo $this->buildCode128Svg($code); ?></div>
<div class="code-text"><?php echo htmlspecialchars($code); ?></div>
</div>
<script>window.onload = function(){ window.print(); };</script>
</body>
</html>
        <?php
        return response(ob_get_clean());
    }

    /**
     * POST /api/barcode/scan
     */
    public function scan(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'code'   => 'required|string|min:3|max:100',
            'action' => 'nullable|string|in:lookup,stock_in,stock_out',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid barcode format.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $code   = trim($request->input('code'));
        $action = $request->input('action', 'lookup');
        $format = $this->detectBarcodeFormat($code) ?: 'unknown';

        // Lookup by barcode first, then SKU
        $item = InventoryItem::with(['category', 'stockLevels.location'])
            ->where('barcode', $code)
            ->first();

        if (!$item) {
            $item = InventoryItem::with(['category', 'stockLevels.location'])
                ->where('sku', $code)
                ->first();
        }

        $found = $item !== null;

        BarcodeScan::create([
            'user_id'           => $request->user()->id,
            'inventory_item_id' => $item?->id,
            'scanned_code'      => $code,
            'action'            => $action,
            'found'             => $found,
        ]);

        if (!$found) {
            return response()->json([
                'message' => 'Item not found.',
                'code'    => $code,
                'format'  => $format,
                'found'   => false,
                'hint'    => 'You can register this as a new inventory item.',
            ], 404);
        }

        $totalStock = $item->stockLevels->sum('quantity');

        return response()->json([
            'message' => 'Item found.',
            'found'   => true,
            'format'  => $format,
            'item'    => [
                'id'          => $item->id,
                'name'        => $item->name,
                'sku'         => $item->sku,
                'barcode'     => $item->barcode,
                'description' => $item->description,
                'unit'        => $item->unit,
                'min_stock'   => $item->min_stock,
                'total_stock' => $totalStock,
                'status'      => $this->stockStatus($item, $totalStock),
                'category'    => $item->category?->name,
                'locations'   => $item->stockLevels->map(fn($sl) => [
                    'zone'     => $sl->location?->zone,
                    'rack'     => $sl->location?->rack,
                    'bin'      => $sl->location?->bin,
                    'quantity' => $sl->quantity,
                ]),
            ],
        ]);
    }

    /**
     * GET /api/barcode/history
     */
    public function history(Request $request): JsonResponse
    {
        $query = BarcodeScan::with(['inventoryItem:id,name,sku'])
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at');

        return response()->json($query->paginate(20));
    }

    /**
     * GET /api/barcode/lookup/{code}
     */
    public function lookup(string $code): JsonResponse
    {
        $item = InventoryItem::with(['category', 'stockLevels.location'])
            ->where('barcode', $code)
            ->orWhere('sku', $code)
            ->first();

        if (!$item) {
            return response()->json(['message' => 'Item not found.', 'found' => false], 404);
        }

        $totalStock = $item->stockLevels->sum('quantity');

        return response()->json([
            'found' => true,
            'item'  => [
                'id'          => $item->id,
                'name'        => $item->name,
                'sku'         => $item->sku,
                'barcode'     => $item->barcode,
                'unit'        => $item->unit,
                'min_stock'   => $item->min_stock,
                'total_stock' => $totalStock,
                'status'      => $this->stockStatus($item, $totalStock),
                'category'    => $item->category?->name,
            ],
        ]);
    }

    // ── QR CODE (using Endroid QR Code library) ─────

    /**
     * GET /api/inventory/items/{inventoryItem}/qr-code
     * Generate QR Code SVG for an item.
     */
    public function qrCode(InventoryItem $inventoryItem): Response
    {
        $data = $inventoryItem->sku;

        $qrCode = new \Endroid\QrCode\QrCode(
            data: $data,
            errorCorrectionLevel: \Endroid\QrCode\ErrorCorrectionLevel::High,
            size: 400,
            margin: 10,
            roundBlockSizeMode: \Endroid\QrCode\RoundBlockSizeMode::Margin,
        );

        $writer = new \Endroid\QrCode\Writer\SvgWriter();
        $result = $writer->write($qrCode);
        $svg = $result->getString();

        // Strip XML declaration for cleaner <img> embedding
        $svg = preg_replace('/<\?xml[^?]*\?>\s*/', '', $svg);

        return response($svg, 200, [
            'Content-Type'  => 'image/svg+xml',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * GET /api/inventory/items/{inventoryItem}/qr-print
     * Printable QR Code label.
     */
    public function qrPrint(InventoryItem $inventoryItem): Response
    {
        $data = $inventoryItem->sku;

        $qrCode = new \Endroid\QrCode\QrCode(
            data: $data,
            errorCorrectionLevel: \Endroid\QrCode\ErrorCorrectionLevel::High,
            size: 400,
            margin: 10,
            roundBlockSizeMode: \Endroid\QrCode\RoundBlockSizeMode::Margin,
        );

        $writer = new \Endroid\QrCode\Writer\SvgWriter();
        $result = $writer->write($qrCode);
        $svg = $result->getString();
        // Keep XML declaration for standalone print page — it's valid HTML5 inside the print template

        ob_start();
        ?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>QR Code - <?php echo htmlspecialchars($inventoryItem->name); ?></title>
<style>
@page { size: 50mm 50mm; margin: 3mm; }
body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; font-family: Helvetica, Arial, sans-serif; }
.label { width: 44mm; text-align: center; }
.label svg { width: 32mm; height: 32mm; }
.label .name { font-size: 8px; font-weight: 600; margin-top: 2px; }
.label .sku { font-size: 7px; color: #666; }
@media print { body { min-height: auto; } }
</style>
</head>
<body>
<div class="label">
<?php echo $svg; ?>
<div class="name"><?php echo htmlspecialchars($inventoryItem->name); ?></div>
<div class="sku">SKU: <?php echo htmlspecialchars($inventoryItem->sku); ?></div>
</div>
<script>window.onload = function(){ window.print(); };</script>
</body>
</html>
        <?php
        return response(ob_get_clean());
    }

    // ── PRIVATE HELPERS ────────────────────────────

    private function stockStatus(InventoryItem $item, int $totalStock): string
    {
        if ($totalStock <= 0) return 'Out of Stock';
        if ($item->min_stock > 0 && $totalStock <= $item->min_stock) return 'Low';
        return 'Available';
    }

    private function detectBarcodeFormat(string $code): ?string
    {
        $len = strlen($code);
        if ($len === 13 && ctype_digit($code)) return 'EAN-13';
        if ($len === 8 && ctype_digit($code)) return 'EAN-8';
        if ($len === 12 && ctype_digit($code)) return 'UPC-A';
        if ($len >= 4 && $len <= 48 && preg_match('/^[A-Za-z0-9\-\.\/\+\s]+$/', $code)) return 'Code 128';
        if ($len > 20 || preg_match('/[a-zA-Z]/', $code)) return 'QR Code';
        return null;
    }

    /**
     * Build a Code 128 SVG barcode.
     */
    private function buildCode128Svg(string $code): string
    {
        $code = (string) $code;
        if ($code === '') $code = 'N/A';

        // Code 128 B start = 104, stop = 106
        $values = [104]; // Start B
        for ($i = 0; $i < strlen($code); $i++) {
            $char = ord($code[$i]);
            if ($char >= 32 && $char <= 127) {
                $values[] = $char - 32;
            } else {
                $values[] = 0; // space for unknown
            }
        }

        // Checksum
        $checksum = 104;
        for ($i = 1; $i < count($values); $i++) {
            $checksum += $values[$i] * $i;
        }
        $values[] = $checksum % 103;
        $values[] = 106; // Stop

        // Code 128 patterns (11 modules each, 6 bars/spaces)
        $patterns = [
            '11011001100','11001101100','11001100110','10010011000','10010001100',
            '10001001100','10011001000','10011000100','10001100100','11001001000',
            '11001000100','11000100100','10110011100','10011011100','10011001110',
            '10111001100','10011101100','10011100110','11001110010','11001011100',
            '11001001110','11011100100','11001110100','11101101110','11101001100',
            '11100101100','11100100110','11101100100','11100110100','11100110010',
            '11011011000','11011000110','11000110110','10100011000','10001011000',
            '10001000110','10110001000','10001101000','10001100010','11010001000',
            '11000101000','11000100010','10110111000','10110001110','10001101110',
            '10111011000','10111000110','10001110110','11101110110','11010001110',
            '11000101110','11011101000','11011100010','11011101110','11101011000',
            '11101000110','11100010110','11101101000','11101100010','11100011010',
            '11101111010','11001000010','11110001010','10100110000','10100001100',
            '10010110000','10010000110','10000101100','10000100110','10110010000',
            '10110000100','10011010000','10011000010','10000110100','10000110010',
            '11000010010','11001010000','11110111010','11000010100','10001111010',
            '10100111100','10010111100','10010011110','10111100100','10011110100',
            '10011110010','11110100100','11110010100','11110010010','11011011110',
            '11011110110','11110110110','10101111000','10100011110','10001011110',
            '10111101000','10111100010','11110101000','11110100010','10111011110',
            '10111101110','11101011110','11110101110','11010000100','11010010000',
            '11010011100','1100011101011',
        ];

        // Build bar string
        $bars = '';
        foreach ($values as $v) {
            if ($v >= 0 && $v < count($patterns)) {
                $bars .= $patterns[$v];
            }
        }

        // Quiet zone
        $bars = '00000000000' . $bars . '00000000000';

        // Render SVG
        $barW = 2;
        $h = 50;
        $w = strlen($bars) * $barW;

        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' . $w . '" height="' . $h . '" viewBox="0 0 ' . $w . ' ' . $h . '">';
        $svg .= '<rect width="100%" height="100%" fill="#fff"/>';

        $x = 0;
        for ($i = 0; $i < strlen($bars); $i++) {
            if ($bars[$i] === '1') {
                $svg .= '<rect x="' . $x . '" y="0" width="' . $barW . '" height="' . $h . '" fill="#000"/>';
            }
            $x += $barW;
        }

        $svg .= '</svg>';

        return $svg;
    }

}
