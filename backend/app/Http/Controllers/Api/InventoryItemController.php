<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InventoryItemController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = InventoryItem::with('category', 'stockLevels.location');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('sku', 'like', "%{$s}%")
                  ->orWhere('barcode', 'like', "%{$s}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('stock_status')) {
            $status = $request->stock_status;
            if ($status === 'out') {
                $query->whereDoesntHave('stockLevels', fn ($q) => $q->where('quantity', '>', 0));
            } elseif ($status === 'low') {
                $query->where('min_stock', '>', 0)
                    ->whereIn('id', function ($q) {
                        $q->select('inventory_item_id')
                          ->from('stock_levels')
                          ->groupBy('inventory_item_id')
                          ->havingRaw('COALESCE(SUM(quantity), 0) <= (SELECT min_stock FROM inventory_items WHERE id = stock_levels.inventory_item_id)');
                    });
            } elseif ($status === 'available') {
                $query->whereHas('stockLevels', fn ($q) => $q->where('quantity', '>', 0));
            }
        }

        return response()->json($query->orderByDesc('id')->paginate(15));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'sku' => 'required|string|max:100|unique:inventory_items',
            'barcode' => 'required|string|max:100|unique:inventory_items',
            'description' => 'nullable|string',
            'min_stock' => 'nullable|integer|min:0',
            'unit' => 'required|string|max:20',
            'initial_stock' => 'nullable|integer|min:0',
            'location_id' => 'nullable|exists:locations,id',
        ]);

        $item = InventoryItem::create([
            'category_id' => $validated['category_id'],
            'name' => $validated['name'],
            'sku' => $validated['sku'],
            'barcode' => $validated['barcode'],
            'description' => $validated['description'] ?? null,
            'min_stock' => $validated['min_stock'] ?? 0,
            'unit' => $validated['unit'],
        ]);

        if (($validated['initial_stock'] ?? 0) > 0 && !empty($validated['location_id'])) {
            $item->stockLevels()->create([
                'location_id' => $validated['location_id'],
                'quantity' => $validated['initial_stock'],
                'reserved_quantity' => 0,
            ]);
        }

        return response()->json($item->load('category', 'stockLevels.location'), Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    public function show(InventoryItem $inventoryItem)
    {
        return response()->json($inventoryItem->load('category'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, InventoryItem $inventoryItem)
    {
        $validated = $request->validate([
            'category_id' => 'sometimes|required|exists:categories,id',
            'name' => 'sometimes|required|string|max:255',
            'sku' => 'sometimes|required|string|max:100|unique:inventory_items,sku,' . $inventoryItem->id,
            'barcode' => 'sometimes|required|string|max:100|unique:inventory_items,barcode,' . $inventoryItem->id,
            'description' => 'nullable|string',
            'min_stock' => 'nullable|integer|min:0',
            'unit' => 'sometimes|required|string|max:20',
            'initial_stock' => 'nullable|integer|min:0',
            'location_id' => 'nullable|exists:locations,id',
        ]);

        $inventoryItem->update($validated);

        if ($request->hasAny(['initial_stock', 'location_id']) && !empty($validated['location_id'])) {
            $stockLevel = $inventoryItem->stockLevels()
                ->where('location_id', $validated['location_id'])
                ->first();

            if ($stockLevel) {
                $stockLevel->update(['quantity' => $validated['initial_stock'] ?? 0]);
            } elseif (($validated['initial_stock'] ?? 0) > 0) {
                $inventoryItem->stockLevels()->create([
                    'location_id' => $validated['location_id'],
                    'quantity' => $validated['initial_stock'],
                    'reserved_quantity' => 0,
                ]);
            }
        }

        return response()->json($inventoryItem->load('category', 'stockLevels.location'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(InventoryItem $inventoryItem)
    {
        $inventoryItem->delete();

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
