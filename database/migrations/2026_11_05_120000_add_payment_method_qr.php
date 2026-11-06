<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_payment_methods', function (Blueprint $table) {
            // The restaurant's QR code for this method (GCash, Maya...), an image data URL or URL. Printed on the bill.
            $table->longText('qr')->nullable()->after('needs_ref');
        });
    }

    public function down(): void
    {
        // Forward-only (section 10.6).
    }
};
