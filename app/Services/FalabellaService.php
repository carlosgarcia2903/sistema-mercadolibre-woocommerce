<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

/**
 * Cliente para la API de Falabella Seller Center.
 *
 * La API está basada en query-string con firma HMAC-SHA256. Cada petición
 * incluye los parámetros comunes (UserID, Action, Version, Timestamp, Format)
 * más una Signature calculada sobre esos parámetros usando el api_key como
 * secreto.
 *
 * @see https://developers.falabella.com/reference/getting-started
 * @see https://developers.falabella.com/reference/signing-requests
 */
class FalabellaService
{
    protected string $baseUrl;
    protected string $userId;
    protected string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.falabella.url'), '/');
        $this->userId  = (string) config('services.falabella.user_id');
        $this->apiKey  = (string) config('services.falabella.api_key');
    }

    /**
     * Construye los parámetros comunes y agrega la firma HMAC-SHA256.
     *
     * Pasos (según la doc de Falabella):
     *   1. Ordenar parámetros alfabéticamente por nombre.
     *   2. URL-encode (RFC 3986) de nombres y valores, unidos por '&'.
     *   3. Signature = hash_hmac('sha256', $concatenado, $api_key).
     */
    protected function buildParams(string $action, array $extra = []): array
    {
        $params = array_merge([
            'UserID'    => $this->userId,
            'Action'    => $action,
            'Version'   => '1.0',
            'Format'    => 'JSON',
            'Timestamp' => Carbon::now()->toIso8601String(),
        ], $extra);

        // La firma se calcula sobre los parámetros ordenados alfabéticamente.
        ksort($params);

        $concatenated = http_build_query($params, '', '&', PHP_QUERY_RFC3986);

        $params['Signature'] = hash_hmac('sha256', $concatenated, $this->apiKey, false);

        return $params;
    }

    protected function client()
    {
        // La API exige un User-Agent con formato Linio_SellerId/lenguaje/version.
        return Http::withHeaders([
            'User-Agent' => 'SistemaGYC/PHP/1.0',
        ])->acceptJson();
    }

    /**
     * Ejecuta una acción GET contra la API y devuelve el cuerpo decodificado.
     */
    protected function get(string $action, array $extra = []): array
    {
        $response = $this->client()->get(
            $this->baseUrl . '/',
            $this->buildParams($action, $extra)
        );

        $response->throw();

        return $response->json() ?? [];
    }

    /**
     * Lista órdenes creadas después de una fecha ISO 8601.
     *
     * @return array Lista de órdenes
     */
    public function getOrders(?string $createdAfter = null, int $offset = 0, int $limit = 100): array
    {
        $extra = [
            'Offset' => $offset,
            'Limit'  => $limit,
        ];

        if ($createdAfter) {
            $extra['CreatedAfter'] = $createdAfter;
        }

        $data = $this->get('GetOrders', $extra);

        $container = data_get($data, 'SuccessResponse.Body.Orders', []);

        return $this->extractRepeated($container, 'Order');
    }

    /**
     * Devuelve los ítems de una orden.
     *
     * @return array Lista de ítems
     */
    public function getOrderItems(int|string $orderId): array
    {
        $data = $this->get('GetOrderItems', ['OrderId' => (string) $orderId]);

        $container = data_get($data, 'SuccessResponse.Body.OrderItems', []);

        return $this->extractRepeated($container, 'OrderItem');
    }

    /**
     * Lista productos del catálogo del seller.
     *
     * @return array Lista de productos
     */
    public function getProducts(int $offset = 0, int $limit = 100): array
    {
        $data = $this->get('GetProducts', [
            'Offset' => $offset,
            'Limit'  => $limit,
        ]);

        $container = data_get($data, 'SuccessResponse.Body.Products', []);

        return $this->extractRepeated($container, 'Product');
    }

    /**
     * Obtiene un documento (etiqueta de envío o factura) en PDF.
     *
     * @param  array  $orderItemIds  IDs de los ítems de la orden
     * @param  string $type          shippingLabel | invoice | carrierManifest
     * @return string|null           Contenido binario del PDF, o null si no disponible
     */
    public function getDocument(array $orderItemIds, string $type = 'shippingLabel'): ?string
    {
        try {
            $data = $this->get('GetDocument', [
                'OrderItemIds' => '[' . implode(',', $orderItemIds) . ']',
                'DocumentType' => $type,
            ]);
        } catch (\Throwable) {
            return null;
        }

        $mime = data_get($data, 'SuccessResponse.Body.Documents.Document.MimeType');
        $file = data_get($data, 'SuccessResponse.Body.Documents.Document.File');

        if (!$file) {
            return null;
        }

        // El documento viene en base64.
        return base64_decode($file) ?: null;
    }

    /**
     * Normaliza respuestas que pueden venir como objeto único o como lista.
     */
    protected function normalizeList(mixed $value): array
    {
        if (empty($value)) {
            return [];
        }

        // Si es un array asociativo (un solo elemento), envolverlo en lista.
        if (array_is_list($value)) {
            return $value;
        }

        return [$value];
    }

    /**
     * Extrae una lista de elementos repetidos desde un contenedor que puede venir
     * en dos formatos distintos según el endpoint/momento (la API de Falabella es
     * inconsistente en cómo serializa listas al convertir de XML a JSON):
     *
     *   Formato A ("clásico"):  { "Order": [ {...}, {...} ] }         → 2+ elementos
     *                           { "Order": {...} }                    → 1 elemento
     *   Formato B ("wrapper"):  [ { "Order": {...} }, { "Order": {...} } ]
     *
     * @param  mixed  $container  Ej: SuccessResponse.Body.Orders
     * @param  string $itemKey    Ej: 'Order', 'OrderItem', 'Product'
     */
    protected function extractRepeated(mixed $container, string $itemKey): array
    {
        if (empty($container) || !is_array($container)) {
            return [];
        }

        // Formato A: el contenedor tiene la clave del ítem directamente.
        if (array_key_exists($itemKey, $container)) {
            return $this->normalizeList($container[$itemKey]);
        }

        // Formato B: lista de wrappers de un solo elemento cada uno.
        if (array_is_list($container)) {
            return collect($container)
                ->map(fn ($el) => (is_array($el) && array_key_exists($itemKey, $el)) ? $el[$itemKey] : $el)
                ->filter(fn ($el) => is_array($el))
                ->values()
                ->all();
        }

        return [];
    }
}
