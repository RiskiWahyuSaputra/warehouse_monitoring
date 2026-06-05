<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole   = Role::where('slug', 'admin')->first();
        $managerRole = Role::where('slug', 'manager')->first();
        $staffRole   = Role::where('slug', 'staff')->first();

        User::firstOrCreate(
            ['email' => 'admin@warehouse.com'],
            [
                'name' => 'System Administrator',
                'password' => 'admin123',
                'role_id' => $adminRole->id,
            ]
        );

        User::firstOrCreate(
            ['email' => 'manager@warehouse.com'],
            [
                'name' => 'Kepala Gudang',
                'password' => 'manager123',
                'role_id' => $managerRole->id,
            ]
        );

        User::firstOrCreate(
            ['email' => 'staff@warehouse.com'],
            [
                'name' => 'Staff Gudang',
                'password' => 'staff123',
                'role_id' => $staffRole->id,
            ]
        );
    }
}
