<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\InventoryItemController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\SupplierController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware('role:admin,manager')->group(function () {
        Route::apiResource('categories', CategoryController::class);
        Route::apiResource('locations', LocationController::class);
        Route::apiResource('suppliers', SupplierController::class);
        Route::apiResource('inventory-items', InventoryItemController::class)->except(['index', 'show']);
    });

    Route::middleware('role:admin,manager,staff')->group(function () {
        Route::apiResource('inventory-items', InventoryItemController::class)->only(['index', 'show']);
    });
});

Route::get('/ping', fn() => response()->json(['message' => 'ok']));