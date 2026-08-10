<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('pack_id')->nullable()->index()->after('platform_order_id');
            $table->decimal('shipping_cost', 12, 2)->default(0)->after('total');
            $table->decimal('sale_fees', 12, 2)->default(0)->after('shipping_cost');
            $table->decimal('received_amount', 12, 2)->default(0)->after('sale_fees');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['pack_id', 'shipping_cost', 'sale_fees', 'received_amount']);
        });
    }
};
