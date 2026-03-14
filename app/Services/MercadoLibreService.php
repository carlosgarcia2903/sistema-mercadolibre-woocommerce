<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MercadoLibreService
{
    protected string $baseUrl;
    protected string $accessToken;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.mercadolibre.url'), '/');
        $this->accessToken = config('services.mercadolibre.token');
    }

    protected function client()
    {
        return Http::withToken($this->accessToken)->acceptJson();
    }

    public function searchOrders(string $sellerId, int $offset = 0, int $limit = 50): array
    {
        $response = $this->client()->get($this->baseUrl . '/orders/search', [
            'seller' => $sellerId,
            'offset' => $offset,
            'limit' => $limit,
        ]);

        $response->throw();
        return $response->json();
    }

    public function getShipmentLabel(int|string $shipmentId): string
    {
        $response = $this->client()->get($this->baseUrl . "/shipments/{$shipmentId}/labels", [
            'format' => 'pdf',
        ]);

        $response->throw();
        return $response->body();
    }
}
