<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ml_pdfs', function (Blueprint $table) {
            $table->string('shipment_status')->nullable()->after('logistic_type');
            $table->string('shipment_substatus')->nullable()->after('shipment_status');
        });
    }

    public function down(): void
    {
        Schema::table('ml_pdfs', function (Blueprint $table) {
            $table->dropColumn(['shipment_status', 'shipment_substatus']);
        });
    }
};
