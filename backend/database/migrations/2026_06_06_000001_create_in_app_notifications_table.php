<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rename old Laravel default notifications table to backup
        if (Schema::hasTable('notifications')) {
            Schema::rename('notifications', 'notifications_old_backup');
        }

        // Create our custom in_app_notifications table
        if (!Schema::hasTable('in_app_notifications')) {
            Schema::create('in_app_notifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('type');
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
        Schema::dropIfExists('in_app_notifications');
        if (Schema::hasTable('notifications_old_backup')) {
            Schema::rename('notifications_old_backup', 'notifications');
        }
    }
};
