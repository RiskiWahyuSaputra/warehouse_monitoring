# RBAC Models & Seeders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the Eloquent layer for Role-Based Access Control and seed the initial roles and an admin user.

**Architecture:** Create a `Role` model and link it to the `User` model via a `belongsTo` relationship. Use Laravel Seeders to populate the database with default roles and an initial administrator. Refactor the `UserFactory` to use the new `Role` model.

**Tech Stack:** PHP, Laravel (Eloquent, Factories, Seeders)

---

### Task 1: Create Role Model & Factory

**Files:**
- Create: `backend/app/Models/Role.php`
- Create: `backend/database/factories/RoleFactory.php`

- [ ] **Step 1: Create Role Model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug'];
}
```

- [ ] **Step 2: Create Role Factory**

```php
<?php

namespace Database\Factories;

use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Role>
 */
class RoleFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->jobTitle();
        return [
            'name' => $name,
            'slug' => Str::slug($name),
        ];
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/Models/Role.php backend/database/factories/RoleFactory.php
git commit -m "feat: create Role model and factory"
```

### Task 2: Update User Model & Relationship

**Files:**
- Modify: `backend/app/Models/User.php`

- [ ] **Step 1: Add role() relationship to User model**

```php
    // ... inside User class

    /**
     * Get the role that owns the user.
     */
    public function role()
    {
        return $this->belongsTo(Role::class);
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/Models/User.php
git commit -m "feat: add role relationship to User model"
```

### Task 3: Refactor UserFactory

**Files:**
- Modify: `backend/database/factories/UserFactory.php`

- [ ] **Step 1: Update UserFactory to use Role model**

```php
    public function definition(): array
    {
        return [
            'role_id' => Role::where('slug', 'admin')->first()?->id ?? Role::factory(),
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/database/factories/UserFactory.php
git commit -m "refactor: use Role model in UserFactory"
```

### Task 4: Create Seeders

**Files:**
- Create: `backend/database/seeders/RoleSeeder.php`
- Create: `backend/database/seeders/UserSeeder.php`
- Modify: `backend/database/seeders/DatabaseSeeder.php`

- [ ] **Step 1: Create RoleSeeder**

```php
<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'Admin', 'slug' => 'admin'],
            ['name' => 'Manager', 'slug' => 'manager'],
            ['name' => 'Staff', 'slug' => 'staff'],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['slug' => $role['slug']], $role);
        }
    }
}
```

- [ ] **Step 2: Create UserSeeder**

```php
<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = Role::where('slug', 'admin')->first();

        User::firstOrCreate(
            ['email' => 'admin@warehouse.com'],
            [
                'name' => 'System Administrator',
                'password' => Hash::make('admin123'),
                'role_id' => $adminRole->id,
            ]
        );
    }
}
```

- [ ] **Step 3: Register seeders in DatabaseSeeder**

```php
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            UserSeeder::class,
        ]);
    }
```

- [ ] **Step 4: Commit**

```bash
git add backend/database/seeders/RoleSeeder.php backend/database/seeders/UserSeeder.php backend/database/seeders/DatabaseSeeder.php
git commit -m "feat: implement RoleSeeder and UserSeeder"
```

### Task 5: Verification

- [ ] **Step 1: Run migrations and seeders**

Run: `cd backend && php artisan migrate:fresh --seed`
Expected: Migrations run successfully, and seeders finish without errors.

- [ ] **Step 2: Verify data in database (via tinker)**

Run: `echo "App\Models\User::with('role')->get()->toArray();" | php artisan tinker`
Expected: Output showing the Admin user with their associated Role.

- [ ] **Step 3: Final Commit**

```bash
git commit --allow-empty -m "vfy: RBAC models and seeders verified"
```
