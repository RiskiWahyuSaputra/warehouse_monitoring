<?php

use App\Http\Controllers\Api\ApprovalController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarcodeController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\ForecastController;
use App\Http\Controllers\Api\InventoryItemController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AuditLogController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Dashboard — all authenticated users
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/charts', [DashboardController::class, 'charts']);

    // Stock movements — all authenticated users
    Route::get('/inventory/movements', [StockMovementController::class, 'index']);
    Route::post('/inventory/movements', [StockMovementController::class, 'store']);
    Route::post('/inventory/batch-movements', [StockMovementController::class, 'batch']);
    Route::post('/inventory/transfer', [StockMovementController::class, 'transfer']);

    // Barcode — all authenticated users
    Route::get('/inventory/items/{inventoryItem}/barcode', [BarcodeController::class, 'generate']);

    // Approvals — all authenticated users (scoped by role in controller)
    Route::get('/approvals', [ApprovalController::class, 'index']);
    Route::post('/approvals', [ApprovalController::class, 'store']);

    // Forecasts — all authenticated users can view
    Route::get('/forecasts', [ForecastController::class, 'index']);
    Route::get('/forecasts/early-warnings', [ForecastController::class, 'earlyWarnings']);
    Route::get('/forecasts/{inventoryItem}', [ForecastController::class, 'show']);

    // Admin/Manager only
    Route::middleware('role:admin,manager')->group(function () {
        Route::apiResource('categories', CategoryController::class);
        Route::apiResource('locations', LocationController::class);
        Route::apiResource('suppliers', SupplierController::class);
        Route::apiResource('inventory-items', InventoryItemController::class)->except(['index', 'show']);
        Route::post('/approvals/{approvalRequest}/decide', [ApprovalController::class, 'decide']);
        Route::get('/export/stock', [ExportController::class, 'stockReport']);
        Route::apiResource('users', UserController::class);
        Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::get('audit-logs/{auditLog}', [AuditLogController::class, 'show']);

        // Forecast management
        Route::post('/forecasts/generate', [ForecastController::class, 'generate']);
        Route::post('/forecasts/record-variances', [ForecastController::class, 'recordVariances']);
    });

    // Staff can read inventory items
    Route::middleware('role:admin,manager,staff')->group(function () {
        Route::apiResource('inventory-items', InventoryItemController::class)->only(['index', 'show']);
    });
});

Route::get('/ping', fn() => response()->json(['message' => 'ok']));
