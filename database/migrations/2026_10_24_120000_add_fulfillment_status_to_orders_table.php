<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('fulfillment_status', 20)->default('pending')->after('status')->index();
            $table->timestamp('fulfillment_updated_at')->nullable()->after('fulfillment_status');
        });

        // Órdenes ya entregadas al cliente no deben aparecer como "por preparar".
        DB::table('orders')->whereIn('status', ['completed', 'delivered'])->update(['fulfillment_status' => 'dispatched']);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['fulfillment_status', 'fulfillment_updated_at']);
        });
    }
};
