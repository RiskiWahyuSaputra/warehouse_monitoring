<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\StockForecast;
use App\Services\ForecastingService;
use Illuminate\Http\Request;

class ForecastController extends Controller
{
    public function __construct(private ForecastingService $forecasting)
    {
    }

    /**
     * GET /api/forecasts — List forecasts with filters.
     */
    public function index(Request $request)
    {
        $query = StockForecast::with('inventoryItem.category');

        if ($request->filled('item_id')) {
            $query->where('inventory_item_id', $request->item_id);
        }

        if ($request->filled('period')) {
            $query->where('period_days', (int) $request->period);
        }

        if ($request->filled('from_date')) {
            $query->where('forecast_date', '>=', $request->from_date);
        }

        // Get latest forecast per item
        if ($request->boolean('latest', true)) {
            $query->whereIn('id', function ($sub) {
                $sub->selectRaw('MAX(id)')
                    ->from('stock_forecasts')
                    ->groupBy('inventory_item_id', 'period_days');
            });
        }

        return response()->json($query->orderByDesc('forecast_date')->paginate(15));
    }

    /**
     * GET /api/forecasts/{item} — Get forecasts for specific item.
     */
    public function show(InventoryItem $inventoryItem)
    {
        $forecasts = StockForecast::where('inventory_item_id', $inventoryItem->id)
            ->orderByDesc('forecast_date')
            ->get()
            ->groupBy('period_days');

        return response()->json([
            'item' => $inventoryItem->load('category', 'stockLevels.location'),
            'current_total_stock' => $inventoryItem->stockLevels->sum('quantity'),
            'forecasts' => $forecasts,
        ]);
    }

    /**
     * POST /api/forecasts/generate — Trigger forecast generation (Manager/Admin).
     */
    public function generate(Request $request)
    {
        $results = $this->forecasting->generateAllForecasts();

        $total = collect($results)->flatten(1)->count();

        return response()->json([
            'message' => "Generated {$total} forecasts for " . count($results) . " items.",
            'item_count' => count($results),
            'forecast_count' => $total,
        ]);
    }

    /**
     * GET /api/forecasts/early-warnings — Items predicted to stockout within 7 days.
     */
    public function earlyWarnings()
    {
        $warnings = $this->forecasting->getEarlyWarnings();

        return response()->json([
            'count' => $warnings->count(),
            'warnings' => $warnings->values(),
        ]);
    }

    /**
     * POST /api/forecasts/record-variances — Record actual vs predicted (scheduled).
     */
    public function recordVariances()
    {
        $count = $this->forecasting->recordVariances();

        return response()->json([
            'message' => "Recorded {$count} forecast variances.",
            'count' => $count,
        ]);
    }
}
