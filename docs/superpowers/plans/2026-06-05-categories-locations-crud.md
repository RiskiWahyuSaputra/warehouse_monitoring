# Categories & Locations CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement CRUD for Categories and Locations with Role-Based Access Control (RBAC) middleware.

**Architecture:** Standard Laravel MVC pattern. Categories will support hierarchical structure (parent/children). Custom middleware will handle role-based authorization.

**Tech Stack:** Laravel 11, PHP 8.x, SQLite (for testing).

---

### Task 1: Models & Migrations

**Files:**
- Create: `backend/app/Models/Category.php`
- Create: `backend/database/migrations/YYYY_MM_DD_create_categories_table.php`
- Create: `backend/app/Models/Location.php`
- Create: `backend/database/migrations/YYYY_MM_DD_create_locations_table.php`

- [ ] **Step 1: Generate Models and Migrations**
    Run: `cd backend; php artisan make:model Category -m; php artisan make:model Location -m`

- [ ] **Step 2: Define Categories Migration**
    ```php
    Schema::create('categories', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->text('description')->nullable();
        $table->foreignId('parent_id')->nullable()->constrained('categories')->onDelete('cascade');
        $table->timestamps();
    });
    ```

- [ ] **Step 3: Define Locations Migration**
    ```php
    Schema::create('locations', function (Blueprint $table) {
        $table->id();
        $table->string('zone');
        $table->string('rack');
        $table->string('bin');
        $table->integer('capacity');
        $table->timestamps();
    });
    ```

- [ ] **Step 4: Update Category Model**
    Add `parent()` and `children()` relationships.

- [ ] **Step 5: Run Migrations**
    Run: `cd backend; php artisan migrate`

---

### Task 2: RBAC Middleware

**Files:**
- Create: `backend/app/Http/Middleware/CheckRole.php`
- Modify: `backend/bootstrap/app.php`

- [ ] **Step 1: Generate Middleware**
    Run: `cd backend; php artisan make:middleware CheckRole`

- [ ] **Step 2: Implement CheckRole Logic**
    ```php
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!$request->user() || !in_array($request->user()->role->slug, $roles)) {
            abort(403, 'Unauthorized.');
        }
        return $next($request);
    }
    ```

- [ ] **Step 3: Register Middleware in bootstrap/app.php**
    ```php
    $middleware->alias([
        'role' => \App\Http\Middleware\CheckRole::class,
    ]);
    ```

---

### Task 3: Feature Test Setup

**Files:**
- Create: `backend/tests/Feature/CategoryLocationApiTest.php`

- [ ] **Step 1: Create Test File**
    Run: `cd backend; php artisan make:test Feature/CategoryLocationApiTest`

- [ ] **Step 2: Write Initial RBAC Failure Tests**
    Test that Staff cannot access CRUD endpoints.

---

### Task 4: Category CRUD Implementation

**Files:**
- Create: `backend/app/Http/Controllers/Api/CategoryController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write CRUD Tests for Category**
    Test Index, Store, Show, Update, Destroy for Admin/Manager.

- [ ] **Step 2: Generate Category Controller**
    Run: `cd backend; php artisan make:controller Api/CategoryController --api`

- [ ] **Step 3: Implement CategoryController**
    Use `Category` model for RESTful actions.

- [ ] **Step 4: Register Category Routes**
    ```php
    Route::middleware(['auth:sanctum', 'role:admin,manager'])->group(function () {
        Route::apiResource('categories', CategoryController::class);
    });
    ```

- [ ] **Step 5: Run Tests and Verify**

---

### Task 5: Location CRUD Implementation

**Files:**
- Create: `backend/app/Http/Controllers/Api/LocationController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write CRUD Tests for Location**
    Test Index, Store, Show, Update, Destroy for Admin/Manager.

- [ ] **Step 2: Generate Location Controller**
    Run: `cd backend; php artisan make:controller Api/LocationController --api`

- [ ] **Step 3: Implement LocationController**
    Use `Location` model for RESTful actions.

- [ ] **Step 4: Register Location Routes**
    Add `locations` apiResource to the same middleware group.

- [ ] **Step 5: Run Tests and Verify**

---

### Task 6: Final Verification & Commit

- [ ] **Step 1: Run All Tests**
    Run: `cd backend; php artisan test`

- [ ] **Step 2: Commit Changes**
    `git add . && git commit -m "feat: add categories and locations CRUD with RBAC middleware"`
