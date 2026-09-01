<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0)->after('size');
        });

        // Backfill: conservar el orden actual (por id) como orden inicial de arrastre.
        DB::table('product_variants')
            ->orderBy('product_id')
            ->orderBy('id')
            ->get(['id', 'product_id'])
            ->groupBy('product_id')
            ->each(function ($variants) {
                $i = 0;
                foreach ($variants as $variant) {
                    DB::table('product_variants')->where('id', $variant->id)->update(['sort_order' => $i++]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });
    }
};
