<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\StockForecast;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ExportController extends Controller
{
    // ── STOCK REPORTS ──────────────────────────────

    public function stockReport(Request $request)
    {
        $items = InventoryItem::with('category', 'stockLevels.location')
            ->when($request->filled('category_id'), fn($q) => $q->where('category_id', $request->category_id))
            ->when($request->filled('stock_status'), function ($q) use ($request) {
                $status = $request->stock_status;
                if ($status === 'out') {
                    $q->whereDoesntHave('stockLevels', fn($sq) => $sq->where('quantity', '>', 0));
                } elseif ($status === 'low') {
                    $q->where('min_stock', '>', 0)
                        ->whereIn('id', function ($sq) {
                            $sq->select('inventory_item_id')
                                ->from('stock_levels')
                                ->groupBy('inventory_item_id')
                                ->havingRaw('COALESCE(SUM(quantity), 0) <= (SELECT min_stock FROM inventory_items WHERE id = stock_levels.inventory_item_id)');
                        });
                } elseif ($status === 'available') {
                    $q->whereHas('stockLevels', fn($sq) => $sq->where('quantity', '>', 0));
                }
            })
            ->get();

        $data = $items->map(fn($item) => [
            'name'        => $item->name,
            'sku'         => $item->sku,
            'barcode'     => $item->barcode,
            'category'    => $item->category?->name ?? '-',
            'unit'        => $item->unit,
            'total_stock' => $item->stockLevels->sum('quantity'),
            'min_stock'   => $item->min_stock,
            'status'      => $this->stockStatus($item),
            'locations'   => $item->stockLevels->map(fn($sl) => ($sl->location?->zone ?? '-') . '-' . ($sl->location?->rack ?? '-') . ':' . ($sl->location?->bin ?? '-') . ' = ' . $sl->quantity)->implode(', '),
        ]);

        return response()->json($data);
    }

    public function stockExcel(Request $request)
    {
        $items = InventoryItem::with('category', 'stockLevels.location')
            ->when($request->filled('category_id'), fn($q) => $q->where('category_id', $request->category_id))
            ->get();

        $headers = ['Name', 'SKU', 'Barcode', 'Category', 'Unit', 'Total Stock', 'Min Stock', 'Status', 'Locations'];
        $rows = $items->map(fn($item) => [
            $item->name,
            $item->sku,
            $item->barcode,
            $item->category?->name ?? '-',
            $item->unit,
            $item->stockLevels->sum('quantity'),
            $item->min_stock,
            $this->stockStatus($item),
            $item->stockLevels->map(fn($sl) => ($sl->location?->zone ?? '-') . '-' . ($sl->location?->rack ?? '-') . ':' . ($sl->location?->bin ?? '-') . ' = ' . $sl->quantity)->implode('; '),
        ]);

        return $this->generateCsv('stock_report', $headers, $rows);
    }

    public function stockPdf(Request $request)
    {
        $items = InventoryItem::with('category', 'stockLevels.location')
            ->when($request->filled('category_id'), fn($q) => $q->where('category_id', $request->category_id))
            ->get();

        $title = 'Stock Report';
        $generatedAt = Carbon::now()->format('d M Y H:i');
        $headers = ['Name', 'SKU', 'Category', 'Unit', 'Total', 'Min', 'Status', 'Locations'];
        $rows = $items->map(fn($item) => [
            $item->name,
            $item->sku,
            $item->category?->name ?? '-',
            $item->unit,
            $item->stockLevels->sum('quantity'),
            $item->min_stock,
            $this->stockStatus($item),
            $item->stockLevels->map(fn($sl) => ($sl->location?->zone ?? '-') . '-' . ($sl->location?->rack ?? '-') . ':' . ($sl->location?->bin ?? '-') . ' = ' . $sl->quantity)->implode(', '),
        ]);

        return $this->generateHtml($title, $headers, $rows, $generatedAt);
    }

    // ── MOVEMENT REPORTS ───────────────────────────

    public function movementReport(Request $request)
    {
        $query = StockMovement::with(['item', 'location', 'supplier', 'user'])
            ->when($request->filled('type'), fn($q) => $q->where('type', $request->type))
            ->when($request->filled('from_date'), fn($q) => $q->where('created_at', '>=', $request->from_date . ' 00:00:00'))
            ->when($request->filled('to_date'), fn($q) => $q->where('created_at', '<=', $request->to_date . ' 23:59:59'))
            ->orderByDesc('created_at');

        return response()->json($query->paginate(50));
    }

    public function movementExcel(Request $request)
    {
        $movements = StockMovement::with(['item', 'location', 'supplier', 'user'])
            ->when($request->filled('type'), fn($q) => $q->where('type', $request->type))
            ->when($request->filled('from_date'), fn($q) => $q->where('created_at', '>=', $request->from_date . ' 00:00:00'))
            ->when($request->filled('to_date'), fn($q) => $q->where('created_at', '<=', $request->to_date . ' 23:59:59'))
            ->orderByDesc('created_at')
            ->get();

        $headers = ['Date', 'Item', 'SKU', 'Type', 'Quantity', 'Location', 'Supplier', 'User', 'Remarks'];
        $rows = [];
        foreach ($movements as $m) {
            $rows[] = [
                $m->created_at ? $m->created_at->format('Y-m-d H:i') : '-',
                $m->item?->name ?? '-',
                $m->item?->sku ?? '-',
                ucfirst($m->type),
                $m->quantity,
                $m->location ? ($m->location->zone . '-' . $m->location->rack . ':' . $m->location->bin) : '-',
                $m->supplier?->name ?? '-',
                $m->user?->name ?? '-',
                $m->remarks ?? '-',
            ];
        }

        return $this->generateCsv('movement_report', $headers, $rows);
    }

    public function movementPdf(Request $request)
    {
        $movements = StockMovement::with(['item', 'location', 'supplier', 'user'])
            ->when($request->filled('type'), fn($q) => $q->where('type', $request->type))
            ->when($request->filled('from_date'), fn($q) => $q->where('created_at', '>=', $request->from_date . ' 00:00:00'))
            ->when($request->filled('to_date'), fn($q) => $q->where('created_at', '<=', $request->to_date . ' 23:59:59'))
            ->orderByDesc('created_at')
            ->get();

        $title = 'Movement Report';
        $generatedAt = Carbon::now()->format('d M Y H:i');
        $headers = ['Date', 'Item', 'Type', 'Qty', 'Location', 'User'];
        $rows = [];
        foreach ($movements as $m) {
            $rows[] = [
                $m->created_at ? $m->created_at->format('Y-m-d H:i') : '-',
                $m->item?->name ?? '-',
                ucfirst($m->type),
                $m->quantity,
                $m->location ? ($m->location->zone . '-' . $m->location->rack . ':' . $m->location->bin) : '-',
                $m->user?->name ?? '-',
            ];
        }

        return $this->generateHtml($title, $headers, $rows, $generatedAt);
    }

    // ── FORECAST REPORTS ───────────────────────────

    public function forecastReport(Request $request)
    {
        $query = StockForecast::with('inventoryItem.category')
            ->when($request->filled('period'), fn($q) => $q->where('period_days', $request->period))
            ->orderByDesc('forecast_date');

        return response()->json($query->paginate(50));
    }

    public function forecastExcel(Request $request)
    {
        $forecasts = StockForecast::with('inventoryItem.category')
            ->when($request->filled('period'), fn($q) => $q->where('period_days', $request->period))
            ->orderByDesc('forecast_date')
            ->get();

        $headers = ['Item', 'SKU', 'Category', 'Period (Days)', 'Predicted', 'Low', 'High', 'MAPE (%)', 'Forecast Date', 'Target Date'];
        $rows = $forecasts->map(fn($f) => [
            $f->inventoryItem?->name ?? '-',
            $f->inventoryItem?->sku ?? '-',
            $f->inventoryItem?->category?->name ?? '-',
            $f->period_days,
            $f->predicted_quantity,
            $f->confidence_low,
            $f->confidence_high,
            $f->mape ?? '-',
            $f->forecast_date,
            $f->target_date,
        ]);

        return $this->generateCsv('forecast_report', $headers, $rows);
    }

    public function forecastPdf(Request $request)
    {
        $forecasts = StockForecast::with('inventoryItem.category')
            ->when($request->filled('period'), fn($q) => $q->where('period_days', $request->period))
            ->orderByDesc('forecast_date')
            ->get();

        $title = 'Forecast Report';
        $generatedAt = Carbon::now()->format('d M Y H:i');
        $headers = ['Item', 'Period', 'Predicted', 'Low', 'High', 'MAPE', 'Target Date'];
        $rows = $forecasts->map(fn($f) => [
            $f->inventoryItem?->name ?? '-',
            $f->period_days . ' days',
            $f->predicted_quantity,
            $f->confidence_low,
            $f->confidence_high,
            $f->mape ? $f->mape . '%' : '-',
            $f->target_date,
        ]);

        return $this->generateHtml($title, $headers, $rows, $generatedAt);
    }

    // ── CSV GENERATOR ──────────────────────────────

    private function generateCsv(string $filename, array $headers, $rows)
    {
        $filename = $filename . '_' . date('Y-m-d_His') . '.csv';

        $output = fopen('php://temp', 'r+');
        fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF));
        fputcsv($output, $headers);

        foreach ($rows as $row) {
            fputcsv($output, $row);
        }

        rewind($output);
        $content = stream_get_contents($output);
        fclose($output);

        return response($content, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control'       => 'no-cache, no-store, must-revalidate',
        ]);
    }

    // ── HTML REPORT GENERATOR ──────────────────────

    private function generateHtml(string $title, array $headers, $rows, string $generatedAt)
    {
        ob_start();
        ?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body{font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#1f2937;margin:20px}
.header{text-align:center;margin-bottom:20px;border-bottom:2px solid #2563eb;padding-bottom:12px}
.header h1{font-size:18px;color:#1e40af;margin:0 0 4px 0}
.header .meta{font-size:10px;color:#6b7280}
table{width:100%;border-collapse:collapse;margin-top:12px}
thead th{background:#2563eb;color:#fff;font-weight:600;font-size:10px;padding:8px 6px;text-align:left;border:1px solid #1d4ed8}
tbody td{padding:6px;border:1px solid #e5e7eb;font-size:10px}
tbody tr:nth-child(even){background:#f9fafb}
.footer{margin-top:20px;text-align:center;font-size:9px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px}
</style>
</head>
<body>
<div class="header">
<h1><?php echo htmlspecialchars($title); ?></h1>
<div class="meta">Generated: <?php echo htmlspecialchars($generatedAt); ?> - Records: <?php echo count($rows); ?></div>
</div>
<table>
<thead><tr>
<?php foreach ($headers as $h): ?>
<th><?php echo htmlspecialchars($h); ?></th>
<?php endforeach; ?>
</tr></thead>
<tbody>
<?php foreach ($rows as $row): ?>
<tr>
<?php foreach ($row as $cell): ?>
<td><?php echo htmlspecialchars((string) $cell); ?></td>
<?php endforeach; ?>
</tr>
<?php endforeach; ?>
</tbody>
</table>
<div class="footer">Warehouse Monitoring System - <?php echo htmlspecialchars($title); ?> - <?php echo htmlspecialchars($generatedAt); ?></div>
</body>
</html>
        <?php
        $html = ob_get_clean();

        $filename = strtolower(str_replace(' ', '_', $title)) . '_' . date('Y-m-d_His') . '.html';

        return response($html, 200, [
            'Content-Type'        => 'text/html; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control'       => 'no-cache, no-store, must-revalidate',
        ]);
    }

    // ── HELPERS ────────────────────────────────────

    private function stockStatus(InventoryItem $item): string
    {
        $total = $item->stockLevels->sum('quantity');
        if ($total <= 0) return 'Out of Stock';
        if ($item->min_stock > 0 && $total <= $item->min_stock) return 'Low';
        return 'Available';
    }
}
