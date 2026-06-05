<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

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

        return response()->json($approval, Response::HTTP_CREATED);
    }

    public function decide(Request $request, ApprovalRequest $approvalRequest): JsonResponse
    {
        $validated = $request->validate([
            'decision' => 'required|in:approved,rejected',
            'remarks' => 'nullable|string',
        ]);

        $approvalRequest->update([
            'approver_id' => $request->user()->id,
            'status' => ApprovalStatus::from($validated['decision']),
            'remarks' => $validated['remarks'] ?? $approvalRequest->remarks,
        ]);

        return response()->json($approvalRequest);
    }
}
