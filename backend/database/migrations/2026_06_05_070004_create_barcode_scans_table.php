<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barcode_scans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('inventory_item_id')->nullable()->constrained()->onDelete('set null');
            $table->string('scanned_code');
            $table->enum('action', ['stock_in', 'stock_out', 'lookup'])->default('lookup');
            $table->boolean('found')->default(true);
            $table->timestamps();
            $table->index('scanned_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barcode_scans');
    }
};
