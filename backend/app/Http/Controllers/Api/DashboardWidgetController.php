<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DashboardWidget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardWidgetController extends Controller
{
    /**
     * Get all widgets for the authenticated user.
     * If none exist, create role-specific defaults.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $widgets = DashboardWidget::where('user_id', $user->id)
            ->orderBy('position')
            ->get();

        if ($widgets->isEmpty()) {
            $widgets = $this->createDefaultsForUser($user);
        }

        return response()->json($widgets);
    }

    /**
     * Update widget positions and visibility (bulk).
     */
    public function updateLayout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'widgets' => 'required|array',
            'widgets.*.id' => 'required|integer|exists:dashboard_widgets,id',
            'widgets.*.position' => 'required|integer|min:0',
            'widgets.*.visible' => 'required|boolean',
        ]);

        $user = $request->user();

        foreach ($validated['widgets'] as $widgetData) {
            $widget = DashboardWidget::where('id', $widgetData['id'])
                ->where('user_id', $user->id)
                ->first();

            if ($widget) {
                $widget->update([
                    'position' => $widgetData['position'],
                    'visible' => $widgetData['visible'],
                ]);
            }
        }

        $widgets = DashboardWidget::where('user_id', $user->id)
            ->orderBy('position')
            ->get();

        return response()->json($widgets);
    }

    /**
     * Reset to role-specific defaults.
     */
    public function reset(Request $request): JsonResponse
    {
        $user = $request->user();
        DashboardWidget::where('user_id', $user->id)->delete();
        $widgets = $this->createDefaultsForUser($user);

        return response()->json($widgets);
    }

    /**
     * Toggle single widget visibility.
     */
    public function toggle(Request $request, DashboardWidget $widget): JsonResponse
    {
        $user = $request->user();

        if ($widget->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $widget->update(['visible' => !$widget->visible]);

        return response()->json($widget);
    }

    /**
     * Create default widgets based on user role.
     */
    private function createDefaultsForUser($user)
    {
        $roleSlug = $user->role?->slug ?? 'staff';

        $defaults = match ($roleSlug) {
            'admin' => self::adminDefaults(),
            'manager' => self::managerDefaults(),
            default => self::staffDefaults(),
        };

        $widgets = [];
        foreach ($defaults as $index => $default) {
            $widgets[] = DashboardWidget::create([
                'user_id' => $user->id,
                'widget_key' => $default['widget_key'],
                'widget_type' => $default['widget_type'],
                'title' => $default['title'],
                'position' => $index,
                'visible' => $default['visible'] ?? true,
                'meta' => $default['meta'] ?? null,
            ]);
        }

        return collect($widgets);
    }

    private static function adminDefaults(): array
    {
        return [
            ['widget_key' => 'stat_total_units', 'widget_type' => 'stat', 'title' => 'Total Units'],
            ['widget_key' => 'stat_stockout', 'widget_type' => 'stat', 'title' => 'Stockout Items'],
            ['widget_key' => 'stat_pending', 'widget_type' => 'stat', 'title' => 'Pending Approvals'],
            ['widget_key' => 'stat_warnings', 'widget_type' => 'stat', 'title' => 'Early Warnings'],
            ['widget_key' => 'chart_category', 'widget_type' => 'chart', 'title' => 'Category Distribution', 'meta' => ['chartType' => 'pie', 'size' => 'half']],
            ['widget_key' => 'chart_trends', 'widget_type' => 'chart', 'title' => '30-Day Stock Trends', 'meta' => ['chartType' => 'area', 'size' => 'half']],
            ['widget_key' => 'chart_top_moving', 'widget_type' => 'chart', 'title' => 'Top Moving Items', 'meta' => ['chartType' => 'bar', 'size' => 'full']],
            ['widget_key' => 'list_warnings', 'widget_type' => 'warning', 'title' => 'Early Stockout Warnings', 'meta' => ['maxItems' => 6, 'size' => 'full']],
        ];
    }

    private static function managerDefaults(): array
    {
        return [
            ['widget_key' => 'stat_total_units', 'widget_type' => 'stat', 'title' => 'Total Units'],
            ['widget_key' => 'stat_stockout', 'widget_type' => 'stat', 'title' => 'Stockout Items'],
            ['widget_key' => 'stat_pending', 'widget_type' => 'stat', 'title' => 'Pending Approvals'],
            ['widget_key' => 'stat_warnings', 'widget_type' => 'stat', 'title' => 'Early Warnings'],
            ['widget_key' => 'chart_category', 'widget_type' => 'chart', 'title' => 'Category Distribution', 'meta' => ['chartType' => 'pie', 'size' => 'half']],
            ['widget_key' => 'chart_trends', 'widget_type' => 'chart', 'title' => '30-Day Stock Trends', 'meta' => ['chartType' => 'area', 'size' => 'half']],
            ['widget_key' => 'chart_top_moving', 'widget_type' => 'chart', 'title' => 'Top Moving Items', 'meta' => ['chartType' => 'bar', 'size' => 'full']],
            ['widget_key' => 'list_warnings', 'widget_type' => 'warning', 'title' => 'Early Stockout Warnings', 'meta' => ['maxItems' => 6, 'size' => 'full']],
        ];
    }

    private static function staffDefaults(): array
    {
        return [
            ['widget_key' => 'stat_total_units', 'widget_type' => 'stat', 'title' => 'Total Units'],
            ['widget_key' => 'stat_stockout', 'widget_type' => 'stat', 'title' => 'Stockout Items'],
            ['widget_key' => 'stat_pending', 'widget_type' => 'stat', 'title' => 'Pending Approvals'],
            ['widget_key' => 'chart_trends', 'widget_type' => 'chart', 'title' => '30-Day Stock Trends', 'meta' => ['chartType' => 'area', 'size' => 'full']],
            ['widget_key' => 'list_warnings', 'widget_type' => 'warning', 'title' => 'Early Stockout Warnings', 'meta' => ['maxItems' => 3, 'size' => 'full']],
        ];
    }
}
