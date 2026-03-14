<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('platform')->index(); // woocommerce, mercadolibre
            $table->string('platform_order_id')->index();
            $table->string('status')->nullable();
            $table->decimal('total', 12, 2)->default(0);
            $table->string('currency', 3)->default('CLP');
            $table->timestamp('ordered_at')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('customer_email')->nullable();
            $table->json('raw_json')->nullable();
            $table->timestamps();

            $table->unique(['platform', 'platform_order_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
