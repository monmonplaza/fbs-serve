<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One order per table session (or per takeout). Every "Send to kitchen" adds a round to it.
        Schema::create('app_orders', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique(); // ORD-1001
            $table->foreignId('session_id')->nullable()->constrained('app_table_sessions')->restrictOnDelete();
            $table->foreignId('table_id')->nullable()->constrained('app_dining_tables')->nullOnDelete();
            $table->string('type', 20)->default('dine_in'); // dine_in | takeout
            $table->string('created_by')->default('');
            $table->string('discount_name')->nullable();
            $table->decimal('discount_pct', 5, 2)->nullable();
            $table->string('payment_method', 40)->nullable(); // a method id, or "split"
            $table->decimal('received', 10, 2)->nullable();
            $table->decimal('change_given', 10, 2)->nullable();
            $table->timestampTz('paid_at')->nullable();
            // Takeout only
            $table->string('pickup_code', 20)->nullable();
            $table->string('customer')->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('source', 20)->nullable();  // counter | qr
            $table->string('channel', 20)->nullable(); // walkin | grab | panda
            $table->string('channel_ref')->nullable();
            $table->timestamps();
            $table->unique('session_id', 'app_orders_session_uq'); // one order per session
            $table->index(['type', 'created_at'], 'app_orders_type_created_idx');
        });

        Schema::create('app_order_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('app_orders')->cascadeOnDelete();
            $table->unsignedSmallInteger('round_no');
            $table->string('code', 24)->unique(); // ORD-1001 for round 1, ORD-1001-2 for round 2
            $table->string('status', 20)->default('queued'); // queued | cooking | plating | completed | ready | served
            $table->string('created_by')->default('');
            $table->unsignedSmallInteger('eta_minutes')->default(15);
            $table->timestampTz('ready_at')->nullable();
            $table->timestampTz('served_at')->nullable();
            $table->timestamps();
            $table->unique(['order_id', 'round_no'], 'app_order_rounds_no_uq');
            $table->index('status', 'app_order_rounds_status_idx');
        });

        Schema::create('app_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('round_id')->constrained('app_order_rounds')->cascadeOnDelete();
            $table->foreignId('food_id')->nullable()->constrained('app_foods')->nullOnDelete();
            $table->unsignedBigInteger('variant_id')->nullable();
            // Snapshots: the receipt must not change when the menu does.
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->unsignedSmallInteger('qty');
            $table->string('note', 120)->nullable();
        });

        Schema::create('app_order_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('app_orders')->cascadeOnDelete();
            $table->string('method', 40);
            $table->decimal('amount', 10, 2);
        });

        // The shared plate before it is sent. Dine-in is keyed by session; the Takeout QR plate by takeout_token.
        Schema::create('app_plate_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->nullable()->constrained('app_table_sessions')->cascadeOnDelete();
            $table->string('takeout_token', 64)->nullable()->index('app_plate_lines_takeout_idx');
            $table->foreignId('food_id')->constrained('app_foods')->cascadeOnDelete();
            $table->unsignedBigInteger('variant_id')->nullable();
            $table->unsignedSmallInteger('qty')->default(1);
            $table->string('added_by');
            $table->string('note', 120)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Forward-only (section 10.6): migrations stay backward compatible with the previous release.
    }
};
