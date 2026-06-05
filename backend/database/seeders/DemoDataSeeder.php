<?php

namespace Database\Seeders;

use App\Models\ApprovalRequest;
use App\Models\AuditLog;
use App\Models\BarcodeScan;
use App\Models\Category;
use App\Models\ForecastVariance;
use App\Models\InventoryItem;
use App\Models\Location;
use App\Models\NotificationPreference;
use App\Models\StockForecast;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\SupplierDelivery;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::all();
        $admin = $users->where('email', 'admin@warehouse.com')->first();
        $manager = $users->where('email', 'manager@warehouse.com')->first();
        $staff = $users->where('email', 'staff@warehouse.com')->first();

        $this->seedCategories();
        $this->seedLocations();
        $this->seedSuppliers();
        $this->seedInventoryItems();
        $this->seedStockLevels();
        $this->seedStockMovements($admin, $manager, $staff);
        $this->seedApprovalRequests($admin, $manager, $staff);
        $this->seedSupplierDeliveries();
        $this->seedAuditLogs($admin, $staff);
        $this->seedBarcodeScans($staff);
        $this->seedNotificationPreferences($users);
        $this->seedStockForecasts();
        $this->seedForecastVariances();
    }

    protected function seedCategories(): void
    {
        $categories = [
            ['name' => 'Elektronik', 'description' => 'Komponen dan perangkat elektronik'],
            ['name' => 'Mekanikal', 'description' => 'Komponen mekanikal dan sparepart'],
            ['name' => 'Kimia', 'description' => 'Bahan kimia dan pembersih'],
            ['name' => 'Packing', 'description' => 'Material pengemasan'],
            ['name' => 'Office Supply', 'description' => 'Perlengkapan kantor'],
            ['name' => 'Tooling', 'description' => 'Alat kerja dan perkakas'],
            ['name' => 'Safety', 'description' => 'Alat keselamatan kerja'],
            ['name' => 'Raw Material', 'description' => 'Bahan baku produksi'],
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(['name' => $cat['name']], $cat);
        }
    }

    protected function seedLocations(): void
    {
        $zones = ['A', 'B', 'C', 'D'];
        $racks = ['01', '02', '03', '04', '05'];
        $bins = ['A1', 'A2', 'B1', 'B2'];

        foreach ($zones as $zone) {
            foreach ($racks as $rack) {
                foreach ($bins as $bin) {
                    Location::firstOrCreate(
                        ['zone' => $zone, 'rack' => $rack, 'bin' => $bin],
                        ['capacity' => rand(50, 200)],
                    );
                }
            }
        }
    }

    protected function seedSuppliers(): void
    {
        $suppliers = [
            ['name' => 'PT Teknologi Maju', 'contact_person' => 'Budi Santoso', 'email' => 'budi@teknologimaju.co.id', 'phone' => '021-5550001', 'address' => 'Jl. Industri Raya No. 10, Jakarta'],
            ['name' => 'CV Sinar Jaya', 'contact_person' => 'Siti Rahmawati', 'email' => 'siti@sinarjaya.co.id', 'phone' => '021-5550002', 'address' => 'Jl. Merdeka No. 45, Bandung'],
            ['name' => 'UD Karya Utama', 'contact_person' => 'Ahmad Hidayat', 'email' => 'ahmad@karyautama.co.id', 'phone' => '021-5550003', 'address' => 'Jl. Gatot Subroto No. 88, Surabaya'],
            ['name' => 'PT Global Supply', 'contact_person' => 'Dewi Lestari', 'email' => 'dewi@globalsupply.co.id', 'phone' => '021-5550004', 'address' => 'Jl. Sudirman No. 23, Semarang'],
            ['name' => 'CV Mitra Abadi', 'contact_person' => 'Rudi Hartono', 'email' => 'rudi@mitraabadi.co.id', 'phone' => '021-5550005', 'address' => 'Jl. Ahmad Yani No. 67, Medan'],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::firstOrCreate(
                ['email' => $supplier['email']],
                $supplier,
            );
        }
    }

    protected function seedInventoryItems(): void
    {
        $categories = Category::all()->keyBy('name');

        $items = [
            ['name' => 'PCB Mainboard v2.1', 'sku' => 'ELE-001', 'barcode' => '8990001000011', 'category' => 'Elektronik', 'min_stock' => 10, 'unit' => 'pcs'],
            ['name' => 'Resistor 10k Ohm', 'sku' => 'ELE-002', 'barcode' => '8990001000028', 'category' => 'Elektronik', 'min_stock' => 100, 'unit' => 'pcs'],
            ['name' => 'Kabel USB Type-C 1m', 'sku' => 'ELE-003', 'barcode' => '8990001000035', 'category' => 'Elektronik', 'min_stock' => 50, 'unit' => 'pcs'],
            ['name' => 'Sensor Suhu DHT22', 'sku' => 'ELE-004', 'barcode' => '8990001000042', 'category' => 'Elektronik', 'min_stock' => 20, 'unit' => 'pcs'],
            ['name' => 'Bearing 6202ZZ', 'sku' => 'MEK-001', 'barcode' => '8990002000010', 'category' => 'Mekanikal', 'min_stock' => 30, 'unit' => 'pcs'],
            ['name' => 'Baut M8x30 Hex', 'sku' => 'MEK-002', 'barcode' => '8990002000027', 'category' => 'Mekanikal', 'min_stock' => 200, 'unit' => 'pcs'],
            ['name' => 'Mur M8', 'sku' => 'MEK-003', 'barcode' => '8990002000034', 'category' => 'Mekanikal', 'min_stock' => 200, 'unit' => 'pcs'],
            ['name' => 'V-belt A-38', 'sku' => 'MEK-004', 'barcode' => '8990002000041', 'category' => 'Mekanikal', 'min_stock' => 15, 'unit' => 'pcs'],
            ['name' => 'Pelumas WD-40 400ml', 'sku' => 'KIM-001', 'barcode' => '8990003000019', 'category' => 'Kimia', 'min_stock' => 10, 'unit' => 'botol'],
            ['name' => 'Cat Semprot Hitam 300ml', 'sku' => 'KIM-002', 'barcode' => '8990003000026', 'category' => 'Kimia', 'min_stock' => 15, 'unit' => 'botol'],
            ['name' => 'Dus Packing 40x30x20', 'sku' => 'PCK-001', 'barcode' => '8990004000018', 'category' => 'Packing', 'min_stock' => 50, 'unit' => 'pcs'],
            ['name' => 'Bubble Wrap 50mx50cm', 'sku' => 'PCK-002', 'barcode' => '8990004000025', 'category' => 'Packing', 'min_stock' => 5, 'unit' => 'roll'],
            ['name' => 'Stiker Label 100x50mm', 'sku' => 'PCK-003', 'barcode' => '8990004000032', 'category' => 'Packing', 'min_stock' => 10, 'unit' => 'pack'],
            ['name' => 'Kertas A4 80gr', 'sku' => 'OFF-001', 'barcode' => '8990005000017', 'category' => 'Office Supply', 'min_stock' => 10, 'unit' => 'rim'],
            ['name' => 'Ballpoint Standar', 'sku' => 'OFF-002', 'barcode' => '8990005000024', 'category' => 'Office Supply', 'min_stock' => 20, 'unit' => 'box'],
            ['name' => 'Obeng Set 12in1', 'sku' => 'TOL-001', 'barcode' => '8990006000016', 'category' => 'Tooling', 'min_stock' => 5, 'unit' => 'set'],
            ['name' => 'Tang Kombinasi 8"', 'sku' => 'TOL-002', 'barcode' => '8990006000023', 'category' => 'Tooling', 'min_stock' => 5, 'unit' => 'pcs'],
            ['name' => 'Multimeter Digital', 'sku' => 'TOL-003', 'barcode' => '8990006000030', 'category' => 'Tooling', 'min_stock' => 3, 'unit' => 'pcs'],
            ['name' => 'Helm Safety', 'sku' => 'SAF-001', 'barcode' => '8990007000015', 'category' => 'Safety', 'min_stock' => 10, 'unit' => 'pcs'],
            ['name' => 'Sarung Tangan Latex', 'sku' => 'SAF-002', 'barcode' => '8990007000022', 'category' => 'Safety', 'min_stock' => 20, 'unit' => 'box'],
            ['name' => 'Masker N95', 'sku' => 'SAF-003', 'barcode' => '8990007000039', 'category' => 'Safety', 'min_stock' => 50, 'unit' => 'box'],
            ['name' => 'Besi Plat 2mm', 'sku' => 'RAW-001', 'barcode' => '8990008000014', 'category' => 'Raw Material', 'min_stock' => 5, 'unit' => 'lembar'],
            ['name' => 'Pipa PVC 1/2" x 4m', 'sku' => 'RAW-002', 'barcode' => '8990008000021', 'category' => 'Raw Material', 'min_stock' => 10, 'unit' => 'batang'],
        ];

        foreach ($items as $item) {
            InventoryItem::firstOrCreate(
                ['sku' => $item['sku']],
                [
                    'category_id' => $categories[$item['category']]->id,
                    'name' => $item['name'],
                    'barcode' => $item['barcode'],
                    'description' => $item['name'],
                    'min_stock' => $item['min_stock'],
                    'unit' => $item['unit'],
                ],
            );
        }
    }

    protected function seedStockLevels(): void
    {
        $items = InventoryItem::all();
        $locations = Location::all();

        $locationQuantities = [
            ['item_idx' => 0, 'qty' => 55, 'loc_idx' => 0],
            ['item_idx' => 0, 'qty' => 30, 'loc_idx' => 1],
            ['item_idx' => 1, 'qty' => 500, 'loc_idx' => 0],
            ['item_idx' => 2, 'qty' => 120, 'loc_idx' => 0],
            ['item_idx' => 3, 'qty' => 45, 'loc_idx' => 2],
            ['item_idx' => 4, 'qty' => 0, 'loc_idx' => 3],
            ['item_idx' => 5, 'qty' => 350, 'loc_idx' => 1],
            ['item_idx' => 6, 'qty' => 400, 'loc_idx' => 1],
            ['item_idx' => 7, 'qty' => 5, 'loc_idx' => 3],
            ['item_idx' => 8, 'qty' => 25, 'loc_idx' => 2],
            ['item_idx' => 9, 'qty' => 8, 'loc_idx' => 2],
            ['item_idx' => 10, 'qty' => 200, 'loc_idx' => 4],
            ['item_idx' => 11, 'qty' => 12, 'loc_idx' => 4],
            ['item_idx' => 12, 'qty' => 25, 'loc_idx' => 4],
            ['item_idx' => 13, 'qty' => 30, 'loc_idx' => 5],
            ['item_idx' => 14, 'qty' => 15, 'loc_idx' => 5],
            ['item_idx' => 15, 'qty' => 8, 'loc_idx' => 3],
            ['item_idx' => 16, 'qty' => 12, 'loc_idx' => 3],
            ['item_idx' => 17, 'qty' => 6, 'loc_idx' => 0],
            ['item_idx' => 18, 'qty' => 25, 'loc_idx' => 6],
            ['item_idx' => 19, 'qty' => 10, 'loc_idx' => 6],
            ['item_idx' => 20, 'qty' => 60, 'loc_idx' => 6],
            ['item_idx' => 21, 'qty' => 15, 'loc_idx' => 7],
            ['item_idx' => 22, 'qty' => 20, 'loc_idx' => 7],
        ];

        foreach ($locationQuantities as $lq) {
            $item = $items[$lq['item_idx']] ?? null;
            $loc = $locations[$lq['loc_idx']] ?? null;
            if (!$item || !$loc) continue;

            StockLevel::firstOrCreate(
                ['inventory_item_id' => $item->id, 'location_id' => $loc->id],
                ['quantity' => $lq['qty'], 'reserved_quantity' => 0],
            );
        }
    }

    protected function seedStockMovements(User $admin, User $manager, User $staff): void
    {
        $items = InventoryItem::all()->keyBy('sku');
        $locations = Location::all();
        $suppliers = Supplier::all();

        $movements = [
            ['sku' => 'ELE-001', 'type' => 'in', 'qty' => 50, 'loc_idx' => 0, 'user' => 'staff', 'notes' => 'Stock awal'],
            ['sku' => 'ELE-002', 'type' => 'in', 'qty' => 200, 'loc_idx' => 0, 'user' => 'staff', 'notes' => 'Stock awal'],
            ['sku' => 'ELE-003', 'type' => 'in', 'qty' => 100, 'loc_idx' => 0, 'user' => 'staff', 'notes' => 'Stock awal'],
            ['sku' => 'MEK-001', 'type' => 'in', 'qty' => 50, 'loc_idx' => 3, 'user' => 'staff', 'notes' => 'Penerimaan dari PT Global Supply'],
            ['sku' => 'KIM-001', 'type' => 'in', 'qty' => 30, 'loc_idx' => 2, 'user' => 'staff', 'notes' => 'Penerimaan dari CV Sinar Jaya'],
            ['sku' => 'ELE-003', 'type' => 'out', 'qty' => 30, 'loc_idx' => 0, 'user' => 'staff', 'notes' => 'Permintaan produksi #PR-001'],
            ['sku' => 'MEK-002', 'type' => 'in', 'qty' => 500, 'loc_idx' => 1, 'user' => 'manager', 'notes' => 'Stock awal'],
            ['sku' => 'MEK-002', 'type' => 'out', 'qty' => 150, 'loc_idx' => 1, 'user' => 'staff', 'notes' => 'Penggunaan produksi'],
            ['sku' => 'PCK-001', 'type' => 'in', 'qty' => 300, 'loc_idx' => 4, 'user' => 'staff', 'notes' => 'Penerimaan dari PT Teknologi Maju'],
            ['sku' => 'PCK-001', 'type' => 'out', 'qty' => 100, 'loc_idx' => 4, 'user' => 'staff', 'notes' => 'Packing pengiriman #DO-045'],
            ['sku' => 'ELE-001', 'type' => 'adjustment', 'qty' => 5, 'loc_idx' => 0, 'user' => 'admin', 'notes' => 'Penyesuaian stok after opname'],
            ['sku' => 'SAF-001', 'type' => 'in', 'qty' => 30, 'loc_idx' => 6, 'user' => 'manager', 'notes' => 'Pengadaan alat safety'],
            ['sku' => 'RAW-001', 'type' => 'in', 'qty' => 20, 'loc_idx' => 7, 'user' => 'staff', 'notes' => 'Penerimaan bahan baku'],
            ['sku' => 'RAW-001', 'type' => 'out', 'qty' => 5, 'loc_idx' => 7, 'user' => 'staff', 'notes' => 'Produksi #PR-002'],
            ['sku' => 'OFF-001', 'type' => 'in', 'qty' => 50, 'loc_idx' => 5, 'user' => 'admin', 'notes' => 'Pengadaan ATK bulanan'],
        ];

        $userMap = ['admin' => $admin->id, 'manager' => $manager->id, 'staff' => $staff->id];

        foreach ($movements as $mv) {
            $item = $items->get($mv['sku']);
            $supplier = $mv['type'] === 'in' ? $suppliers->random() : null;

            StockMovement::create([
                'inventory_item_id' => $item?->id,
                'location_id' => $locations[$mv['loc_idx']]->id,
                'supplier_id' => $supplier?->id,
                'user_id' => $userMap[$mv['user']],
                'type' => $mv['type'],
                'quantity' => $mv['qty'],
                'remarks' => $mv['notes'],
            ]);
        }
    }

    protected function seedApprovalRequests(User $admin, User $manager, User $staff): void
    {
        $items = InventoryItem::all();
        $locations = Location::all();
        $firstMovement = StockMovement::first();

        $approvals = [
            ['requester' => 'staff', 'approver' => 'manager', 'item_idx' => 2, 'loc_idx' => 3, 'qty' => 20, 'status' => 'approved', 'remarks' => 'Permintaan tambahan kabel USB'],
            ['requester' => 'staff', 'approver' => 'manager', 'item_idx' => 4, 'loc_idx' => 3, 'qty' => 10, 'status' => 'pending', 'remarks' => 'Bearing untuk mesin #3'],
            ['requester' => 'manager', 'approver' => 'admin', 'item_idx' => 17, 'loc_idx' => 0, 'qty' => 2, 'status' => 'approved', 'remarks' => 'Multimeter baru untuk tim QC'],
            ['requester' => 'staff', 'approver' => 'manager', 'item_idx' => 8, 'loc_idx' => 2, 'qty' => 5, 'status' => 'rejected', 'remarks' => 'Permintaan pelumas (stok masih cukup)'],
        ];

        $userMap = ['admin' => $admin->id, 'manager' => $manager->id, 'staff' => $staff->id];

        foreach ($approvals as $ap) {
            ApprovalRequest::create([
                'requester_id' => $userMap[$ap['requester']],
                'approver_id' => $userMap[$ap['approver']],
                'inventory_item_id' => $items[$ap['item_idx']]->id,
                'location_id' => $locations[$ap['loc_idx']]->id,
                'quantity' => $ap['qty'],
                'status' => $ap['status'],
                'remarks' => $ap['remarks'],
                'stock_movement_id' => $firstMovement?->id,
            ]);
        }
    }

    protected function seedSupplierDeliveries(): void
    {
        $suppliers = Supplier::all();
        $movements = StockMovement::where('type', 'in')->get();

        $statuses = ['delivered', 'delivered', 'delivered', 'pending', 'late'];

        foreach ($suppliers as $i => $supplier) {
            $status = $statuses[$i] ?? 'delivered';
            $stockMovement = $movements->random();

            SupplierDelivery::create([
                'supplier_id' => $supplier->id,
                'stock_movement_id' => $stockMovement->id,
                'order_date' => now()->subDays(rand(5, 30)),
                'expected_delivery_date' => now()->subDays(rand(1, 5)),
                'actual_delivery_date' => $status === 'delivered' ? now()->subDays(rand(1, 3)) : null,
                'status' => $status,
                'quality_rating' => $status === 'delivered' ? rand(3, 5) : null,
                'notes' => "Pengiriman dari {$supplier->name}",
            ]);
        }
    }

    protected function seedAuditLogs(User $admin, User $staff): void
    {
        $actions = [
            ['user' => 'admin', 'action' => 'login', 'auditable_type' => null, 'auditable_id' => null],
            ['user' => 'staff', 'action' => 'login', 'auditable_type' => null, 'auditable_id' => null],
            ['user' => 'staff', 'action' => 'stock_in', 'auditable_type' => 'App\Models\StockMovement', 'auditable_id' => 1],
            ['user' => 'staff', 'action' => 'stock_out', 'auditable_type' => 'App\Models\StockMovement', 'auditable_id' => 6],
            ['user' => 'admin', 'action' => 'adjustment', 'auditable_type' => 'App\Models\StockMovement', 'auditable_id' => 11],
        ];

        $userMap = ['admin' => $admin->id, 'staff' => $staff->id];

        foreach ($actions as $log) {
            AuditLog::create([
                'user_id' => $userMap[$log['user']],
                'action' => $log['action'],
                'auditable_type' => $log['auditable_type'],
                'auditable_id' => $log['auditable_id'],
                'old_values' => null,
                'new_values' => null,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Demo/1.0',
            ]);
        }
    }

    protected function seedBarcodeScans(User $staff): void
    {
        $items = InventoryItem::all();

        $scans = [
            ['code' => '8990001000011', 'action' => 'stock_in', 'found' => true],
            ['code' => '8990001000035', 'action' => 'stock_out', 'found' => true],
            ['code' => '8990002000010', 'action' => 'lookup', 'found' => true],
            ['code' => '8999999999999', 'action' => 'lookup', 'found' => false],
        ];

        foreach ($scans as $scan) {
            $item = $scan['found'] ? InventoryItem::where('barcode', $scan['code'])->first() : null;
            BarcodeScan::create([
                'user_id' => $staff->id,
                'inventory_item_id' => $item?->id,
                'scanned_code' => $scan['code'],
                'action' => $scan['action'],
                'found' => $scan['found'],
            ]);
        }
    }

    protected function seedNotificationPreferences($users): void
    {
        $channels = ['in_app', 'email'];
        $types = ['low_stock', 'approval_request', 'delivery_update', 'system_alert'];

        foreach ($users as $user) {
            foreach ($channels as $channel) {
                foreach ($types as $type) {
                    NotificationPreference::firstOrCreate(
                        ['user_id' => $user->id, 'channel' => $channel, 'type' => $type],
                        ['enabled' => true],
                    );
                }
            }
        }
    }

    protected function seedStockForecasts(): void
    {
        $items = InventoryItem::all();

        $forecasts = [
            ['item_idx' => 0, 'days' => 30, 'predicted' => 80, 'low' => 65, 'high' => 95, 'mape' => 8.5],
            ['item_idx' => 1, 'days' => 30, 'predicted' => 450, 'low' => 400, 'high' => 500, 'mape' => 6.2],
            ['item_idx' => 2, 'days' => 30, 'predicted' => 150, 'low' => 120, 'high' => 180, 'mape' => 10.1],
            ['item_idx' => 5, 'days' => 30, 'predicted' => 300, 'low' => 250, 'high' => 350, 'mape' => 5.8],
            ['item_idx' => 10, 'days' => 30, 'predicted' => 250, 'low' => 200, 'high' => 300, 'mape' => 7.3],
        ];

        foreach ($forecasts as $fc) {
            $item = $items[$fc['item_idx']] ?? null;
            if (!$item) continue;

            StockForecast::create([
                'inventory_item_id' => $item->id,
                'period_days' => $fc['days'],
                'predicted_quantity' => $fc['predicted'],
                'confidence_low' => $fc['low'],
                'confidence_high' => $fc['high'],
                'mape' => $fc['mape'],
                'forecast_date' => now()->startOfMonth(),
                'target_date' => now()->addDays($fc['days']),
            ]);
        }
    }

    protected function seedForecastVariances(): void
    {
        $forecasts = StockForecast::all();

        foreach ($forecasts as $fc) {
            $actual = $fc->predicted_quantity + rand(-20, 20);
            $variance = $actual - $fc->predicted_quantity;
            $variancePct = $fc->predicted_quantity > 0
                ? round(abs($variance) / $fc->predicted_quantity * 100, 4)
                : 0;

            ForecastVariance::create([
                'stock_forecast_id' => $fc->id,
                'actual_quantity' => max(0, $actual),
                'variance' => $variance,
                'variance_percentage' => $variancePct,
                'recorded_date' => now()->subDays(rand(1, 15)),
            ]);
        }
    }
}
