<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body{font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#1f2937;margin:0;padding:0;background:#f9fafb}
.container{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.header{background:#6366f1;padding:24px 32px;color:#fff}
.header h1{font-size:20px;margin:0;font-weight:700}
.header p{font-size:13px;margin:4px 0 0;opacity:0.9}
.content{padding:24px 32px}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
.stat{background:#f9fafb;border-radius:8px;padding:14px;text-align:center}
.stat-val{font-size:24px;font-weight:700;color:#1f2937}
.stat-label{font-size:11px;color:#6b7280;margin-top:2px}
.stat-red .stat-val{color:#ef4444}
.stat-green .stat-val{color:#16a34a}
.section{margin-top:20px}
.section h3{font-size:14px;margin:0 0 8px;color:#374151}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;padding:8px;background:#f3f4f6;font-weight:600;color:#6b7280;font-size:11px}
td{padding:8px;border-bottom:1px solid #f3f4f6}
.footer{padding:16px 32px;background:#f9fafb;font-size:11px;color:#9ca3af;text-align:center}
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>{{ $period }} Summary</h1>
<p>Warehouse activity overview</p>
</div>
<div class="content">
<p>Hi {{ $recipientName }},</p>
<p>Here's your warehouse summary:</p>
<div class="stats">
<div class="stat"><div class="stat-val">{{ $stats['total_items'] ?? 0 }}</div><div class="stat-label">Total Items</div></div>
<div class="stat stat-red"><div class="stat-val">{{ $stats['stockout_items'] ?? 0 }}</div><div class="stat-label">Stockout</div></div>
<div class="stat"><div class="stat-val">{{ $stats['low_stock_items'] ?? 0 }}</div><div class="stat-label">Low Stock</div></div>
<div class="stat"><div class="stat-val">{{ $stats['pending_approvals'] ?? 0 }}</div><div class="stat-label">Pending Approvals</div></div>
<div class="stat stat-green"><div class="stat-val">{{ $stats['today_in'] ?? 0 }}</div><div class="stat-label">Stock In (Today)</div></div>
<div class="stat"><div class="stat-val">{{ $stats['today_out'] ?? 0 }}</div><div class="stat-label">Stock Out (Today)</div></div>
</div>
@if(!empty($topMovingItems))
<div class="section">
<h3>Top Moving Items</h3>
<table>
<tr><th>Item</th><th>Out Qty</th></tr>
@foreach($topMovingItems as $item)
<tr><td>{{ $item['name'] ?? '-' }}</td><td>{{ $item['total_out'] ?? 0 }}</td></tr>
@endforeach
</table>
</div>
@endif
</div>
<div class="footer">Warehouse Monitoring System — Automated report</div>
</div>
</body>
</html>
