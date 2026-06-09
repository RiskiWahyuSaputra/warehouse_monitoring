<?php

namespace App\Services;

use App\Mail\LowStockAlert;
use App\Mail\ApprovalRequestNotification;
use App\Mail\DailySummary;
use App\Models\InventoryItem;
use App\Models\StockMovement;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class NotificationEmailService
{
    public function sendLowStockAlert(): int
    {
        $items = InventoryItem::where('min_stock', '>', 0)
            ->with('stockLevels')
            ->get()
            ->filter(function ($item) {
                $total = $item->stockLevels->sum('quantity');
                return $total <= $item->min_stock;
            })
            ->values();

        if ($items->isEmpty()) {
            return 0;
        }

        $recipients = $this->getAdminRecipients();
        if ($recipients->isEmpty()) {
            return 0;
        }

        $emailItems = $items->map(function ($item) {
            return [
                'item' => $item,
                'current_stock' => $item->stockLevels->sum('quantity'),
                'min_stock' => $item->min_stock,
            ];
        })->all();

        $sent = 0;
        foreach ($recipients as $user) {
            try {
                Mail::to($user->email)->queue(new LowStockAlert($emailItems, $user->name));
                $sent++;
            } catch (\Exception $e) {
                report("Failed to send low stock email to {$user->email}: " . $e->getMessage());
            }
        }

        return $sent;
    }

    public function sendApprovalNotification(\App\Models\ApprovalRequest $approval): int
    {
        $recipients = $this->getAdminRecipients()
            ->reject(function ($u) use ($approval) {
                return $u->id === $approval->requester_id;
            });

        if ($recipients->isEmpty()) {
            return 0;
        }

        $sent = 0;
        foreach ($recipients as $user) {
            try {
                Mail::to($user->email)->queue(new ApprovalRequestNotification($approval, $user->name));
                $sent++;
            } catch (\Exception $e) {
                report("Failed to send approval email to {$user->email}: " . $e->getMessage());
            }
        }

        return $sent;
    }

    public function sendDailySummary(): int
    {
        $recipients = $this->getAdminRecipients();
        if ($recipients->isEmpty()) {
            return 0;
        }

        $stats = $this->gatherSummaryStats();
        $topMoving = $this->getTopMovingItems(5);

        $sent = 0;
        foreach ($recipients as $user) {
            try {
                Mail::to($user->email)->queue(new DailySummary(
                    $user->name,
                    $stats,
                    'Daily',
                    $topMoving
                ));
                $sent++;
            } catch (\Exception $e) {
                report("Failed to send daily summary to {$user->email}: " . $e->getMessage());
            }
        }

        return $sent;
    }

    public function sendWeeklySummary(): int
    {
        $recipients = $this->getAdminRecipients();
        if ($recipients->isEmpty()) {
            return 0;
        }

        $stats = $this->gatherSummaryStats(7);
        $topMoving = $this->getTopMovingItems(10);

        $sent = 0;
        foreach ($recipients as $user) {
            try {
                Mail::to($user->email)->queue(new DailySummary(
                    $user->name,
                    $stats,
                    'Weekly',
                    $topMoving
                ));
                $sent++;
            } catch (\Exception $e) {
                report("Failed to send weekly summary to {$user->email}: " . $e->getMessage());
            }
        }

        return $sent;
    }

    private function getAdminRecipients()
    {
        return User::whereHas('role', function ($q) {
            $q->whereIn('slug', ['admin', 'manager']);
        })
            ->whereNotNull('email')
            ->get();
    }

    private function gatherSummaryStats(int $days = 1): array
    {
        $startDate = Carbon::now()->subDays($days);

        $totalItems = InventoryItem::count();
        $stockoutItems = InventoryItem::whereDoesntHave('stockLevels', function ($q) {
            $q->where('quantity', '>', 0);
        })->count();

        $lowStockItems = InventoryItem::where('min_stock', '>', 0)
            ->with('stockLevels')
            ->get()
            ->filter(function ($i) {
                return $i->stockLevels->sum('quantity') <= $i->min_stock;
            })
            ->count();

        $pendingApprovals = \App\Models\ApprovalRequest::where('status', 'pending')->count();

        $todayInQuery = StockMovement::where('type', 'in');
        if ($days === 1) {
            $todayInQuery->whereDate('created_at', Carbon::today());
        } else {
            $todayInQuery->where('created_at', '>=', $startDate);
        }
        $todayIn = $todayInQuery->sum('quantity');

        $todayOutQuery = StockMovement::where('type', 'out');
        if ($days === 1) {
            $todayOutQuery->whereDate('created_at', Carbon::today());
        } else {
            $todayOutQuery->where('created_at', '>=', $startDate);
        }
        $todayOut = $todayOutQuery->sum('quantity');

        return [
            'total_items' => $totalItems,
            'stockout_items' => $stockoutItems,
            'low_stock_items' => $lowStockItems,
            'pending_approvals' => $pendingApprovals,
            'today_in' => (int) $todayIn,
            'today_out' => (int) $todayOut,
        ];
    }

    private function getTopMovingItems(int $limit = 5): array
    {
        return StockMovement::select('inventory_item_id', DB::raw('SUM(quantity) as total_out'))
            ->where('type', 'out')
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->groupBy('inventory_item_id')
            ->orderByDesc('total_out')
            ->take($limit)
            ->with('item:id,name')
            ->get()
            ->map(function ($m) {
                return ['name' => $m->item?->name ?? 'Unknown', 'total_out' => (int) $m->total_out];
            })
            ->all();
    }
}
