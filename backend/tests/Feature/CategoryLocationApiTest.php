<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Models\Category;
use App\Models\Location;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class CategoryLocationApiTest extends TestCase
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
    public function staff_cannot_access_categories()
    {
        $response = $this->actingAs($this->staff)
            ->getJson('/api/categories');

        $response->assertStatus(403);
    }

    /** @test */
    public function staff_cannot_access_locations()
    {
        $response = $this->actingAs($this->staff)
            ->getJson('/api/locations');

        $response->assertStatus(403);
    }

    /** @test */
    public function admin_can_access_categories()
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/categories');

        $response->assertStatus(200);
    }

    /** @test */
    public function manager_can_access_categories()
    {
        $response = $this->actingAs($this->manager)
            ->getJson('/api/categories');

        $response->assertStatus(200);
    }

    /** @test */
    public function admin_can_create_category()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/categories', [
                'name' => 'Electronics',
                'description' => 'Electronic items'
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('name', 'Electronics');

        $this->assertDatabaseHas('categories', ['name' => 'Electronics']);
    }

    /** @test */
    public function admin_can_update_category()
    {
        $category = Category::create(['name' => 'Old Name']);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/categories/{$category->id}", [
                'name' => 'New Name'
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('name', 'New Name');

        $this->assertDatabaseHas('categories', ['id' => $category->id, 'name' => 'New Name']);
    }

    /** @test */
    public function admin_can_delete_category()
    {
        $category = Category::create(['name' => 'To Be Deleted']);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/categories/{$category->id}");

        $response->assertStatus(204);

        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    /** @test */
    public function admin_can_create_location()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/locations', [
                'zone' => 'A',
                'rack' => '1',
                'bin' => '101',
                'capacity' => 100
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('zone', 'A');

        $this->assertDatabaseHas('locations', ['zone' => 'A', 'bin' => '101']);
    }

    /** @test */
    public function admin_can_update_location()
    {
        $location = Location::create([
            'zone' => 'A',
            'rack' => '1',
            'bin' => '101',
            'capacity' => 100
        ]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/locations/{$location->id}", [
                'capacity' => 200
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('capacity', 200);

        $this->assertDatabaseHas('locations', ['id' => $location->id, 'capacity' => 200]);
    }

    /** @test */
    public function admin_can_delete_location()
    {
        $location = Location::create([
            'zone' => 'A',
            'rack' => '1',
            'bin' => '101',
            'capacity' => 100
        ]);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/locations/{$location->id}");

        $response->assertStatus(204);

        $this->assertDatabaseMissing('locations', ['id' => $location->id]);
    }
}
