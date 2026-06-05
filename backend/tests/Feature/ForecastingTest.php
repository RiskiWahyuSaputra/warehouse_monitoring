<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\InventoryItem;
use App\Models\Location;
use App\Models\Role;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\ForecastingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ForecastingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $manager;
    private InventoryItem $item;
    private Location $location;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::create(['name' => 'Admin', 'slug' => 'admin']);
        $managerRole = Role::create(['name' => 'Manager', 'slug' => 'manager']);
        $this->admin = User::factory()->create(['role_id' => $adminRole->id]);
        $this->manager = User::factory()->create(['role_id' => $managerRole->id]);

        $category = Category::create(['name' => 'Test Category']);
        $this->item = InventoryItem::create([
            'category_id' => $category->id,
            'name' => 'Test Item',
            'sku' => 'TEST-001',
            'barcode' => '123456789',
            'min_stock' => 10,
            'unit' => 'pcs',
        ]);

        $this->location = Location::create([
            'zone' => 'A',
            'rack' => '1',
            'bin' => '1',
            'capacity' => 1000,
        ]);

        // Create 30 days of stock movement data
        for ($i = 30; $i >= 1; $i--) {
            StockMovement::create([
                'inventory_item_id' => $this->item->id,
                'location_id' => $this->location->id,
                'user_id' => $this->admin->id,
                'type' => 'out',
                'quantity' => rand(5, 15),
                'created_at' => now()->subDays($i),
            ]);
        }

        // Add initial stock
        StockLevel::create([
            'inventory_item_id' => $this->item->id,
            'location_id' => $this->location->id,
            'quantity' => 200,
        ]);
    }

    public function test_forecast_index_requires_auth()
    {
        $response = $this->getJson('/api/forecasts');
        $response->assertStatus(401);
    }

    public function test_manager_can_view_forecasts()
    {
        $response = $this->actingAs($this->manager)->getJson('/api/forecasts');
        $response->assertStatus(200);
    }

    public function test_generate_forecasts_requires_manager_role()
    {
        $staffRole = Role::create(['name' => 'Staff', 'slug' => 'staff']);
        $staff = User::factory()->create(['role_id' => $staffRole->id]);

        $response = $this->actingAs($staff)->postJson('/api/forecasts/generate');
        $response->assertStatus(403);
    }

    public function test_admin_can_generate_forecasts()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/forecasts/generate');
        $response->assertStatus(200);

        $data = $response->json();
        $this->assertGreaterThan(0, $data['forecast_count']);
    }

    public function test_forecast_service_generates_predictions()
    {
        $service = app(ForecastingService::class);
        $results = $service->generateItemForecasts($this->item);

        $this->assertNotEmpty($results);

        // Should have 7, 14, 30 day forecasts
        foreach ([7, 14, 30] as $period) {
            $this->assertArrayHasKey($period, $results);
            $forecast = $results[$period];
            $this->assertGreaterThan(0, $forecast->predicted_quantity);
            $this->assertGreaterThanOrEqual(0, $forecast->confidence_low);
            $this->assertGreaterThanOrEqual($forecast->confidence_low, $forecast->confidence_high);
        }
    }

    public function test_forecast_show_for_specific_item()
    {
        // Generate first
        $service = app(ForecastingService::class);
        $service->generateItemForecasts($this->item);

        $response = $this->actingAs($this->manager)
            ->getJson("/api/forecasts/{$this->item->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'item',
                'current_total_stock',
                'forecasts',
            ]);
    }

    public function test_early_warnings_endpoint()
    {
        $response = $this->actingAs($this->manager)
            ->getJson('/api/forecasts/early-warnings');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'count',
                'warnings',
            ]);
    }

    public function test_daily_consumption_calculation()
    {
        $service = app(ForecastingService::class);
        $consumption = $service->getDailyConsumption($this->item);

        $this->assertNotEmpty($consumption);
        // Should have ~90 days of data
        $this->assertGreaterThanOrEqual(80, $consumption->count());

        // Each entry should have date and out keys
        $first = $consumption->first();
        $this->assertArrayHasKey('date', $first);
        $this->assertArrayHasKey('out', $first);
    }

    public function test_forecast_with_insufficient_data()
    {
        // Create item with no movement history and no stock levels
        $category = Category::create(['name' => 'Empty Category 2']);
        $emptyItem = InventoryItem::create([
            'category_id' => $category->id,
            'name' => 'Empty Item 2',
            'sku' => 'EMPTY-002',
            'barcode' => '000000002',
            'min_stock' => 5,
            'unit' => 'pcs',
        ]);

        $service = app(ForecastingService::class);
        $consumption = $service->getDailyConsumption($emptyItem);

        // Should have ~90 days of zero data (inclusive range = 91)
        $this->assertGreaterThanOrEqual(90, $consumption->count());
        $this->assertEquals(0, $consumption->sum('out'));

        // But forecast should still generate (with 0 prediction)
        $results = $service->generateItemForecasts($emptyItem);
        // With all zeros, WMA = 0, so predicted = 0 for all periods
        $this->assertNotEmpty($results);
        foreach ($results as $forecast) {
            $this->assertEquals(0, $forecast->predicted_quantity);
        }
    }
}
