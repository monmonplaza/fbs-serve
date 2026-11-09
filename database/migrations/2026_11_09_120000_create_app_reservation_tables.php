<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_reservations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 40)->default('');
            $table->unsignedSmallInteger('pax');
            $table->timestampTz('starts_at');
            $table->foreignId('table_id')->nullable()->constrained('app_dining_tables')->nullOnDelete();
            $table->string('note', 500)->default('');
            $table->string('status', 20)->default('booked'); // booked, arrived, cancelled, noshow
            $table->string('cancel_reason')->nullable();
            $table->boolean('dismissed')->default(false); // the reminder was dismissed
            $table->timestamps();
            $table->index(['table_id', 'starts_at'], 'app_res_table_time_idx');
        });

        // The advance order. Name and price are snapshots; the lines go to the plate when the party is seated.
        Schema::create('app_reservation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained('app_reservations')->cascadeOnDelete();
            $table->foreignId('food_id')->nullable()->constrained('app_foods')->nullOnDelete();
            $table->unsignedBigInteger('variant_id')->nullable();
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->unsignedSmallInteger('qty');
        });

        Schema::create('app_reservation_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained('app_reservations')->cascadeOnDelete();
            $table->timestampTz('at');
            $table->string('text');
        });
    }

    public function down(): void
    {
        // Forward-only (section 10.6).
    }
};
