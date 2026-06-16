<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WooCommerceService
{
    protected string $baseUrl;
    protected string $consumerKey;
    protected string $consumerSecret;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.woocommerce.url'), '/');
        $this->consumerKey = config('services.woocommerce.key');
        $this->consumerSecret = config('services.woocommerce.secret');
    }

    protected function client()
    {
        return Http::withBasicAuth($this->consumerKey, $this->consumerSecret)
            ->acceptJson();
    }

    public function fetchProducts(int $page = 1, int $perPage = 50): array
    {
        $response = $this->client()->get($this->baseUrl . '/wp-json/wc/v3/products', [
            'page' => $page,
            'per_page' => $perPage,
        ]);

        $response->throw();
        return $response->json();
    }

    public function updateOrderStatus(string|int $orderId, string $status): array
    {
        $response = $this->client()
            ->put($this->baseUrl . '/wp-json/wc/v3/orders/' . $orderId, [
                'status' => $status,
            ]);

        $response->throw();
        return $response->json();
    }

    public function fetchOrders(int $page = 1, int $perPage = 50, ?string $after = null): array
    {
        $params = [
            'page' => $page,
            'per_page' => $perPage,
        ];
        if ($after) {
            $params['after'] = $after; // ISO8601
        }

        $response = $this->client()->get($this->baseUrl . '/wp-json/wc/v3/orders', $params);
        $response->throw();
        return $response->json();
    }
}
