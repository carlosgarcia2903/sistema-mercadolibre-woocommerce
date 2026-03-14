<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class MercadoLibreAuthController extends Controller
{
    public function callback(Request $request)
    {
        $code = $request->query('code');
        $verifier = $request->query('code_verifier');
        if (!$code) {
            return response()->json(['error' => 'Missing code'], 400);
        }
        if (!$verifier) {
            return response()->json(['error' => 'Missing code_verifier'], 400);
        }

        $response = Http::asJson()->post('https://api.mercadolibre.com/oauth/token', [
            'grant_type' => 'authorization_code',
            'client_id' => config('services.mercadolibre.client_id'),
            'client_secret' => config('services.mercadolibre.client_secret'),
            'code' => $code,
            'redirect_uri' => config('services.mercadolibre.redirect_uri'),
            'code_verifier' => $verifier,
        ]);

        if (!$response->successful()) {
            return response()->json([
                'error' => 'Token exchange failed',
                'details' => $response->json(),
            ], $response->status());
        }

        return response()->json($response->json());
    }
}
