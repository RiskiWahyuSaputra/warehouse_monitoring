<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = Role::where('slug', 'admin')->first();

        User::firstOrCreate(
            ['email' => 'admin@warehouse.com'],
            [
                'name' => 'System Administrator',
                'password' => 'admin123',
                'role_id' => $adminRole->id,
            ]
        );
    }
}
