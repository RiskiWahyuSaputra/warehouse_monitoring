<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Services\NotificationEmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ApprovalController extends Controller
{
    public function index()
    {
        $user = request()->user();
        $query = ApprovalRequest::with('requester:id,name', 'approver:id,name', 'item:id,name,sku', 'location:id,zone,rack', 'movement');

        if (!in_array($user->role->slug, ['admin', 'manager'])) {
            $query->where('requester_id', $user->id);
        }

        return response()->json(
            $query->orderByDesc('created_at')->paginate(15),
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'location_id' => 'required|exists:locations,id',
            'quantity' => 'required|integer|min:1',
            'remarks' => 'nullable|string',
        ]);

        $approval = ApprovalRequest::create([
            'requester_id' => $request->user()->id,
            'inventory_item_id' => $validated['inventory_item_id'],
            'location_id' => $validated['location_id'],
            'quantity' => $validated['quantity'],
            'remarks' => $validated['remarks'] ?? null,
            'status' => ApprovalStatus::PENDING,
        ]);

        // Send email notification to admin/manager
        try {
            app(NotificationEmailService::class)->sendApprovalNotification($approval->load('requester', 'item'));
        } catch (\Exception $e) {
            report("Failed to send approval email: " . $e->getMessage());
        }

        return response()->json($approval, Response::HTTP_CREATED);
    }

    public function decide(Request $request, ApprovalRequest $approvalRequest): JsonResponse
    {
        $validated = $request->validate([
            'decision' => 'required|in:approved,rejected',
            'remarks' => 'nullable|string',
        ]);

        DB::transaction(function () use ($request, $approvalRequest, $validated) {
            $approvalRequest->update([
                'approver_id' => $request->user()->id,
                'status' => ApprovalStatus::from($validated['decision']),
                'remarks' => $validated['remarks'] ?? $approvalRequest->remarks,
            ]);

            // Jika approved, buat movement dan kurangi stok
            if ($validated['decision'] === 'approved' && !$approvalRequest->stock_movement_id) {
                $movement = StockMovement::create([
                    'inventory_item_id' => $approvalRequest->inventory_item_id,
                    'location_id' => $approvalRequest->location_id,
                    'user_id' => $approvalRequest->requester_id,
                    'type' => 'out',
                    'quantity' => $approvalRequest->quantity,
                    'remarks' => 'Approved: ' . ($approvalRequest->remarks ?? 'Stock out'),
                ]);

                $approvalRequest->update(['stock_movement_id' => $movement->id]);

                $stockLevel = StockLevel::firstOrCreate([
                    'inventory_item_id' => $approvalRequest->inventory_item_id,
                    'location_id' => $approvalRequest->location_id,
                ]);
                $stockLevel->decrement('quantity', $approvalRequest->quantity);
            }
        });

        return response()->json($approvalRequest->fresh()->load('movement'));
    }
}
