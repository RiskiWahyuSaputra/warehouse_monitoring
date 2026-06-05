# Phase 1: Foundation & Multi-Role Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the database schema, multi-role authentication system (Laravel Sanctum), and React frontend foundation.

**Architecture:** REST API with Laravel 12, token-based auth with Sanctum, and React 19 frontend with Role-Based Access Control (RBAC).

**Tech Stack:** Laravel 12, MySQL, React 19, Tailwind CSS 4, Laravel Sanctum.

---

### Task 1: Database Migration for Roles & User Role Relation

**Files:**
- Create: `backend/database/migrations/2026_06_05_000001_create_roles_table.php`
- Modify: `backend/database/migrations/0001_01_01_000000_create_users_table.php`

- [ ] **Step 1: Create roles migration**
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('roles');
    }
};
```

- [ ] **Step 2: Modify users migration to include role_id**
```php
// Find public function up() in create_users_table.php and add:
$table->foreignId('role_id')->constrained('roles');
```

- [ ] **Step 3: Run migrations**
Run: `cd backend && php artisan migrate:fresh`
Expected: Success

- [ ] **Step 4: Commit**
```bash
git add backend/database/migrations
git commit -m "feat: add roles table and link to users"
```

---

### Task 2: Models & Seeders for RBAC

**Files:**
- Create: `backend/app/Models/Role.php`
- Modify: `backend/app/Models/User.php`
- Create: `backend/database/seeders/RoleSeeder.php`
- Create: `backend/database/seeders/UserSeeder.php`

- [ ] **Step 1: Create Role Model**
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Role extends Model {
    protected $fillable = ['name', 'slug'];
}
```

- [ ] **Step 2: Update User Model**
Add `role_id` to `$fillable` and define `role()` relationship.

- [ ] **Step 3: Create RoleSeeder**
Seed 'admin', 'manager', 'staff'.

- [ ] **Step 4: Create UserSeeder**
Create admin user with `role_id` for 'admin'.

- [ ] **Step 5: Run Seeders**
Run: `php artisan db:seed`

- [ ] **Step 6: Commit**
```bash
git add backend/app/Models backend/database/seeders
git commit -m "feat: setup RBAC models and seeders"
```

---

### Task 3: Authentication API (Login/Logout)

**Files:**
- Create: `backend/app/Http/Controllers/Api/AuthController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Implement Login logic**
Validate credentials, verify password, issue Sanctum token.

- [ ] **Step 2: Implement Logout logic**
Revoke current token.

- [ ] **Step 3: Register routes**
`POST /login` (public), `POST /logout` (auth:sanctum).

- [ ] **Step 4: Test Login with Postman/cURL**
Expected: JSON response with token.

- [ ] **Step 5: Commit**
```bash
git add backend/app/Http/Controllers backend/routes/api.php
git commit -m "feat: implement login and logout API"
```

---

### Task 4: Categories & Locations CRUD (Base)

**Files:**
- Create: `backend/app/Models/Category.php`
- Create: `backend/app/Models/Location.php`
- Create: `backend/app/Http/Controllers/Api/CategoryController.php`
- Create: `backend/app/Http/Controllers/Api/LocationController.php`

- [ ] **Step 1: Create Models and Migrations**
Follow the schema in Design Doc.

- [ ] **Step 2: Implement basic CRUD controllers**
Use `apiResource` routes.

- [ ] **Step 3: Commit**
```bash
git add backend/app/Models backend/app/Http/Controllers backend/database/migrations
git commit -m "feat: add categories and locations CRUD"
```

---

### Task 5: Frontend Auth Context & Axios Setup

**Files:**
- Create: `frontend/src/context/AuthContext.jsx`
- Create: `frontend/src/lib/axios.js`

- [ ] **Step 1: Setup Axios instance**
Base URL points to Laravel API, handle Bearer token in headers.

- [ ] **Step 2: Create AuthProvider**
Manage `user` state, `login`, and `logout` functions. Persistent state in localStorage.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/context frontend/src/lib
git commit -m "feat: setup frontend auth context and axios"
```
