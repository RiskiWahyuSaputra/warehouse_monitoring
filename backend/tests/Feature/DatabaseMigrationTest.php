<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DatabaseMigrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that the roles table exists.
     */
    public function test_roles_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('roles'), 'The roles table does not exist.');
    }

    /**
     * Test that the roles table has the expected columns.
     */
    public function test_roles_table_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumn('roles', 'id'), 'The roles table does not have an id column.');
        $this->assertTrue(Schema::hasColumn('roles', 'name'), 'The roles table does not have a name column.');
        $this->assertTrue(Schema::hasColumn('roles', 'slug'), 'The roles table does not have a slug column.');
        $this->assertTrue(Schema::hasColumn('roles', 'created_at'), 'The roles table does not have a created_at column.');
        $this->assertTrue(Schema::hasColumn('roles', 'updated_at'), 'The roles table does not have an updated_at column.');
    }

    /**
     * Test that the users table has a role_id column.
     */
    public function test_users_table_has_role_id_column(): void
    {
        $this->assertTrue(Schema::hasColumn('users', 'role_id'), 'The users table does not have a role_id column.');
    }
}
