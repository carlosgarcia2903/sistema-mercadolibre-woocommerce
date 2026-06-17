<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('size')->nullable()->index();      // talla (S, M, L... o null si no aplica)
            $table->string('variant_source_id')->nullable()->index(); // id de la variación en WC/ML
            $table->string('sku')->nullable();
            $table->decimal('sale_price', 12, 2)->default(0); // precio de venta de la talla
            $table->decimal('cost_price', 12, 2)->nullable(); // costo ingresado manualmente
            $table->timestamps();

            $table->unique(['product_id', 'size']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
