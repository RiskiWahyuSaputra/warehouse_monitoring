<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use Illuminate\Http\Response;

class BarcodeController extends Controller
{
    /**
     * GET /api/inventory/items/{inventoryItem}/barcode
     * Generate barcode info for an item.
     */
    public function generate(InventoryItem $inventoryItem)
    {
        return response()->json([
            'item'    => $inventoryItem->load('category', 'stockLevels.location'),
            'barcode' => $inventoryItem->barcode,
            'url'     => url('/api/barcode/' . $inventoryItem->barcode),
        ]);
    }

    /**
     * GET /api/inventory/items/{inventoryItem}/barcode/svg
     * Render barcode as SVG image for printing.
     */
    public function svg(InventoryItem $inventoryItem): Response
    {
        $code = $inventoryItem->barcode ?: $inventoryItem->sku;
        $svg = $this->generateCode128Svg($code, $inventoryItem->name);

        return response($svg, 200, [
            'Content-Type'  => 'image/svg+xml',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * GET /api/inventory/items/{inventoryItem}/barcode/print
     * Render printable barcode label (HTML page).
     */
    public function print(InventoryItem $inventoryItem): Response
    {
        $code = $inventoryItem->barcode ?: $inventoryItem->sku;
        $svg = $this->generateCode128Svg($code, $inventoryItem->name);

        ob_start();
        ?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Barcode - <?php echo htmlspecialchars($inventoryItem->name); ?></title>
<style>
@page { size: 76mm 25mm; margin: 3mm; }
body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
.label { width: 70mm; text-align: center; }
.label .name { font-size: 9px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.label .sku { font-size: 7px; color: #666; margin-bottom: 3px; }
.label svg { width: 100%; height: auto; max-height: 12mm; }
.label .code-text { font-size: 8px; font-family: monospace; letter-spacing: 1px; margin-top: 1px; }
@media print { body { min-height: auto; } }
</style>
</head>
<body>
<div class="label">
<div class="name"><?php echo htmlspecialchars($inventoryItem->name); ?></div>
<div class="sku">SKU: <?php echo htmlspecialchars($inventoryItem->sku); ?></div>
<?php echo $svg; ?>
<div class="code-text"><?php echo htmlspecialchars($code); ?></div>
</div>
</body>
</html>
        <?php
        return response(ob_get_clean());
    }

    /**
     * POST /api/barcode/scan
     * Scan a barcode and return the matching item.
     */
    public function scan(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
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

        $format = $this->detectBarcodeFormat($code);
        if (!$format) $format = 'unknown';

        $item = InventoryItem::with(['category', 'stockLevels.location'])
            ->where('barcode', $code)
            ->first();

        // Also try SKU if not found by barcode
        if (!$item) {
            $item = InventoryItem::with(['category', 'stockLevels.location'])
                ->where('sku', $code)
                ->first();
        }

        $found = $item !== null;

        \App\Models\BarcodeScan::create([
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
                'status'      => $totalStock <= 0 ? 'Out of Stock' : ($item->min_stock > 0 && $totalStock <= $item->min_stock ? 'Low' : 'Available'),
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
     * Get scan history for current user.
     */
    public function history(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        $query = \App\Models\BarcodeScan::with(['inventoryItem:id,name,sku'])
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at');

        return response()->json($query->paginate(20));
    }

    /**
     * GET /api/barcode/lookup/{code}
     * Quick lookup by barcode (GET alternative to POST scan).
     */
    public function lookup(string $code): \Illuminate\Http\JsonResponse
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
                'status'      => $totalStock <= 0 ? 'Out of Stock' : ($item->min_stock > 0 && $totalStock <= $item->min_stock ? 'Low' : 'Available'),
                'category'    => $item->category?->name,
            ],
        ]);
    }

    // ── BARCODE SVG GENERATOR (Code 128) ───────────

    private function generateCode128Svg(string $code, string $label = ''): string
    {
        // Code 128 character set B encoding
        $charset = [
            ' ', '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?',
            '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
            'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '[', '\\', ']', '^', '_',
            '`', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
            'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '{', '|', '}', '~',
        ];

        // Code 128 patterns (B encoding): each char = 6 bars/spaces, 11 modules wide
        $patterns = [];
        for ($i = 0; $i < 107; $i++) {
            $patterns[] = $this->getCode128Pattern($i);
        }

        // Build barcode data
        $bars = [];

        // Start code B (index 104)
        $bars = array_merge($bars, $this->charToBars(104));

        // Encode each character
        $checksum = 104; // start code B
        for ($i = 0; $i < strlen($code); $i++) {
            $charIndex = array_search($code[$i], $charset);
            if ($charIndex === false) $charIndex = 0; // fallback to space
            $bars = array_merge($bars, $this->charToBars($charIndex));
            $checksum += $charIndex * ($i + 1);
        }

        // Check character
        $checkChar = $checksum % 103;
        $bars = array_merge($bars, $this->charToBars($checkChar));

        // Stop code
        $bars = array_merge($bars, [1,1,0,1,0,0,1,1,0,1,1]);

        // Render SVG
        $barWidth = 1.5;
        $height = 40;
        $width = count($bars) * $barWidth + 20;
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' . $width . '" height="' . $height . '" viewBox="0 0 ' . $width . ' ' . $height . '">';
        $svg .= '<rect width="100%" height="100%" fill="white"/>';

        $x = 10;
        foreach ($bars as $i => $bar) {
            if ($i % 2 === 0 && $bar) {
                $svg .= '<rect x="' . $x . '" y="2" width="' . $barWidth . '" height="' . ($height - 14) . '" fill="black"/>';
            }
            $x += $barWidth;
        }

        $svg .= '</svg>';

        return $svg;
    }

    private function charToBars(int $index): array
    {
        // Simplified Code 128 B encoding patterns
        // Each pattern is 6 elements (bars/spaces), 11 modules total
        $code128Patterns = [
            [2,1,2,2,2,2], [2,2,2,1,2,2], [2,2,2,2,2,1], [1,2,1,2,2,3], [1,2,1,3,2,2],
            [1,3,1,2,2,2], [1,2,2,2,1,3], [1,2,2,3,1,2], [1,3,2,2,1,2], [2,2,1,2,1,3],
            [2,2,1,3,1,2], [2,3,1,2,1,2], [1,1,2,2,3,2], [1,2,2,1,3,2], [1,2,2,2,3,1],
            [1,1,3,2,2,2], [1,2,3,1,2,2], [1,2,3,2,2,1], [2,2,3,2,1,1], [2,2,1,1,3,2],
            [2,2,1,2,3,1], [2,1,3,2,1,2], [2,2,3,1,1,2], [3,1,2,1,3,1], [3,1,1,2,2,2],
            [3,2,1,1,2,2], [3,2,1,2,2,1], [3,1,2,2,1,2], [3,2,2,1,1,2], [3,2,2,2,1,1],
            [2,1,2,1,2,3], [2,1,2,3,2,1], [2,3,2,1,2,1], [1,1,1,3,2,3], [1,3,1,1,2,3],
            [1,3,1,3,2,1], [1,1,2,3,1,3], [1,3,2,1,1,3], [1,3,2,3,1,1], [2,1,1,3,1,3],
            [2,3,1,1,1,3], [2,3,1,3,1,1], [1,1,2,1,3,3], [1,1,2,3,3,1], [1,3,2,1,3,1],
            [1,1,3,1,2,3], [1,1,3,3,2,1], [1,3,3,1,2,1], [3,1,3,1,2,1], [2,1,1,3,3,1],
            [2,3,1,1,3,1], [2,1,3,1,1,3], [2,1,3,3,1,1], [2,1,3,1,3,1], [3,1,1,1,2,3],
            [3,1,1,3,2,1], [3,3,1,1,2,1], [3,1,2,1,1,3], [3,1,2,3,1,1], [3,3,2,1,1,1],
            [3,1,4,1,1,1], [2,2,1,4,1,1], [4,3,1,1,1,1], [1,1,1,2,2,4], [1,1,1,4,2,2],
            [1,2,1,1,2,4], [1,2,1,4,2,1], [1,4,1,1,2,2], [1,4,1,2,2,1], [1,1,2,2,1,4],
            [1,1,2,4,1,2], [1,2,2,1,1,4], [1,2,2,4,1,1], [1,4,2,1,1,2], [1,4,2,2,1,1],
            [2,4,1,2,1,1], [2,2,1,1,1,4], [4,1,3,1,1,1], [2,4,1,1,1,2], [1,3,4,1,1,1],
            [1,1,1,2,4,2], [1,2,1,1,4,2], [1,2,1,2,4,1], [1,1,4,2,1,2], [1,2,4,1,1,2],
            [1,2,4,2,1,1], [4,1,1,2,1,2], [4,2,1,1,1,2], [4,2,1,2,1,1], [2,1,2,1,4,1],
            [2,1,4,1,2,1], [4,1,2,1,2,1], [1,1,1,1,4,3], [1,1,1,3,4,1], [1,3,1,1,4,1],
            [1,1,4,1,1,3], [1,1,4,3,1,1], [4,1,1,1,1,3], [4,1,1,3,1,1], [1,1,3,1,4,1],
            [1,1,4,1,3,1], [3,1,1,1,4,1], [4,1,1,1,3,1], [2,1,1,4,1,2], [2,1,1,2,1,4],
            [2,1,1,2,3,2], [2,3,3,1,1,1,2],
        ];

        if ($index >= 0 && $index < count($code128Patterns)) {
            return $code128Patterns[$index];
        }
        return $code128Patterns[0];
    }

    private function getCode128Pattern(int $index): string
    {
        return '';
    }

    // ── HELPERS ────────────────────────────────────

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
}
