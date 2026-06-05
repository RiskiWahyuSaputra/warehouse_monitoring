<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierDelivery extends Model
{
    protected $fillable = [
        'supplier_id', 'stock_movement_id', 'order_date',
        'expected_delivery_date', 'actual_delivery_date', 'status', 'quality_rating', 'notes',
    ];

    protected $casts = [
        'order_date' => 'date',
        'expected_delivery_date' => 'date',
        'actual_delivery_date' => 'date',
        'quality_rating' => 'integer',
    ];

    public function supplier(): BelongsTo { return $this->belongsTo(Supplier::class); }
    public function stockMovement(): BelongsTo { return $this->belongsTo(StockMovement::class); }
}
