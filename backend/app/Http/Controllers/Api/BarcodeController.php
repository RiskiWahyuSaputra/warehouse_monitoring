<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;

class BarcodeController extends Controller
{
    public function generate(InventoryItem $inventoryItem)
    {
        return response()->json([
            'item' => $inventoryItem,
            'barcode' => $inventoryItem->barcode,
            'url' => url('/api/barcode/' . $inventoryItem->barcode),
        ]);
    }
}
