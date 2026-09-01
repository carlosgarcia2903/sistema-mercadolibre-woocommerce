<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Catálogo inicial de "Venta en Tienda" (platform/source = 'presencial').
     * Se crean solo los nombres — talla, precio y foto se cargan después desde
     * la propia pantalla de POS (/pos), ya que esos datos son del negocio y no
     * corresponde inventarlos acá.
     */
    protected array $products = [
        'Body',
        'Body Beatle',
        'Camiseta',
        'Camiseta Beatle Panty',
        'Polera',
        'Polera Beatle',
        'Pantalón buzo',
        'Ajuar',
    ];

    public function up(): void
    {
        foreach ($this->products as $name) {
            $exists = DB::table('products')
                ->where('source', 'presencial')
                ->where('name', $name)
                ->exists();

            if (!$exists) {
                DB::table('products')->insert([
                    'name' => $name,
                    'source' => 'presencial',
                    'price' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('products')
            ->where('source', 'presencial')
            ->whereIn('name', $this->products)
            ->delete();
    }
};
