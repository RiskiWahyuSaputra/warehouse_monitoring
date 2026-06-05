<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Models\Supplier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierApiTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $manager;
    protected $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::create(['name' => 'Admin', 'slug' => 'admin']);
        $managerRole = Role::create(['name' => 'Manager', 'slug' => 'manager']);
        $staffRole = Role::create(['name' => 'Staff', 'slug' => 'staff']);

        $this->admin = User::factory()->create(['role_id' => $adminRole->id]);
        $this->manager = User::factory()->create(['role_id' => $managerRole->id]);
        $this->staff = User::factory()->create(['role_id' => $staffRole->id]);
    }

    /** @test */
    public function staff_cannot_access_suppliers()
    {
        $response = $this->actingAs($this->staff)
            ->getJson('/api/suppliers');

        $response->assertStatus(403);
    }

    /** @test */
    public function admin_can_list_suppliers()
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/suppliers');

        $response->assertStatus(200);
    }

    /** @test */
    public function admin_can_create_supplier()
    {
        $supplierData = [
            'name' => 'Global Tech Solutions',
            'contact_person' => 'John Doe',
            'email' => 'contact@globaltech.com',
            'phone' => '+1234567890',
            'address' => '123 Tech Lane, Silicon Valley, CA',
            'performance_score' => 4.50
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/suppliers', $supplierData);

        $response->assertStatus(201)
            ->assertJsonPath('name', 'Global Tech Solutions');

        $this->assertDatabaseHas('suppliers', ['email' => 'contact@globaltech.com']);
    }

    /** @test */
    public function admin_can_show_supplier()
    {
        $supplier = Supplier::create([
            'name' => 'Test Supplier',
            'contact_person' => 'Jane Smith',
            'email' => 'jane@test.com',
            'phone' => '111222333',
            'address' => 'Test Address'
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/suppliers/{$supplier->id}");

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Test Supplier');
    }

    /** @test */
    public function admin_can_update_supplier()
    {
        $supplier = Supplier::create([
            'name' => 'Old Name',
            'contact_person' => 'Old Person',
            'email' => 'old@email.com',
            'phone' => '0000000',
            'address' => 'Old Address'
        ]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/suppliers/{$supplier->id}", [
                'name' => 'New Name',
                'contact_person' => 'New Person'
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('name', 'New Name');

        $this->assertDatabaseHas('suppliers', ['id' => $supplier->id, 'name' => 'New Name']);
    }

    /** @test */
    public function index_returns_paginated_suppliers()
    {
        Supplier::factory()->count(20)->create();

        $response = $this->actingAs($this->admin)
            ->getJson('/api/suppliers');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'links',
                'current_page',
                'last_page',
                'total'
            ]);
    }

    /** @test */
    public function store_fails_when_performance_score_is_null()
    {
        $supplierData = [
            'name' => 'Tech Corp',
            'contact_person' => 'Jane Smith',
            'email' => 'jane@tech.com',
            'phone' => '123456',
            'address' => 'Tech Park',
            'performance_score' => null
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/suppliers', $supplierData);

        // Now validation expects numeric or nothing (sometimes), so null should fail validation if passed explicitly as null.
        // Actually 'sometimes' only skips if key is MISSING. If key is present and null, 'numeric' will fail.
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['performance_score']);
    }

    /** @test */
    public function admin_can_delete_supplier()
    {
        $supplier = Supplier::create([
            'name' => 'To Be Deleted',
            'contact_person' => 'Delete Me',
            'email' => 'delete@me.com',
            'phone' => '999999',
            'address' => 'Delete Address'
        ]);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/suppliers/{$supplier->id}");

        $response->assertStatus(204);

        $this->assertSoftDeleted('suppliers', ['id' => $supplier->id]);
    }

    /** @test */
    public function supplier_creation_requires_valid_data()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/suppliers', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'contact_person', 'email', 'phone', 'address']);
    }
}
