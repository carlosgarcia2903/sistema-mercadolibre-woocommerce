<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ml_pdfs', function (Blueprint $table) {
            $table->string('logistic_type')->nullable()->after('platform_shipment_id');
        });
    }

    public function down(): void
    {
        Schema::table('ml_pdfs', function (Blueprint $table) {
            $table->dropColumn('logistic_type');
        });
    }
};
