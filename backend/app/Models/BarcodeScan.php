<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BarcodeScan extends Model
{
    protected $fillable = ['user_id', 'inventory_item_id', 'scanned_code', 'action', 'found'];
    protected $casts = ['found' => 'boolean'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function inventoryItem(): BelongsTo { return $this->belongsTo(InventoryItem::class); }
}
