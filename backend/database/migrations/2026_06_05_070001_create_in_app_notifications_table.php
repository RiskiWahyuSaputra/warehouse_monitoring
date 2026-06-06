<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rename existing notifications table if it exists to in_app_notifications
        if (Schema::hasTable('notifications')) {
            Schema::rename('notifications', 'in_app_notifications');
        } elseif (!Schema::hasTable('in_app_notifications')) {
            Schema::create('in_app_notifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('type'); // low_stock, approval_request, delivery_update, system_alert
                $table->string('title');
                $table->text('message');
                $table->json('data')->nullable();
                $table->timestamp('read_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'read_at']);
                $table->index('type');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('in_app_notifications')) {
            Schema::dropIfExists('in_app_notifications');
        }
    }
};
