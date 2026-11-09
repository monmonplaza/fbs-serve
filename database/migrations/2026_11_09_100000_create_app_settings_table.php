<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row: the restaurant-wide settings (the table stay timer for now).
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('table_timer_on')->default(false);
            $table->unsignedSmallInteger('table_timer_mins')->default(90);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Forward-only (section 10.6).
    }
};
