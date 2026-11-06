<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description')->default('');
            $table->string('status', 20)->default('active');
            $table->timestamps();
        });

        Schema::create('app_foods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('app_categories')->restrictOnDelete();
            $table->string('name');
            // Lowest variant price when the food has variants.
            $table->decimal('price', 10, 2);
            $table->text('description')->default('');
            $table->string('status', 20)->default('available'); // available | unavailable
            $table->unsignedSmallInteger('eta_minutes')->default(15);
            $table->json('tags')->nullable();
            $table->timestamps();
            $table->index(['category_id', 'status'], 'app_foods_cat_status_idx');
        });

        Schema::create('app_food_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('food_id')->constrained('app_foods')->cascadeOnDelete();
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->unsignedSmallInteger('position')->default(0);
            $table->unique(['food_id', 'name'], 'app_food_variants_food_name_uq');
        });

        Schema::create('app_food_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('food_id')->constrained('app_foods')->cascadeOnDelete();
            // URL or data URL for now; move to stored files with HandlesFileUploads later.
            $table->text('path');
            $table->unsignedSmallInteger('position')->default(0);
        });

        Schema::create('app_payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('details')->default('');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('app_discounts', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->decimal('pct', 5, 2);
            $table->string('note')->default('');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Forward-only (section 10.6): migrations stay backward compatible with the previous release.
    }
};
