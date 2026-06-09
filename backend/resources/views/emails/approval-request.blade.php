<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body{font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#1f2937;margin:0;padding:0;background:#f9fafb}
.container{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.header{background:#2563eb;padding:24px 32px;color:#fff}
.header h1{font-size:20px;margin:0;font-weight:700}
.header p{font-size:13px;margin:4px 0 0;opacity:0.9}
.content{padding:24px 32px}
.detail{background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0}
.detail-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e7eb;font-size:13px}
.detail-row:last-child{border-bottom:none}
.detail-label{color:#6b7280}
.detail-value{font-weight:600}
.footer{padding:16px 32px;background:#f9fafb;font-size:11px;color:#9ca3af;text-align:center}
.btn{display:inline-block;padding:10px 20px;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;margin:4px}
.btn-approve{background:#16a34a;margin-right:8px}
.btn-reject{background:#dc2626}
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>Approval Request</h1>
<p>{{ $itemName }}</p>
</div>
<div class="content">
<p>Hi {{ $recipientName }},</p>
<p>A new approval request requires your attention:</p>
<div class="detail">
<div class="detail-row"><span class="detail-label">Item</span><span class="detail-value">{{ $itemName }}</span></div>
<div class="detail-row"><span class="detail-label">Quantity</span><span class="detail-value">{{ $quantity }}</span></div>
<div class="detail-row"><span class="detail-label">Requester</span><span class="detail-value">{{ $requesterName }}</span></div>
<div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">{{ $approval->created_at?->format('d M Y H:i') ?? '-' }}</span></div>
</div>
<center>
<a href="{{ url('/approvals') }}" class="btn btn-approve">Review Request</a>
</center>
</div>
<div class="footer">Warehouse Monitoring System — Automated notification</div>
</div>
</body>
</html>
