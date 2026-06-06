<?php

namespace App\Console\Commands;

use App\Models\InventoryItem;
use App\Models\NotificationInApp;
use App\Models\NotificationPreference;
use App\Models\StockForecast;
use App\Models\User;
use App\Notifications\LowStockNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckLowStock extends Command
{
    protected $signature = 'inventory:check-low-stock';
    protected $description = 'Check for items below minimum stock and send notifications.';

    public function handle(): int
    {
        $this->info('Checking low stock items...');

        $items = InventoryItem::with('stockLevels')
            ->where('min_stock', '>', 0)
            ->get();

        $lowStockCount = 0;
        $notifiedUsers = 0;

        foreach ($items as $item) {
            $totalStock = $item->stockLevels->sum('quantity');

            // Check if stock is at or below minimum
            if ($totalStock > $item->min_stock) {
                continue;
            }

            $lowStockCount++;

            // Check forecast for early warning
            $forecast = StockForecast::where('inventory_item_id', $item->id)
                ->where('period_days', 7)
                ->where('forecast_date', '>=', Carbon::now()->subDays(3)->toDateString())
                ->orderByDesc('forecast_date')
                ->first();

            $daysLeft = null;
            if ($forecast && $forecast->predicted_quantity > 0) {
                $daysLeft = max(1, (int) floor($totalStock / ($forecast->predicted_quantity / 7)));
            }

            // Build notification message
            $statusLabel = $totalStock <= 0 ? 'OUT OF STOCK' : 'LOW STOCK';
            $daysText = $daysLeft ? " (~{$daysLeft} days left)" : '';
            $message = "{$statusLabel}: {$item->name} (SKU: {$item->sku}) - Current: {$totalStock}, Min: {$item->min_stock}{$daysText}";

            // Get users who want low_stock notifications
            $userIds = NotificationPreference::where('type', 'low_stock')
                ->where('enabled', true)
                ->whereIn('channel', ['in_app', 'email'])
                ->pluck('user_id')
                ->unique();

            $users = User::whereIn('id', $userIds)->get();

            foreach ($users as $user) {
                $pref = NotificationPreference::where('user_id', $user->id)
                    ->where('type', 'low_stock')
                    ->where('enabled', true)
                    ->first();

                if (!$pref) {
                    continue;
                }

                // In-app notification
                if ($pref->channel === 'in_app') {
                    // Don't duplicate: check if unread notification already exists
                    $exists = NotificationInApp::where('user_id', $user->id)
                        ->where('type', 'low_stock')
                        ->whereNull('read_at')
                        ->where('data->item_id', $item->id)
                        ->exists();

                    if (!$exists) {
                        NotificationInApp::create([
                            'user_id' => $user->id,
                            'type'    => 'low_stock',
                            'title'   => "{$statusLabel}: {$item->name}",
                            'message' => $message,
                            'data'    => [
                                'item_id'    => $item->id,
                                'item_name'  => $item->name,
                                'item_sku'   => $item->sku,
                                'stock'      => $totalStock,
                                'min_stock'  => $item->min_stock,
                                'days_left'  => $daysLeft,
                            ],
                        ]);
                    }
                }

                // Email notification
                if ($pref->channel === 'email') {
                    try {
                        $user->notify(new LowStockNotification(
                            title: "{$statusLabel}: {$item->name}",
                            message: $message,
                            data: [
                                'item_id'   => $item->id,
                                'item_name' => $item->name,
                                'stock'     => $totalStock,
                                'min_stock' => $item->min_stock,
                            ],
                        ));
                    } catch (\Exception $e) {
                        Log::warning("Failed to send low stock email to user {$user->id}: " . $e->getMessage());
                    }
                }

                $notifiedUsers++;
            }
        }

        $this->info("Found {$lowStockCount} low stock items. Sent {$notifiedUsers} notifications.");

        if ($lowStockCount > 0) {
            $this->warn("Low stock items:");
            foreach ($items as $item) {
                $totalStock = $item->stockLevels->sum('quantity');
                if ($totalStock <= $item->min_stock) {
                    $this->warn("  - {$item->name}: {$totalStock} / min {$item->min_stock}");
                }
            }
        }

        return self::SUCCESS;
    }
}
