<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ForecastVariance extends Model
{
    protected $fillable = [
        'stock_forecast_id', 'actual_quantity', 'variance', 'variance_percentage', 'recorded_date',
    ];

    protected $casts = [
        'actual_quantity' => 'integer',
        'variance' => 'integer',
        'variance_percentage' => 'decimal:4',
        'recorded_date' => 'date',
    ];

    public function stockForecast(): BelongsTo
    {
        return $this->belongsTo(StockForecast::class, 'stock_forecast_id');
    }
}
