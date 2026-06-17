<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('variant_id')->nullable()->after('product_id')
                ->constrained('product_variants')->nullOnDelete();
            $table->decimal('sale_fee', 12, 2)->default(0)->after('unit_price'); // comisión ML por venta
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('variant_id');
            $table->dropColumn('sale_fee');
        });
    }
};
