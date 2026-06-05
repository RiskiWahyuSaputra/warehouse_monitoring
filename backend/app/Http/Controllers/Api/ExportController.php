<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;

class ExportController extends Controller
{
    public function stockReport()
    {
        $items = InventoryItem::with('category', 'stockLevels.location')->get();

        $data = $items->map(fn ($item) => [
            'name' => $item->name,
            'sku' => $item->sku,
            'category' => $item->category?->name,
            'total_stock' => $item->stockLevels->sum('quantity'),
            'min_stock' => $item->min_stock,
            'locations' => $item->stockLevels->map(fn ($sl) => [
                'zone' => $sl->location?->zone,
                'rack' => $sl->location?->rack,
                'quantity' => $sl->quantity,
            ]),
        ]);

        return response()->json($data);
    }
}
