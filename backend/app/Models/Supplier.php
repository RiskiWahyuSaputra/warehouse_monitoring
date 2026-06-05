<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'contact_person', 'email', 'phone', 'address', 'performance_score',
    ];

    protected $casts = ['performance_score' => 'decimal:2'];

    public function deliveries(): HasMany
    {
        return $this->hasMany(SupplierDelivery::class);
    }
}
