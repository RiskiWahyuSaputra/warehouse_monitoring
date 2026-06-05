<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\StockForecast;
use App\Models\StockMovement;
use App\Models\ForecastVariance;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ForecastingService
{
    /**
     * Generate forecasts for all active inventory items.
     */
    public function generateAllForecasts(): array
    {
        $items = InventoryItem::whereHas('stockLevels')->get();
        $results = [];

        foreach ($items as $item) {
            $results[$item->id] = $this->generateItemForecasts($item);
        }

        return $results;
    }

    /**
     * Generate 7, 14, 30 day forecasts for a single item.
     */
    public function generateItemForecasts(InventoryItem $item): array
    {
        $dailyConsumption = $this->getDailyConsumption($item);
        $forecasts = [];

        foreach ([7, 14, 30] as $period) {
            $forecast = $this->predict($item, $dailyConsumption, $period);
            if ($forecast) {
                $forecasts[$period] = $forecast;
            }
        }

        return $forecasts;
    }

    /**
     * Get daily consumption data for an item (last 90 days).
     * Returns collection of ['date' => 'Y-m-d', 'out' => int]
     */
    public function getDailyConsumption(InventoryItem $item): Collection
    {
        $startDate = Carbon::now()->subDays(90)->startOfDay();

        $movements = StockMovement::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(quantity) as total_out')
            )
            ->where('inventory_item_id', $item->id)
            ->where('type', 'out')
            ->where('created_at', '>=', $startDate)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        // Fill in missing dates with 0
        $result = collect();
        $current = $startDate->copy();
        $end = Carbon::now()->endOfDay();

        while ($current <= $end) {
            $dateStr = $current->format('Y-m-d');
            $result->push([
                'date' => $dateStr,
                'out' => (int) ($movements[$dateStr]->total_out ?? 0),
            ]);
            $current->addDay();
        }

        return $result;
    }

    /**
     * Predict stock requirement for a given period using
     * weighted moving average with trend and seasonal adjustment.
     */
    public function predict(InventoryItem $item, Collection $dailyData, int $period): ?StockForecast
    {
        $outData = $dailyData->pluck('out')->toArray();

        if (count($outData) < 7) {
            Log::info("Insufficient data for item {$item->id}, skipping forecast");
            return null;
        }

        // Calculate weighted moving average (more recent = higher weight)
        $wma = $this->weightedMovingAverage($outData, min(14, count($outData)));

        // Calculate trend (slope of last 14 days vs previous 14 days)
        $trend = $this->calculateTrend($outData);

        // Calculate seasonal factor (day-of-week pattern)
        $seasonal = $this->calculateSeasonalFactor($outData);

        // Base prediction = WMA * period
        $basePrediction = $wma * $period;

        // Apply trend adjustment
        $trendAdjustment = $trend * $period * 0.5; // dampened trend

        // Apply seasonal adjustment for the target period
        $seasonalFactor = $this->getSeasonalFactorForPeriod($seasonal, $period);
        $seasonalAdjustment = $basePrediction * ($seasonalFactor - 1);

        $predicted = max(0, (int) round($basePrediction + $trendAdjustment + $seasonalAdjustment));

        // Confidence interval based on data variance
        $stdDev = $this->standardDeviation($outData);
        $margin = (int) round($stdDev * sqrt($period) * 1.96); // 95% confidence
        $confidenceLow = max(0, $predicted - $margin);
        $confidenceHigh = $predicted + $margin;

        // Calculate MAPE from backtesting
        $mape = $this->calculateMAPE($outData, $period);

        // Save forecast
        $forecast = StockForecast::create([
            'inventory_item_id' => $item->id,
            'period_days' => $period,
            'predicted_quantity' => $predicted,
            'confidence_low' => $confidenceLow,
            'confidence_high' => $confidenceHigh,
            'mape' => $mape,
            'forecast_date' => Carbon::now()->toDateString(),
            'target_date' => Carbon::now()->addDays($period)->toDateString(),
        ]);

        return $forecast;
    }

    /**
     * Weighted Moving Average — recent data has more weight.
     */
    private function weightedMovingAverage(array $data, int $window): float
    {
        $slice = array_slice($data, -$window);
        $n = count($slice);
        if ($n === 0) return 0;

        $weightedSum = 0;
        $weightTotal = 0;

        for ($i = 0; $i < $n; $i++) {
            $weight = $i + 1; // linear weight increase
            $weightedSum += $slice[$i] * $weight;
            $weightTotal += $weight;
        }

        return $weightTotal > 0 ? $weightedSum / $weightTotal : 0;
    }

    /**
     * Calculate trend: difference between recent and older averages.
     */
    private function calculateTrend(array $data): float
    {
        $n = count($data);
        if ($n < 14) return 0;

        $recent = array_slice($data, -7);
        $older = array_slice($data, -14, 7);

        $recentAvg = array_sum($recent) / count($recent);
        $olderAvg = array_sum($older) / count($older);

        return $recentAvg - $olderAvg; // positive = increasing consumption
    }

    /**
     * Calculate day-of-week seasonal factors.
     */
    private function calculateSeasonalFactor(array $data): array
    {
        $dayTotals = array_fill(0, 7, ['sum' => 0, 'count' => 0]);

        foreach ($data as $i => $value) {
            $dayOfWeek = $i % 7;
            $dayTotals[$dayOfWeek]['sum'] += $value;
            $dayTotals[$dayOfWeek]['count']++;
        }

        $overallAvg = array_sum($data) / max(1, count($data));
        $factors = [];

        for ($d = 0; $d < 7; $d++) {
            $dayAvg = $dayTotals[$d]['count'] > 0
                ? $dayTotals[$d]['sum'] / $dayTotals[$d]['count']
                : $overallAvg;
            $factors[$d] = $overallAvg > 0 ? $dayAvg / $overallAvg : 1;
        }

        return $factors;
    }

    /**
     * Get average seasonal factor for a future period.
     */
    private function getSeasonalFactorForPeriod(array $seasonal, int $period): float
    {
        $today = (int) Carbon::now()->format('w'); // 0=Sunday
        $sum = 0;

        for ($i = 0; $i < $period; $i++) {
            $dayIndex = ($today + $i) % 7;
            $sum += $seasonal[$dayIndex] ?? 1;
        }

        return $period > 0 ? $sum / $period : 1;
    }

    /**
     * Calculate MAPE (Mean Absolute Percentage Error) via backtesting.
     */
    private function calculateMAPE(array $data, int $period): ?float
    {
        $n = count($data);
        if ($n < $period * 2) return null;

        // Use last $period days as test, predict from prior data
        $testData = array_slice($data, -$period);
        $trainData = array_slice($data, 0, -$period);

        if (count($trainData) < 7) return null;

        $wma = $this->weightedMovingAverage($trainData, min(14, count($trainData)));
        $predicted = $wma; // daily prediction

        $totalError = 0;
        $validCount = 0;

        foreach ($testData as $actual) {
            if ($actual > 0 || $predicted > 0) {
                $totalError += abs($actual - $predicted) / max(1, $actual);
                $validCount++;
            }
        }

        return $validCount > 0 ? round(($totalError / $validCount) * 100, 4) : null;
    }

    /**
     * Standard deviation.
     */
    private function standardDeviation(array $data): float
    {
        $n = count($data);
        if ($n < 2) return 0;

        $mean = array_sum($data) / $n;
        $variance = 0;

        foreach ($data as $value) {
            $variance += pow($value - $mean, 2);
        }

        return sqrt($variance / ($n - 1));
    }

    /**
     * Record actual vs predicted variance for completed forecasts.
     */
    public function recordVariances(): int
    {
        $expiredForecasts = StockForecast::where('target_date', '<', Carbon::now()->toDateString())
            ->whereDoesntHave('variances')
            ->with('inventoryItem')
            ->get();

        $count = 0;

        foreach ($expiredForecasts as $forecast) {
            $actual = StockMovement::where('inventory_item_id', $forecast->inventory_item_id)
                ->where('type', 'out')
                ->whereBetween('created_at', [
                    $forecast->forecast_date . ' 00:00:00',
                    $forecast->target_date . ' 23:59:59',
                ])
                ->sum('quantity');

            $variance = $actual - $forecast->predicted_quantity;
            $variancePct = $forecast->predicted_quantity > 0
                ? round(($variance / $forecast->predicted_quantity) * 100, 4)
                : 0;

            ForecastVariance::create([
                'stock_forecast_id' => $forecast->id,
                'actual_quantity' => $actual,
                'variance' => $variance,
                'variance_percentage' => $variancePct,
                'recorded_date' => $forecast->target_date,
            ]);

            $count++;
        }

        return $count;
    }

    /**
     * Get early warning items: forecast predicts stockout within 7 days.
     */
    public function getEarlyWarnings(): Collection
    {
        $warnings = collect();

        $items = InventoryItem::where('min_stock', '>', 0)
            ->with(['stockLevels', 'stockForecasts' => function ($q) {
                $q->where('period_days', 7)
                  ->where('forecast_date', '>=', Carbon::now()->subDays(3)->toDateString())
                  ->orderByDesc('forecast_date');
            }])
            ->get();

        foreach ($items as $item) {
            $totalStock = $item->stockLevels->sum('quantity');
            $latestForecast = $item->stockForecasts->first();

            if ($latestForecast && $latestForecast->predicted_quantity >= $totalStock) {
                $warnings->push([
                    'item' => $item,
                    'current_stock' => $totalStock,
                    'predicted_consumption_7d' => $latestForecast->predicted_quantity,
                    'min_stock' => $item->min_stock,
                    'days_until_stockout' => $latestForecast->predicted_quantity > 0
                        ? max(1, (int) floor($totalStock / ($latestForecast->predicted_quantity / 7)))
                        : 999,
                ]);
            }
        }

        return $warnings->sortBy('days_until_stockout');
    }
}
