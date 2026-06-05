<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'name',
        'sku',
        'barcode',
        'description',
        'min_stock',
        'unit',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
