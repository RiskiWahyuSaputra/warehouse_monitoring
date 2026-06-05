<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_forecasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained()->onDelete('cascade');
            $table->tinyInteger('period_days');
            $table->integer('predicted_quantity');
            $table->integer('confidence_low');
            $table->integer('confidence_high');
            $table->decimal('mape', 8, 4)->nullable();
            $table->date('forecast_date');
            $table->date('target_date');
            $table->timestamps();
            $table->index(['inventory_item_id', 'period_days', 'forecast_date'], 'sf_inv_period_date_idx');
        });

        Schema::create('forecast_variances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_forecast_id')->constrained()->onDelete('cascade');
            $table->integer('actual_quantity');
            $table->integer('variance');
            $table->decimal('variance_percentage', 8, 4);
            $table->date('recorded_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forecast_variances');
        Schema::dropIfExists('stock_forecasts');
    }
};
