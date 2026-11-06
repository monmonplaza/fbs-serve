<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_payment_methods', function (Blueprint $table) {
            // GCash, Maya, cards: staff must enter the transaction reference before confirming.
            $table->boolean('needs_ref')->default(false)->after('active');
        });
        Schema::table('app_order_payments', function (Blueprint $table) {
            $table->string('reference', 40)->nullable()->after('amount');
        });
    }

    public function down(): void
    {
        // Forward-only (section 10.6).
    }
};
