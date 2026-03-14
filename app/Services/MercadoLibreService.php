<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MercadoLibreService
{
    protected string $baseUrl;
    protected string $accessToken;
    protected ?string $refreshToken;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.mercadolibre.url'), '/');
        $this->accessToken = config('services.mercadolibre.token');
        $this->refreshToken = config('services.mercadolibre.refresh_token');
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

    public function refreshAccessToken(): array
    {
        if (!$this->refreshToken) {
            throw new \RuntimeException('MERCADOLIBRE_REFRESH_TOKEN not set');
        }

        $response = Http::asJson()->post($this->baseUrl . '/oauth/token', [
            'grant_type' => 'refresh_token',
            'client_id' => config('services.mercadolibre.client_id'),
            'client_secret' => config('services.mercadolibre.client_secret'),
            'refresh_token' => $this->refreshToken,
        ]);

        $response->throw();
        return $response->json();
    }
}
