<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;

class AuditLogController extends Controller
{
    public function index()
    {
        return response()->json(
            AuditLog::with('user:id,name')
                ->orderByDesc('created_at')
                ->paginate(15),
        );
    }

    public function show(AuditLog $auditLog)
    {
        return response()->json($auditLog->load('user:id,name'));
    }
}
