<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Each table has one printed QR code that never changes. The waiter gives every new group a short code; the phone needs it to
 * join the table's open session, so an old photo of the QR cannot order for the next guests.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_table_sessions', function (Blueprint $table) {
            $table->string('code', 6)->nullable()->after('token');
        });
    }

    public function down(): void
    {
        Schema::table('app_table_sessions', function (Blueprint $table) {
            $table->dropColumn('code');
        });
    }
};
