<?php

namespace App\Models;

use App\Enums\ApprovalStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'requester_id', 'approver_id', 'inventory_item_id',
        'location_id', 'quantity', 'status', 'remarks', 'stock_movement_id',
    ];

    protected $casts = [
        'status' => ApprovalStatus::class,
        'quantity' => 'integer',
    ];

    public function requester(): BelongsTo { return $this->belongsTo(User::class, 'requester_id'); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approver_id'); }
    public function item(): BelongsTo { return $this->belongsTo(InventoryItem::class, 'inventory_item_id')->withTrashed(); }
    public function location(): BelongsTo { return $this->belongsTo(Location::class); }
    public function movement(): BelongsTo { return $this->belongsTo(StockMovement::class, 'stock_movement_id'); }
}
