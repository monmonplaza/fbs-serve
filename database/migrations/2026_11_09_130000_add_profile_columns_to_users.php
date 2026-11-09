<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** The staff profile page: a photo (stored path on the s3 disk), a contact number and an address. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar', 500)->nullable()->after('email');
            $table->string('phone', 30)->nullable()->after('avatar');
            $table->string('address', 255)->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar', 'phone', 'address']);
        });
    }
};
