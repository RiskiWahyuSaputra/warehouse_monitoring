<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('dashboard_widgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('widget_key');       // e.g. 'stat_total_units', 'chart_category', etc.
            $table->string('widget_type');       // 'stat' | 'chart' | 'list' | 'warning'
            $table->string('title');             // display title
            $table->integer('position')->default(0); // order in layout
            $table->boolean('visible')->default(true);
            $table->json('meta')->nullable();    // extra config (chart size, etc.)
            $table->timestamps();

            $table->unique(['user_id', 'widget_key']);
            $table->index(['user_id', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dashboard_widgets');
    }
};
