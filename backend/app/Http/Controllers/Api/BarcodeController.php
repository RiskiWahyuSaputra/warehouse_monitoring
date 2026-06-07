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
.barcode-img { width: 100%; height: 12mm; margin-bottom: 1px; }
.barcode-img svg { width: 100%; height: 100%; }
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

    // ── QR CODE ─────────────────────────────────────

    /**
     * GET /api/inventory/items/{inventoryItem}/qr-code
     * Generate QR Code SVG for an item.
     */
    public function qrCode(InventoryItem $inventoryItem): Response
    {
        $data = json_encode([
            'id'   => $inventoryItem->id,
            'sku'  => $inventoryItem->sku,
            'name' => $inventoryItem->name,
            'url'  => url('/api/barcode/lookup/' . ($inventoryItem->barcode ?: $inventoryItem->sku)),
        ]);

        $svg = $this->buildQrSvg($data);

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
        $data = json_encode([
            'id'   => $inventoryItem->id,
            'sku'  => $inventoryItem->sku,
            'name' => $inventoryItem->name,
            'url'  => url('/api/barcode/lookup/' . ($inventoryItem->barcode ?: $inventoryItem->sku)),
        ]);
        $svg = $this->buildQrSvg($data);

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
        $barW = 1.5;
        $h = 36;
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

    /**
     * Build a QR Code SVG (pure PHP implementation).
     */
    private function buildQrSvg(string $data): string
    {
        $modules = $this->encodeQr($data);
        $size = count($modules);
        $scale = 4;
        $svgSize = $size * $scale;

        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' . $svgSize . '" height="' . $svgSize . '" viewBox="0 0 ' . $svgSize . ' ' . $svgSize . '">';
        $svg .= '<rect width="100%" height="100%" fill="#fff"/>';

        for ($y = 0; $y < $size; $y++) {
            for ($x = 0; $x < $size; $x++) {
                if (!empty($modules[$y][$x])) {
                    $svg .= '<rect x="' . ($x * $scale) . '" y="' . ($y * $scale) . '" width="' . $scale . '" height="' . $scale . '" fill="#000"/>';
                }
            }
        }

        $svg .= '</svg>';
        return $svg;
    }

    private function encodeQr(string $data): array
    {
        $version = 1;
        $size = 17 + 4 * $version;
        $grid = array_fill(0, $size, array_fill(0, $size, false));

        $this->addFinderPattern($grid, 0, 0);
        $this->addFinderPattern($grid, $size - 7, 0);
        $this->addFinderPattern($grid, 0, $size - 7);

        for ($i = 8; $i < $size - 8; $i++) {
            $grid[6][$i] = ($i % 2 === 0);
            $grid[$i][6] = ($i % 2 === 0);
        }

        $grid[$size - 8][8] = true;

        $encoded = $this->encodeAlphanumeric($data);
        $bitIndex = 0;
        $direction = -1;
        $col = $size - 1;

        while ($col >= 0) {
            if ($col === 6) $col--;
            if ($col < 0) break;

            for ($i = 0; $i < $size; $i++) {
                $r = ($direction === -1) ? ($size - 1 - $i) : $i;

                for ($c = 0; $c < 2; $c++) {
                    $cc = $col - $c;
                    if ($cc < 0) continue;
                    if ($this->isFunctionPattern($r, $cc, $size)) continue;

                    $bit = isset($encoded[$bitIndex]) ? $encoded[$bitIndex] : false;
                    $grid[$r][$cc] = $bit;
                    $bitIndex++;
                }
            }

            $col -= 2;
            $direction *= -1;
        }

        return $grid;
    }

    private function addFinderPattern(array &$grid, int $sr, int $sc): void
    {
        $p = [[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,0,0,0,0,1],[1,1,1,1,1,1,1]];
        for ($r = 0; $r < 7; $r++)
            for ($c = 0; $c < 7; $c++)
                $grid[$sr + $r][$sc + $c] = (bool) $p[$r][$c];
    }

    private function isFunctionPattern(int $r, int $c, int $s): bool
    {
        if (($r < 9 && $c < 9) || ($r < 9 && $c >= $s - 8) || ($r >= $s - 8 && $c < 9)) return true;
        if ($r === 6 || $c === 6) return true;
        if ($r === $s - 8 && $c === 8) return true;
        return false;
    }

    private function encodeAlphanumeric(string $data): array
    {
        $bits = [0,0,0,1]; // mode
        $len = strlen($data);
        $cb = str_pad(decbin($len), 9, '0', STR_PAD_LEFT);
        for ($i = 0; $i < 9; $i++) $bits[] = (int) $cb[$i];

        $an = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
        $i = 0;
        while ($i < $len) {
            $c1 = strpos($an, strtoupper($data[$i]));
            if ($c1 === false) $c1 = 0;
            if ($i + 1 < $len) {
                $c2 = strpos($an, strtoupper($data[$i + 1]));
                if ($c2 === false) $c2 = 0;
                $v = $c1 * 45 + $c2;
                $b = str_pad(decbin($v), 11, '0', STR_PAD_LEFT);
                for ($j = 0; $j < 11; $j++) $bits[] = (int) $b[$j];
                $i += 2;
            } else {
                $b = str_pad(decbin($c1), 6, '0', STR_PAD_LEFT);
                for ($j = 0; $j < 6; $j++) $bits[] = (int) $b[$j];
                $i++;
            }
        }

        $bits = array_merge($bits, [0,0,0,0]);
        while (count($bits) % 8 !== 0) $bits[] = 0;
        $pad = [236, 17];
        $pi = 0;
        while (count($bits) < 152) {
            $byte = $pad[$pi % 2];
            $b = str_pad(decbin($byte), 8, '0', STR_PAD_LEFT);
            for ($j = 0; $j < 8; $j++) $bits[] = (int) $b[$j];
            $pi++;
        }

        return $bits;
    }
}
