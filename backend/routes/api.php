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
use App\Http\Controllers\Api\NotificationInAppController;
use App\Http\Controllers\Api\RoleController;
use App\Models\NotificationInApp;
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
    Route::prefix('barcode')->group(function () {
        Route::post('/scan', [BarcodeController::class, 'scan']);
        Route::get('/history', [BarcodeController::class, 'history']);
        Route::get('/lookup/{code}', [BarcodeController::class, 'lookup']);
    });
    Route::get('/inventory/items/{inventoryItem}/barcode', [BarcodeController::class, 'generate']);
    Route::get('/inventory/items/{inventoryItem}/barcode/svg', [BarcodeController::class, 'svg']);
    Route::get('/inventory/items/{inventoryItem}/barcode/print', [BarcodeController::class, 'printLabel']);
    Route::get('/inventory/items/{inventoryItem}/qr-code', [BarcodeController::class, 'qrCode']);
    Route::get('/inventory/items/{inventoryItem}/qr-print', [BarcodeController::class, 'qrPrint']);

    // Approvals — all authenticated users (scoped by role in controller)
    Route::get('/approvals', [ApprovalController::class, 'index']);
    Route::post('/approvals', [ApprovalController::class, 'store']);

    // Forecasts — all authenticated users can view
    Route::get('/forecasts', [ForecastController::class, 'index']);
    Route::get('/forecasts/early-warnings', [ForecastController::class, 'earlyWarnings']);
    Route::get('/forecasts/{inventoryItem}', [ForecastController::class, 'show']);

    // All authenticated users — notifications
    Route::prefix('in-app-notifications')->group(function () {
        Route::get('/', [NotificationInAppController::class, 'index']);
        Route::get('/unread-count', [NotificationInAppController::class, 'unreadCount']);
        Route::post('/read-all', [NotificationInAppController::class, 'markAllAsRead']);
        Route::post('/{notification}/read', [NotificationInAppController::class, 'markAsRead']);
    });

    // All authenticated users
    Route::get('/roles', [RoleController::class, 'index']);

    // Staff can read
    Route::middleware('role:admin,manager,staff')->group(function () {
        Route::get('/locations', [LocationController::class, 'index']);
        Route::get('/locations/{location}', [LocationController::class, 'show']);
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::get('/categories/{category}', [CategoryController::class, 'show']);
    });

    // Admin/Manager only
    Route::middleware('role:admin,manager')->group(function () {
        Route::apiResource('categories', CategoryController::class)->except(['index', 'show']);
        Route::apiResource('locations', LocationController::class)->except(['index', 'show']);
        Route::apiResource('suppliers', SupplierController::class);
        Route::apiResource('inventory-items', InventoryItemController::class)->except(['index', 'show']);
        Route::post('/approvals/{approvalRequest}/decide', [ApprovalController::class, 'decide']);
        Route::prefix('export')->group(function () {
            Route::get('/stock', [ExportController::class, 'stockReport']);
            Route::get('/stock/excel', [ExportController::class, 'stockExcel']);
            Route::get('/stock/pdf', [ExportController::class, 'stockPdf']);
            Route::get('/movements', [ExportController::class, 'movementReport']);
            Route::get('/movements/excel', [ExportController::class, 'movementExcel']);
            Route::get('/movements/pdf', [ExportController::class, 'movementPdf']);
            Route::get('/forecasts', [ExportController::class, 'forecastReport']);
            Route::get('/forecasts/excel', [ExportController::class, 'forecastExcel']);
            Route::get('/forecasts/pdf', [ExportController::class, 'forecastPdf']);
        });
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
