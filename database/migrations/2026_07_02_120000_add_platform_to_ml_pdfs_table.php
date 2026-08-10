<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ml_pdfs', function (Blueprint $table) {
            // Identifica la plataforma del documento de envío.
            // Las filas existentes son todas de MercadoLibre.
            $table->string('platform')->default('mercadolibre')->index()->after('order_id');
        });
    }

    public function down(): void
    {
        Schema::table('ml_pdfs', function (Blueprint $table) {
            $table->dropColumn('platform');
        });
    }
};
