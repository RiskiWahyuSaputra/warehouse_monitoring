# Authentication API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement login, logout, and "me" API endpoints using Laravel Sanctum.

**Architecture:** Use `AuthController` to handle authentication logic. Issue Sanctum tokens for authenticated users. Ensure the user's role is included in the "me" response.

**Tech Stack:** PHP, Laravel 12, Laravel Sanctum.

---

### Task 1: Preparation

**Files:**
- Modify: `backend/app/Models/User.php`

- [ ] **Step 1: Add HasApiTokens trait to User model**

```php
// backend/app/Models/User.php
namespace App\Models;

use Laravel\Sanctum\HasApiTokens; // Add this
// ...
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable; // Add HasApiTokens
    // ...
}
```

- [ ] **Step 2: Verify code compiles**
Run: `php artisan tinker --execute="echo App\Models\User::class"`
Expected: `App\Models\User`

### Task 2: AuthController Implementation (TDD)

**Files:**
- Create: `backend/app/Http/Controllers/Api/AuthController.php`
- Test: `backend/tests/Feature/AuthApiTest.php`

- [ ] **Step 1: Write failing test for Login**

```php
// backend/tests/Feature/AuthApiTest.php
namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_with_correct_credentials()
    {
        $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'role'],
                'token',
            ]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**
Run: `php artisan test backend/tests/Feature/AuthApiTest.php`
Expected: FAIL (404 Not Found because route doesn't exist)

- [ ] **Step 3: Register login route**
Modify: `backend/routes/api.php`
```php
use App\Http\Controllers\Api\AuthController;
Route::post('/login', [AuthController::class, 'login']);
```

- [ ] **Step 4: Implement minimal Login logic**
Create: `backend/app/Http/Controllers/Api/AuthController.php`
```php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->load('role'),
            'token' => $token,
        ]);
    }
}
```

- [ ] **Step 5: Run test to verify it passes**
Run: `php artisan test backend/tests/Feature/AuthApiTest.php`
Expected: PASS

- [ ] **Step 6: Write failing test for "Me" endpoint**
Add to `AuthApiTest.php`:
```php
    public function test_user_can_get_their_own_profile()
    {
        $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
        $user = User::factory()->create(['role_id' => $role->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/me');

        $response->assertStatus(200)
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.role.slug', 'admin');
    }
```

- [ ] **Step 7: Run test to verify it fails**
Expected: FAIL (404)

- [ ] **Step 8: Register "me" route**
Modify: `backend/routes/api.php`
```php
Route::middleware('auth:sanctum')->get('/me', [AuthController::class, 'me']);
```

- [ ] **Step 9: Implement "Me" logic**
Add to `AuthController.php`:
```php
    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load('role'),
        ]);
    }
```

- [ ] **Step 10: Run test to verify it passes**
Expected: PASS

- [ ] **Step 11: Write failing test for Logout**
Add to `AuthApiTest.php`:
```php
    public function test_user_can_logout()
    {
        $role = Role::create(['name' => 'Admin', 'slug' => 'admin']);
        $user = User::factory()->create(['role_id' => $role->id]);
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/logout');

        $response->assertStatus(200);
        $this->assertCount(0, $user->tokens);
    }
```

- [ ] **Step 12: Run test to verify it fails**
Expected: FAIL (404)

- [ ] **Step 13: Register logout route**
Modify: `backend/routes/api.php`
```php
Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);
```

- [ ] **Step 14: Implement Logout logic**
Add to `AuthController.php`:
```php
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }
```

- [ ] **Step 15: Run test to verify it passes**
Expected: PASS

### Task 3: Cleanup and Final Verification

- [ ] **Step 1: Remove old `/user` route if redundant**
Modify: `backend/routes/api.php` (remove the default `/user` route)

- [ ] **Step 2: Run all tests in the project**
Run: `php artisan test`

- [ ] **Step 3: Commit all changes**
```bash
git add .
git commit -m "feat: implement login, logout, and me API endpoints"
```
