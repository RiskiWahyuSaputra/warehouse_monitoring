<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BarcodeScan;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BarcodeController extends Controller
{
    /**
     * GET /api/inventory/items/{inventoryItem}/barcode
     * Generate/display barcode info for an item.
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
     * POST /api/barcode/scan
     * Scan a barcode and return the matching item.
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

        // Validate barcode format
        $format = $this->detectBarcodeFormat($code);
        if (!$format) {
            // Still allow scan but flag as unknown format
            $format = 'unknown';
        }

        // Lookup item by barcode
        $item = InventoryItem::with(['category', 'stockLevels.location'])
            ->where('barcode', $code)
            ->first();

        $found = $item !== null;

        // Record scan history
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
                'id'           => $item->id,
                'name'         => $item->name,
                'sku'          => $item->sku,
                'barcode'      => $item->barcode,
                'description'  => $item->description,
                'unit'         => $item->unit,
                'min_stock'    => $item->min_stock,
                'total_stock'  => $totalStock,
                'status'       => $this->stockStatus($item, $totalStock),
                'category'     => $item->category?->name,
                'locations'    => $item->stockLevels->map(fn($sl) => [
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
    public function history(Request $request): JsonResponse
    {
        $query = BarcodeScan::with(['inventoryItem:id,name,sku'])
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at');

        return response()->json($query->paginate(20));
    }

    /**
     * GET /api/barcode/lookup/{code}
     * Quick lookup by barcode (GET alternative to POST scan).
     */
    public function lookup(string $code): JsonResponse
    {
        $item = InventoryItem::with(['category', 'stockLevels.location'])
            ->where('barcode', $code)
            ->first();

        if (!$item) {
            return response()->json([
                'message' => 'Item not found.',
                'found'   => false,
            ], 404);
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

    // ── HELPERS ────────────────────────────────────

    private function detectBarcodeFormat(string $code): ?string
    {
        $len = strlen($code);

        // EAN-13: exactly 13 digits
        if ($len === 13 && ctype_digit($code)) {
            return 'EAN-13';
        }

        // EAN-8: exactly 8 digits
        if ($len === 8 && ctype_digit($code)) {
            return 'EAN-8';
        }

        // UPC-A: exactly 12 digits
        if ($len === 12 && ctype_digit($code)) {
            return 'UPC-A';
        }

        // Code 128: alphanumeric, typically 6-20 chars
        if ($len >= 4 && $len <= 48 && preg_match('/^[A-Za-z0-9\-\.\/\+\s]+$/', $code)) {
            return 'Code 128';
        }

        // QR Code data: variable length, often contains URLs or mixed content
        if ($len > 20 || preg_match('/[a-zA-Z]/', $code)) {
            return 'QR Code';
        }

        return null;
    }

    private function stockStatus(InventoryItem $item, int $totalStock): string
    {
        if ($totalStock <= 0) return 'Out of Stock';
        if ($item->min_stock > 0 && $totalStock <= $item->min_stock) return 'Low';
        return 'Available';
    }
}
