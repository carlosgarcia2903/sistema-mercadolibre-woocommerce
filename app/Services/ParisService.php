<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Cliente para la API de Paris Marketplace (Cencosud).
 *
 * NO es Mirakl (a diferencia de lo que sugería la documentación pública de
 * Cencosud/Contabilium) — es una API REST propia sobre NestJS, descubierta
 * por sondeo real de endpoints:
 *
 *   Base URL: https://api-developers.ecomm.cencosud.com  (config: services.paris.url)
 *   Auth:     Authorization: Bearer {API_KEY}
 *   Órdenes:  GET /v1/orders → { data: Order[], count: N }
 *
 * Cada "orden" en la respuesta agrupa una o más "subOrders" (envíos), y cada
 * subOrder trae sus `items` y su `label` (URLs directas a PDF/ZPL de la
 * etiqueta) ya incluidos — no hace falta una llamada aparte para ítems ni
 * para documentos, a diferencia de Falabella.
 *
 * El identificador estable de la orden es `originOrderNumber` — el campo
 * `id` de nivel orden cambia entre llamadas (no usar como platform_order_id).
 *
 * Los parámetros de fecha/paginación (`dateFrom`, `limit`, `page`, etc.) NO
 * tienen efecto verificado en esta API (se probó exhaustivamente y el
 * servidor los ignora), así que `getOrders()` trae todo y el filtrado por
 * fecha se hace del lado del cliente en SyncParis.
 */
class ParisService
{
    protected string $baseUrl;
    protected string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.paris.url'), '/');
        $this->apiKey  = (string) config('services.paris.api_key');
    }

    protected function client()
    {
        return Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
        ])->acceptJson();
    }

    /**
     * Trae todas las órdenes disponibles. El servidor no pagina de forma
     * verificable, así que se devuelve `data` completo tal cual.
     *
     * @return array Lista de órdenes crudas de la API
     */
    public function getOrders(): array
    {
        $response = $this->client()->timeout(30)->get($this->baseUrl . '/v1/orders');

        $response->throw();

        $data = $response->json() ?? [];

        return is_array($data['data'] ?? null) ? $data['data'] : [];
    }

    /**
     * Descarga el binario de un documento (etiqueta) desde su URL directa.
     * Estas URLs vienen embebidas en la orden (subOrders[].label[].url) y
     * son de un host de archivos estáticos separado — no requieren el
     * header Authorization de la API principal.
     */
    public function downloadLabel(string $url): ?string
    {
        try {
            $response = Http::timeout(20)->get($url);
        } catch (\Throwable) {
            return null;
        }

        if (!$response->successful()) {
            return null;
        }

        return $response->body() ?: null;
    }
}
