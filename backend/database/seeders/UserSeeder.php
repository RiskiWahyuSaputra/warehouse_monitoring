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
