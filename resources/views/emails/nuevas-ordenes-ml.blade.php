<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #1a1a1a; background: #f5f5f5; margin: 0; padding: 0; }
        .wrapper { max-width: 640px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .header { background: #FFE600; padding: 24px 32px; }
        .header h1 { margin: 0; font-size: 20px; color: #1a1a1a; }
        .header p { margin: 4px 0 0; font-size: 13px; color: #555; }
        .body { padding: 24px 32px; }
        .orden { border: 1px solid #e5e5e5; border-radius: 6px; margin-bottom: 24px; overflow: hidden; }
        .orden-header { background: #f9f9f9; padding: 12px 16px; display: flex; justify-content: space-between; border-bottom: 1px solid #e5e5e5; }
        .orden-header strong { font-size: 14px; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-flex { background: #d1fae5; color: #065f46; }
        .badge-ml   { background: #dbeafe; color: #1e40af; }
        .orden-body { padding: 12px 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; color: #888; font-weight: 600; padding: 6px 8px; border-bottom: 1px solid #eee; }
        td { padding: 6px 8px; border-bottom: 1px solid #f3f3f3; }
        .orden-footer { background: #f9f9f9; padding: 10px 16px; font-size: 13px; color: #555; border-top: 1px solid #e5e5e5; }
        .pdf-note { font-size: 12px; color: #888; margin-top: 4px; }
        .footer { padding: 20px 32px; font-size: 12px; color: #aaa; text-align: center; border-top: 1px solid #f0f0f0; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>🛒 Nuevas órdenes de MercadoLibre</h1>
        <p>{{ now()->format('d/m/Y H:i') }} — {{ count($ordenes) }} orden(es) nueva(s) sincronizada(s)</p>
    </div>

    <div class="body">
        @foreach ($ordenes as $orden)
        <div class="orden">
            <div class="orden-header">
                <strong>Orden #{{ $orden['order_id'] }}</strong>
                @if ($orden['logistic_type'] === 'self_service')
                    <span class="badge badge-flex">🚴 Flex</span>
                @else
                    <span class="badge badge-ml">📦 Envío ML</span>
                @endif
            </div>

            <div class="orden-body">
                <p style="margin:0 0 8px; font-size:13px; color:#555;">
                    <strong>Cliente:</strong> {{ $orden['customer'] ?? 'Sin nombre' }}
                    &nbsp;|&nbsp;
                    <strong>Estado:</strong> {{ $orden['status'] ?? '-' }}
                </p>

                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Talla</th>
                            <th>Cant.</th>
                            <th>Precio unit.</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($orden['items'] as $item)
                        <tr>
                            <td>{{ $item['name'] }}</td>
                            <td>{{ $item['size'] ?? '-' }}</td>
                            <td>{{ $item['quantity'] }}</td>
                            <td>${{ number_format($item['unit_price'], 0, ',', '.') }}</td>
                            <td>${{ number_format($item['total'], 0, ',', '.') }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

            <div class="orden-footer">
                <strong>Total orden:</strong> ${{ number_format($orden['total'], 0, ',', '.') }}
                @if (!empty($orden['pdf_path']))
                    <div class="pdf-note">📎 Etiqueta de envío adjunta en este correo.</div>
                @else
                    <div class="pdf-note">⚠️ Etiqueta de envío aún no disponible.</div>
                @endif
            </div>
        </div>
        @endforeach
    </div>

    <div class="footer">
        Sistema GYC — sincronización automática de MercadoLibre
    </div>
</div>
</body>
</html>
