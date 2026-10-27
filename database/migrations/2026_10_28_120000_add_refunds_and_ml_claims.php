<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('refunded_amount', 12, 2)->default(0)->after('received_amount');
        });

        Schema::create('ml_claims', function (Blueprint $table) {
            $table->id();
            $table->string('claim_id', 30)->unique();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('resource', 20)->nullable();
            $table->string('resource_id', 30)->nullable();
            $table->string('type', 30)->nullable();
            $table->string('stage', 20)->nullable();
            $table->string('status', 20)->nullable();
            $table->string('reason_id', 30)->nullable();
            $table->boolean('needs_action')->default(false);
            $table->string('resolution_reason')->nullable();
            $table->string('resolution_benefited')->nullable();
            $table->string('resolution_closed_by')->nullable();
            $table->string('return_status')->nullable();
            $table->string('return_subtype')->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('last_updated_at')->nullable();
            $table->json('raw')->nullable();
            $table->timestamps();

            $table->index(['status', 'needs_action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ml_claims');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('refunded_amount');
        });
    }
};
