<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class SimpleApiProbe extends Command
{
    protected $signature = 'simpleapi:probe {tipo : compras|ventas} {mes} {anio}';

    protected $description = 'Consulta una vez el RCV en SimpleAPI y guarda la respuesta cruda en storage/app/simpleapi (consume 1 petición del plan)';

    public function handle(): int
    {
        $cfg = config('services.simpleapi');
        foreach (['api_key', 'rut_empresa', 'rut_usuario', 'password'] as $k) {
            if (!$cfg[$k]) {
                $this->error("Falta configurar {$k} en el .env (SIMPLEAPI_KEY, SII_RUT_EMPRESA, SII_RUT_USUARIO, SII_PASSWORD).");
                return self::FAILURE;
            }
        }

        $tipo = $this->argument('tipo');
        if (!in_array($tipo, ['compras', 'ventas'], true)) {
            $this->error('tipo debe ser compras o ventas');
            return self::FAILURE;
        }

        $url = rtrim($cfg['url'], '/') . "/api/RCVEmpresas/{$tipo}/" . (int) $this->argument('mes') . '/' . (int) $this->argument('anio');

        $response = Http::asMultipart()
            ->withHeaders(['Authorization' => $cfg['api_key']])
            ->timeout(120)
            ->post($url, [[
                'name' => 'input',
                'contents' => json_encode([
                    'RutEmpresa' => $cfg['rut_empresa'],
                    'RutUsuario' => $cfg['rut_usuario'],
                    'PasswordSII' => $cfg['password'],
                    'Ambiente' => 1,
                    'ProcesaBoletas' => true,
                ]),
            ]]);

        $this->info('HTTP ' . $response->status());

        $path = "simpleapi/{$tipo}-" . (int) $this->argument('anio') . '-' . str_pad((string) (int) $this->argument('mes'), 2, '0', STR_PAD_LEFT) . '.json';
        Storage::put($path, $response->body());
        $this->info('Respuesta guardada en storage/app/' . $path);

        $json = $response->json();
        if (is_array($json)) {
            $this->line('Claves de primer nivel: ' . implode(', ', array_keys($json)));
        }

        return $response->successful() ? self::SUCCESS : self::FAILURE;
    }
}
