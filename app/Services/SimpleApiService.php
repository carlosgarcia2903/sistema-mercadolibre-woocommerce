<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class SimpleApiService
{
    public function isConfigured(): bool
    {
        $c = config('services.simpleapi');

        return $c['api_key'] && $c['rut_empresa'] && $c['rut_usuario'] && $c['password'];
    }

    /** Una petición = un mes de compras o de ventas (cuenta contra la cuota del plan). */
    public function fetchRcv(string $direction, int $month, int $year): Response
    {
        $c = config('services.simpleapi');
        $url = rtrim($c['url'], '/') . "/api/RCVEmpresas/{$direction}/{$month}/{$year}";

        return Http::asMultipart()
            ->withHeaders(['Authorization' => $c['api_key']])
            ->timeout(120)
            ->post($url, [[
                'name' => 'input',
                'contents' => json_encode([
                    'RutEmpresa' => $c['rut_empresa'],
                    'RutUsuario' => $c['rut_usuario'],
                    'PasswordSII' => $c['password'],
                    'Ambiente' => 1,
                    'ProcesaBoletas' => true,
                ]),
            ]]);
    }
}
