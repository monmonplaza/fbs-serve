<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The modules a staff role can open (the module ids of the UI navigation). `is_admin` keeps every module.
        Schema::create('app_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->json('modules');
            $table->boolean('is_admin')->default(false);
            $table->timestamps();
        });

        // Staff accounts live in the framework `users` table. There is no login on the backend yet, so email and password are optional.
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 40)->nullable()->unique()->after('name');
            $table->foreignId('role_id')->nullable()->after('username')->constrained('app_roles')->restrictOnDelete();
            $table->boolean('active')->default(true)->after('role_id');
            $table->string('email')->nullable()->change();
            $table->string('password')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Forward-only (section 10.6).
    }
};
