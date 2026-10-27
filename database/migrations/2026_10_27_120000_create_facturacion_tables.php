<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_documents', function (Blueprint $table) {
            $table->id();
            $table->string('direction', 10);
            $table->string('period', 6);
            $table->unsignedSmallInteger('tipo_dte');
            $table->string('tipo_label')->nullable();
            $table->string('folio', 30);
            $table->string('counterparty_rut', 15)->default('');
            $table->string('counterparty_name')->nullable();
            $table->string('operation_type')->nullable();
            $table->date('issued_at')->nullable();
            $table->dateTime('received_at')->nullable();
            $table->decimal('exempt_amount', 14, 2)->default(0);
            $table->decimal('net_amount', 14, 2)->default(0);
            $table->decimal('vat_amount', 14, 2)->default(0);
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->string('status')->nullable();
            $table->json('raw')->nullable();
            $table->timestamps();

            $table->unique(['direction', 'tipo_dte', 'folio', 'counterparty_rut'], 'tax_documents_unique');
            $table->index(['direction', 'period']);
        });

        Schema::create('tax_period_syncs', function (Blueprint $table) {
            $table->id();
            $table->string('direction', 10);
            $table->string('period', 6);
            $table->timestamp('synced_at')->nullable();
            $table->boolean('is_final')->default(false);
            $table->unsignedInteger('documents_count')->default(0);
            $table->json('summary')->nullable();
            $table->timestamps();

            $table->unique(['direction', 'period']);
        });

        Schema::create('tax_api_calls', function (Blueprint $table) {
            $table->id();
            $table->string('direction', 10);
            $table->string('period', 6);
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->boolean('consumed')->default(false);
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_api_calls');
        Schema::dropIfExists('tax_period_syncs');
        Schema::dropIfExists('tax_documents');
    }
};
