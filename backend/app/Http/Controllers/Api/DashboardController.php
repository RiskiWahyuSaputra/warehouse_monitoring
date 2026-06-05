<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use App\Models\InventoryItem;
use App\Models\StockLevel;
use App\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $totalItems = InventoryItem::count();
        $stockoutItems = InventoryItem::whereDoesntHave('stockLevels', function ($q) {
            $q->where('quantity', '>', 0);
        })->count();
        $pendingApprovals = ApprovalRequest::where('status', 'pending')->count();

        return response()->json([
            'total_units' => $totalItems,
            'stockout_items' => $stockoutItems,
            'pending_approvals' => $pendingApprovals,
        ]);
    }

    public function charts(): JsonResponse
    {
        $categories = InventoryItem::select('category_id', DB::raw('count(*) as count'))
            ->with('category:id,name')
            ->groupBy('category_id')
            ->get()
            ->map(fn ($item) => [
                'name' => $item->category?->name ?? 'Uncategorized',
                'count' => $item->count,
            ]);

        $startDate = Carbon::now()->subDays(30);
        $trends = collect();
        for ($date = $startDate->copy(); $date <= Carbon::now(); $date->addDay()) {
            $dayStr = $date->format('Y-m-d');
            $trends->push([
                'date' => $dayStr,
                'in' => 0,
                'out' => 0,
            ]);
        }

        $movements = StockMovement::select(
            DB::raw('DATE(created_at) as date'),
            'type',
            DB::raw('SUM(quantity) as total'),
        )
            ->where('created_at', '>=', $startDate)
            ->groupBy(DB::raw('DATE(created_at)'), 'type')
            ->get();

        foreach ($movements as $mv) {
            $trends = $trends->map(function ($t) use ($mv) {
                if ($t['date'] === $mv->date) {
                    $t[$mv->type === 'in' ? 'in' : 'out'] = (int) $mv->total;
                }
                return $t;
            });
        }

        $topMovingItems = StockMovement::select(
            'inventory_item_id',
            'type',
            DB::raw('SUM(quantity) as total'),
        )
            ->where('type', 'out')
            ->where('created_at', '>=', $startDate)
            ->groupBy('inventory_item_id', 'type')
            ->orderByDesc('total')
            ->take(10)
            ->with('item:id,name')
            ->get()
            ->map(fn ($mv) => [
                'name' => $mv->item?->name ?? 'Unknown',
                'total_out' => (int) $mv->total,
            ]);

        return response()->json([
            'categories' => $categories,
            'trends' => $trends->values(),
            'top_moving_items' => $topMovingItems,
        ]);
    }
}
