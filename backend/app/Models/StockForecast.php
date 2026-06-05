<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockForecast extends Model
{
    protected $fillable = [
        'inventory_item_id', 'period_days', 'predicted_quantity',
        'confidence_low', 'confidence_high', 'mape', 'forecast_date', 'target_date',
    ];

    protected $casts = [
        'period_days' => 'integer',
        'predicted_quantity' => 'integer',
        'confidence_low' => 'integer',
        'confidence_high' => 'integer',
        'mape' => 'decimal:4',
        'forecast_date' => 'date',
        'target_date' => 'date',
    ];

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function variances(): HasMany
    {
        return $this->hasMany(ForecastVariance::class, 'stock_forecast_id');
    }
}
