<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Inventory phase 1: ingredients with stock on hand, a recipe per dish, and a log of every stock change. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_ingredients', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('unit', 12);
            $table->decimal('on_hand', 12, 3)->default(0);
            $table->decimal('reorder_level', 12, 3)->default(0);
            $table->decimal('cost', 12, 4)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // One line = this much of an ingredient per portion. variant_id null applies to every size of the dish.
        Schema::create('app_recipe_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('food_id')->constrained('app_foods')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('app_food_variants')->cascadeOnDelete();
            $table->foreignId('ingredient_id')->constrained('app_ingredients')->restrictOnDelete();
            $table->decimal('qty', 12, 3);
            $table->index(['food_id', 'variant_id']);
        });

        // The balance can be traced from this log: qty is the signed change, balance the stock after it.
        Schema::create('app_stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ingredient_id')->constrained('app_ingredients')->cascadeOnDelete();
            $table->string('type', 12); // received, used, waste, count
            $table->decimal('qty', 12, 3);
            $table->decimal('balance', 12, 3);
            $table->string('note', 255)->nullable();
            $table->string('ref', 40)->nullable(); // the order code a "used" movement belongs to
            $table->string('by', 60)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['ingredient_id', 'id']);
        });

        Schema::table('app_order_rounds', function (Blueprint $table) {
            $table->timestamp('stock_used_at')->nullable()->after('served_at');
        });
    }

    public function down(): void
    {
        Schema::table('app_order_rounds', fn (Blueprint $table) => $table->dropColumn('stock_used_at'));
        Schema::dropIfExists('app_stock_movements');
        Schema::dropIfExists('app_recipe_lines');
        Schema::dropIfExists('app_ingredients');
    }
};
