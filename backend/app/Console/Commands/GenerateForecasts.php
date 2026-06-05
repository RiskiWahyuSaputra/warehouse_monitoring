<?php

namespace App\Console\Commands;

use App\Services\ForecastingService;
use Illuminate\Console\Command;

class GenerateForecasts extends Command
{
    protected $signature = 'forecasts:generate';
    protected $description = 'Generate stock forecasts for all inventory items and record variances.';

    public function handle(ForecastingService $forecasting): int
    {
        $this->info('Recording forecast variances...');
        $varCount = $forecasting->recordVariances();
        $this->info("Recorded {$varCount} variances.");

        $this->info('Generating new forecasts...');
        $results = $forecasting->generateAllForecasts();
        $total = collect($results)->flatten(1)->count();
        $this->info("Generated {$total} forecasts for " . count($results) . ' items.');

        // Check early warnings
        $warnings = $forecasting->getEarlyWarnings();
        if ($warnings->isNotEmpty()) {
            $this->warn("{$warnings->count()} items predicted to stockout within 7 days!");
            foreach ($warnings->take(5) as $w) {
                $this->warn("  - {$w['item']->name}: {$w['current_stock']} stock, predicted {$w['predicted_consumption_7d']} consumption in 7 days");
            }
        }

        return self::SUCCESS;
    }
}
