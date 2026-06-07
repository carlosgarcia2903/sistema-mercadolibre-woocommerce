<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\File;

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

    protected function requestWithAutoRefresh(callable $request)
    {
        $response = $request();

        if ($response->status() !== 401) {
            return $response;
        }

        $this->refreshAccessToken(true);

        return $request();
    }

    public function searchOrders(string $sellerId, int $offset = 0, int $limit = 50, ?string $after = null): array
    {
        $response = $this->requestWithAutoRefresh(function () use ($sellerId, $offset, $limit, $after) {
            $params = [
                'seller' => $sellerId,
                'offset' => $offset,
                'limit'  => $limit,
            ];

            if ($after) {
                $params['order.date_created.from'] = $after;
            }

            return $this->client()->get($this->baseUrl . '/orders/search', $params);
        });

        $response->throw();
        return $response->json();
    }

    public function getShipmentLabel(int|string $shipmentId): ?string
    {
        $response = $this->requestWithAutoRefresh(function () use ($shipmentId) {
            return $this->client()->get($this->baseUrl . '/shipment_labels', [
                'shipment_ids' => (string) $shipmentId,
                'response_type' => 'pdf',
            ]);
        });

        if ($response->status() === 404) {
            return null;
        }

        // Mercado Libre devuelve 400 con failed_shipments cuando la etiqueta
        // aun no esta disponible para el estado logístico actual.
        if ($response->status() === 400 && isset($response->json()['failed_shipments'])) {
            return null;
        }

        $response->throw();
        return $response->body();
    }

    public function getShipment(int|string $shipmentId): array
    {
        $response = $this->requestWithAutoRefresh(function () use ($shipmentId) {
            return $this->client()->get($this->baseUrl . '/shipments/' . $shipmentId);
        });

        if ($response->status() === 404) {
            return [];
        }

        $response->throw();
        return $response->json();
    }

    public function refreshAccessToken(bool $persistInEnv = false): array
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
        $data = $response->json();

        $this->accessToken = $data['access_token'] ?? $this->accessToken;
        $this->refreshToken = $data['refresh_token'] ?? $this->refreshToken;

        config([
            'services.mercadolibre.token' => $this->accessToken,
            'services.mercadolibre.refresh_token' => $this->refreshToken,
        ]);

        if ($persistInEnv) {
            $this->persistTokensInEnv();
        }

        return $data;
    }

    protected function persistTokensInEnv(): void
    {
        $envPath = base_path('.env');
        if (!File::exists($envPath)) {
            return;
        }

        $env = File::get($envPath);

        if (preg_match('/^MERCADOLIBRE_TOKEN=.*$/m', $env)) {
            $env = preg_replace('/^MERCADOLIBRE_TOKEN=.*$/m', 'MERCADOLIBRE_TOKEN='.$this->accessToken, $env);
        } else {
            $env .= PHP_EOL.'MERCADOLIBRE_TOKEN='.$this->accessToken;
        }

        if ($this->refreshToken) {
            if (preg_match('/^MERCADOLIBRE_REFRESH_TOKEN=.*$/m', $env)) {
                $env = preg_replace('/^MERCADOLIBRE_REFRESH_TOKEN=.*$/m', 'MERCADOLIBRE_REFRESH_TOKEN='.$this->refreshToken, $env);
            } else {
                $env .= PHP_EOL.'MERCADOLIBRE_REFRESH_TOKEN='.$this->refreshToken;
            }
        }

        File::put($envPath, $env);
    }
}
