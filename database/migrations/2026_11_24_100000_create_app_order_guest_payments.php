<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pay per guest: each guest settles their own dishes (own method, own discount). The order is closed when every guest has paid;
 * `discount_total` then holds all the discounts together, since they can differ per guest.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_order_guest_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('app_orders')->cascadeOnDelete();
            $table->string('guest', 60);
            $table->decimal('gross', 10, 2);
            $table->string('discount_name', 60)->nullable();
            $table->decimal('discount_pct', 5, 2)->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('method', 40);
            $table->string('reference', 40)->nullable();
            $table->decimal('received', 10, 2)->nullable();
            $table->decimal('change_given', 10, 2)->nullable();
            $table->timestamp('paid_at')->useCurrent();
            $table->index('order_id');
        });
        Schema::table('app_orders', function (Blueprint $table) {
            $table->decimal('discount_total', 10, 2)->nullable()->after('discount_pct');
        });
    }

    public function down(): void
    {
        Schema::table('app_orders', fn (Blueprint $table) => $table->dropColumn('discount_total'));
        Schema::dropIfExists('app_order_guest_payments');
    }
};
