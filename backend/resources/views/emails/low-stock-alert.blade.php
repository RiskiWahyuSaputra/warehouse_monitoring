<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body{font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#1f2937;margin:0;padding:0;background:#f9fafb}
.container{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.header{background:#ef4444;padding:24px 32px;color:#fff}
.header h1{font-size:20px;margin:0;font-weight:700}
.header p{font-size:13px;margin:4px 0 0;opacity:0.9}
.content{padding:24px 32px}
.item{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f3f4f6}
.item:last-child{border-bottom:none}
.item-name{font-weight:600;font-size:14px}
.item-sku{font-size:11px;color:#9ca3af}
.item-stock{text-align:right}
.stock-val{font-size:18px;font-weight:700;color:#ef4444}
.stock-label{font-size:11px;color:#9ca3af}
.footer{padding:16px 32px;background:#f9fafb;font-size:11px;color:#9ca3af;text-align:center}
.btn{display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;margin-top:16px}
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>Low Stock Alert</h1>
<p>{{ $count }} item(s) need your attention</p>
</div>
<div class="content">
<p>Hi {{ $recipientName }},</p>
<p>The following items are running low or out of stock:</p>
@foreach($items as $entry)
<div class="item">
<div>
<div class="item-name">{{ $entry['item']->name }}</div>
<div class="item-sku">SKU: {{ $entry['item']->sku }}</div>
</div>
<div class="item-stock">
<div class="stock-val">{{ $entry['current_stock'] }}</div>
<div class="stock-label">min: {{ $entry['min_stock'] }}</div>
</div>
</div>
@endforeach
<center><a href="{{ url('/') }}" class="btn">View Dashboard</a></center>
</div>
<div class="footer">Warehouse Monitoring System — Automated alert</div>
</div>
</body>
</html>
