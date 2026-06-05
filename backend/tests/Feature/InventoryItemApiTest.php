<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Models\Category;
use App\Models\InventoryItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryItemApiTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $manager;
    protected $staff;
    protected $category;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::create(['name' => 'Admin', 'slug' => 'admin']);
        $managerRole = Role::create(['name' => 'Manager', 'slug' => 'manager']);
        $staffRole = Role::create(['name' => 'Staff', 'slug' => 'staff']);

        $this->admin = User::factory()->create(['role_id' => $adminRole->id]);
        $this->manager = User::factory()->create(['role_id' => $managerRole->id]);
        $this->staff = User::factory()->create(['role_id' => $staffRole->id]);

        $this->category = Category::create(['name' => 'Electronics']);
    }

    /** @test */
    public function staff_can_access_inventory_items()
    {
        $response = $this->actingAs($this->staff)
            ->getJson('/api/inventory-items');

        $response->assertStatus(200);
    }

    /** @test */
    public function admin_can_create_inventory_item()
    {
        $data = [
            'category_id' => $this->category->id,
            'name' => 'Laptop',
            'sku' => 'LAP-001',
            'barcode' => '123456789',
            'description' => 'A powerful laptop',
            'min_stock' => 5,
            'unit' => 'pcs'
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/inventory-items', $data);

        $response->assertStatus(201)
            ->assertJsonPath('name', 'Laptop');

        $this->assertDatabaseHas('inventory_items', ['sku' => 'LAP-001']);
    }

    /** @test */
    public function admin_can_update_inventory_item()
    {
        $item = InventoryItem::create([
            'category_id' => $this->category->id,
            'name' => 'Old Name',
            'sku' => 'SKU-OLD',
            'barcode' => 'BC-OLD',
            'min_stock' => 1,
            'unit' => 'pcs'
        ]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/inventory-items/{$item->id}", [
                'name' => 'New Name'
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('name', 'New Name');

        $this->assertDatabaseHas('inventory_items', ['id' => $item->id, 'name' => 'New Name']);
    }

    /** @test */
    public function admin_can_delete_inventory_item()
    {
        $item = InventoryItem::create([
            'category_id' => $this->category->id,
            'name' => 'To Be Deleted',
            'sku' => 'SKU-DEL',
            'barcode' => 'BC-DEL',
            'min_stock' => 1,
            'unit' => 'pcs'
        ]);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/inventory-items/{$item->id}");

        $response->assertStatus(204);

        $this->assertSoftDeleted('inventory_items', ['id' => $item->id]);
    }

    /** @test */
    public function inventory_item_creation_requires_valid_data()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/inventory-items', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category_id', 'name', 'sku', 'unit']);
    }

    /** @test */
    public function sku_must_be_unique()
    {
        InventoryItem::create([
            'category_id' => $this->category->id,
            'name' => 'Item 1',
            'sku' => 'UNIQUE-SKU',
            'barcode' => 'BC1',
            'min_stock' => 1,
            'unit' => 'pcs'
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/inventory-items', [
                'category_id' => $this->category->id,
                'name' => 'Item 2',
                'sku' => 'UNIQUE-SKU',
                'barcode' => 'BC2',
                'min_stock' => 1,
                'unit' => 'pcs'
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sku']);
    }

    /** @test */
    public function index_returns_paginated_inventory_items()
    {
        InventoryItem::create([
            'category_id' => $this->category->id,
            'name' => 'Item 1',
            'sku' => 'SKU1',
            'barcode' => 'BC1',
            'min_stock' => 1,
            'unit' => 'pcs'
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/inventory-items');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'current_page',
                'first_page_url',
                'from',
                'last_page',
                'last_page_url',
                'links',
                'next_page_url',
                'path',
                'per_page',
                'prev_page_url',
                'to',
                'total',
            ]);
    }

    /** @test */
    public function staff_cannot_create_update_delete_inventory_items()
    {
        // Create
        $response = $this->actingAs($this->staff)
            ->postJson('/api/inventory-items', [
                'category_id' => $this->category->id,
                'name' => 'Staff Item',
                'sku' => 'STAFF-SKU',
                'barcode' => 'STAFF-BC',
                'unit' => 'pcs'
            ]);
        $response->assertStatus(403);

        // Update
        $item = InventoryItem::create([
            'category_id' => $this->category->id,
            'name' => 'Item',
            'sku' => 'SKU',
            'barcode' => 'BC',
            'unit' => 'pcs'
        ]);
        $response = $this->actingAs($this->staff)
            ->putJson("/api/inventory-items/{$item->id}", [
                'name' => 'Staff Update'
            ]);
        $response->assertStatus(403);

        // Delete
        $response = $this->actingAs($this->staff)
            ->deleteJson("/api/inventory-items/{$item->id}");
        $response->assertStatus(403);
    }

    /** @test */
    public function barcode_must_be_unique()
    {
        InventoryItem::create([
            'category_id' => $this->category->id,
            'name' => 'Item 1',
            'sku' => 'SKU1',
            'barcode' => 'UNIQUE-BC',
            'min_stock' => 1,
            'unit' => 'pcs'
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson('/api/inventory-items', [
                'category_id' => $this->category->id,
                'name' => 'Item 2',
                'sku' => 'SKU2',
                'barcode' => 'UNIQUE-BC',
                'min_stock' => 1,
                'unit' => 'pcs'
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['barcode']);
    }
}
