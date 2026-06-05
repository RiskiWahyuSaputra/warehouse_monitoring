# Phase 2: Core Inventory Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Supplier management, Inventory Items master data, and multi-location Stock Movement logic.

**Architecture:** Laravel 12 API with Eloquent relationships for multi-location tracking. Transactions are used for stock updates to ensure data integrity.

**Tech Stack:** Laravel 12, MySQL.

---

### Task 1: Supplier Management CRUD

**Files:**
- Create: `backend/database/migrations/2026_06_05_050001_create_suppliers_table.php`
- Create: `backend/app/Models/Supplier.php`
- Create: `backend/app/Http/Controllers/Api/SupplierController.php`
- Test: `backend/tests/Feature/SupplierApiTest.php`

- [ ] **Step 1: Create migration for suppliers**
```php
Schema::create('suppliers', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('contact_person');
    $table->string('email')->unique();
    $table->string('phone');
    $table->text('address');
    $table->decimal('performance_score', 5, 2)->default(0.00);
    $table->timestamps();
});
```

- [ ] **Step 2: Create Model and API Controller**
Implement standard `apiResource` methods with validation.

- [ ] **Step 3: Run migration and verify with Feature Test**
Run: `cd backend; php artisan migrate; php artisan test tests/Feature/SupplierApiTest.php`

- [ ] **Step 4: Commit**
```bash
git add .
git commit -m "feat: implement supplier management"
```

---

### Task 2: Inventory Items Master Data

**Files:**
- Create: `backend/database/migrations/2026_06_05_050002_create_inventory_items_table.php`
- Create: `backend/app/Models/InventoryItem.php`
- Create: `backend/app/Http/Controllers/Api/InventoryItemController.php`
- Test: `backend/tests/Feature/InventoryItemApiTest.php`

- [ ] **Step 1: Create migration for inventory_items**
Include `category_id` foreign key, `name`, `sku`, `barcode`, `min_stock`, `unit`.

- [ ] **Step 2: Implement Model with Relationship**
Define `belongsTo(Category::class)`.

- [ ] **Step 3: Register API Resource in `routes/api.php`**
Protect with `auth:sanctum` and `role:admin,manager,staff`.

- [ ] **Step 4: Commit**
```bash
git add .
git commit -m "feat: implement inventory items master data"
```

---

### Task 3: Multi-Location Stock Levels Schema

**Files:**
- Create: `backend/database/migrations/2026_06_05_050003_create_stock_levels_table.php`
- Create: `backend/app/Models/StockLevel.php`

- [ ] **Step 1: Create stock_levels migration**
Columns: `inventory_item_id`, `location_id`, `quantity` (integer, default 0).
Add a unique index on `['inventory_item_id', 'location_id']`.

- [ ] **Step 2: Define Relationships in Models**
`InventoryItem` has many `StockLevels`.

- [ ] **Step 3: Commit**
```bash
git add .
git commit -m "feat: setup multi-location stock levels schema"
```

---

### Task 4: Stock Movement Engine (In, Out, Adj)

**Files:**
- Create: `backend/database/migrations/2026_06_05_050004_create_stock_movements_table.php`
- Create: `backend/app/Models/StockMovement.php`
- Create: `backend/app/Http/Controllers/Api/StockMovementController.php`
- Test: `backend/tests/Feature/StockMovementApiTest.php`

- [ ] **Step 1: Create stock_movements migration**
Capture `item_id`, `location_id`, `type`, `quantity`, `user_id`.

- [ ] **Step 2: Implement Movement Logic in Controller**
Use `DB::transaction`. 
- IF 'in': Increase `stock_levels.quantity`.
- IF 'out': Check if sufficient, then decrease.
- IF 'adjustment': Log diff and update.

- [ ] **Step 3: Register Routes and Verify with Complex Tests**
Test scenarios: Stock Out with insufficient quantity (should fail 422).

- [ ] **Step 4: Commit**
```bash
git add .
git commit -m "feat: implement stock movement engine"
```
