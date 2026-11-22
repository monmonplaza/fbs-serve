<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Who added each dish, as {"Guest 482": 2, "Guest 117": 1}. The plate merges every guest's lines into one item, so each guest can still see theirs. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_order_items', function (Blueprint $table) {
            $table->json('added_by')->nullable()->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('app_order_items', fn (Blueprint $table) => $table->dropColumn('added_by'));
    }
};
