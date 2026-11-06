<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_floors', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('app_dining_tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('floor_id')->constrained('app_floors')->restrictOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('seats')->default(2);
            $table->decimal('x', 5, 2)->default(50);
            $table->decimal('y', 5, 2)->default(50);
            // inactive | active | ordering | eating | billout | cleaning. Follows the open session's rounds (see TableSync).
            $table->string('status', 20)->default('inactive');
            $table->timestamps();
            $table->unique(['floor_id', 'name'], 'app_dining_tables_floor_name_uq');
        });

        // A new row per activation. Closing it (clean) invalidates the QR.
        Schema::create('app_table_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('table_id')->constrained('app_dining_tables')->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->unsignedSmallInteger('guests')->nullable();
            $table->timestampTz('opened_at');
            $table->timestampTz('closed_at')->nullable();
            $table->string('bill_method', 40)->nullable();
            $table->timestampTz('bill_requested_at')->nullable();
            $table->timestamps();
            $table->index(['table_id', 'closed_at'], 'app_table_sessions_open_idx');
        });
    }

    public function down(): void
    {
        // Forward-only (section 10.6): migrations stay backward compatible with the previous release.
    }
};
