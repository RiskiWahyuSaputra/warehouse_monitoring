<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use App\Models\InventoryItem;
use App\Models\StockLevel;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class StockMovementController extends Controller
{
    public function index()
    {
        return response()->json(
            StockMovement::with('item', 'location', 'supplier', 'user')
                ->orderByDesc('created_at')
                ->paginate(15),
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'location_id' => 'required|exists:locations,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'type' => 'required|in:in,out,adjustment',
            'quantity' => 'required|integer|min:1',
            'remarks' => 'nullable|string',
        ]);

        if (empty($validated['supplier_id'])) unset($validated['supplier_id']);
        $validated['user_id'] = $request->user()->id;

        DB::transaction(function () use ($validated, $request) {
            $movement = StockMovement::create($validated);

            $stockLevel = StockLevel::firstOrCreate([
                'inventory_item_id' => $validated['inventory_item_id'],
                'location_id' => $validated['location_id'],
            ]);

            if ($validated['type'] === 'in') {
                $stockLevel->increment('quantity', $validated['quantity']);
            } elseif ($validated['type'] === 'out') {
                $stockLevel->decrement('quantity', $validated['quantity']);
            } else {
                $stockLevel->update(['quantity' => $validated['quantity']]);
            }

            // Auto-buat approval request untuk stock out
            if ($validated['type'] === 'out') {
                ApprovalRequest::create([
                    'requester_id' => $request->user()->id,
                    'inventory_item_id' => $validated['inventory_item_id'],
                    'location_id' => $validated['location_id'],
                    'quantity' => $validated['quantity'],
                    'remarks' => $validated['remarks'] ?? 'Stock out movement',
                    'status' => 'pending',
                    'stock_movement_id' => $movement->id,
                ]);
            }
        });

        return response()->json(['message' => 'Movement recorded'], Response::HTTP_CREATED);
    }

    public function batch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'movements' => 'required|array|min:1',
            'movements.*.inventory_item_id' => 'required|exists:inventory_items,id',
            'movements.*.location_id' => 'required|exists:locations,id',
            'movements.*.type' => 'required|in:in,out,adjustment',
            'movements.*.quantity' => 'required|integer|min:1',
        ]);

        $userId = $request->user()->id;

        DB::transaction(function () use ($validated, $userId) {
            foreach ($validated['movements'] as $mv) {
                $mv['user_id'] = $userId;
                StockMovement::create($mv);

                $stockLevel = StockLevel::firstOrCreate([
                    'inventory_item_id' => $mv['inventory_item_id'],
                    'location_id' => $mv['location_id'],
                ]);

                if ($mv['type'] === 'in') {
                    $stockLevel->increment('quantity', $mv['quantity']);
                } elseif ($mv['type'] === 'out') {
                    $stockLevel->decrement('quantity', $mv['quantity']);
                } else {
                    $stockLevel->update(['quantity' => $mv['quantity']]);
                }
            }
        });

        return response()->json(['message' => 'Batch movements processed'], Response::HTTP_CREATED);
    }

    public function transfer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'from_location_id' => 'required|exists:locations,id',
            'to_location_id' => 'required|exists:locations,id|different:from_location_id',
            'quantity' => 'required|integer|min:1',
            'remarks' => 'nullable|string',
        ]);

        $userId = $request->user()->id;

        DB::transaction(function () use ($validated, $userId) {
            StockMovement::create([
                'inventory_item_id' => $validated['inventory_item_id'],
                'location_id' => $validated['from_location_id'],
                'user_id' => $userId,
                'type' => 'out',
                'quantity' => $validated['quantity'],
                'remarks' => 'Transfer to ' . $validated['to_location_id'] . ($validated['remarks'] ? ': ' . $validated['remarks'] : ''),
            ]);

            StockMovement::create([
                'inventory_item_id' => $validated['inventory_item_id'],
                'location_id' => $validated['to_location_id'],
                'user_id' => $userId,
                'type' => 'in',
                'quantity' => $validated['quantity'],
                'remarks' => 'Transfer from ' . $validated['from_location_id'] . ($validated['remarks'] ? ': ' . $validated['remarks'] : ''),
            ]);

            $fromStock = StockLevel::firstOrCreate([
                'inventory_item_id' => $validated['inventory_item_id'],
                'location_id' => $validated['from_location_id'],
            ]);
            $fromStock->decrement('quantity', $validated['quantity']);

            $toStock = StockLevel::firstOrCreate([
                'inventory_item_id' => $validated['inventory_item_id'],
                'location_id' => $validated['to_location_id'],
            ]);
            $toStock->increment('quantity', $validated['quantity']);
        });

        return response()->json(['message' => 'Transfer completed'], Response::HTTP_CREATED);
    }
}
