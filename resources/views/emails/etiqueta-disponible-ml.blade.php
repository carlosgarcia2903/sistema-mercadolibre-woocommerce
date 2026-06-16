<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #1a1a1a; background: #f5f5f5; margin: 0; padding: 0; }
        .wrapper { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .header { background: #16a34a; padding: 24px 32px; }
        .header h1 { margin: 0; font-size: 18px; color: #fff; }
        .body { padding: 24px 32px; font-size: 14px; line-height: 1.6; color: #374151; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-flex { background: #d1fae5; color: #065f46; }
        .badge-ml   { background: #dbeafe; color: #1e40af; }
        .note { margin-top: 16px; padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 13px; color: #15803d; }
        .footer { padding: 20px 32px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #f0f0f0; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>📎 Etiqueta de envío ya disponible</h1>
    </div>
    <div class="body">
        <p>
            La etiqueta de envío de la orden <strong>#{{ $orden['order_id'] }}</strong>
            (cliente: {{ $orden['customer'] ?? 'Sin nombre' }}) ya fue habilitada por MercadoLibre.
        </p>
        <p style="margin-top:10px;">
            Tipo de envío:
            @if ($orden['logistic_type'] === 'self_service')
                <span class="badge badge-flex">🚴 Flex</span>
            @else
                <span class="badge badge-ml">📦 Envío ML</span>
            @endif
        </p>

        @if (!empty($orden['pdf_path']))
            <div class="note">📎 La etiqueta va adjunta en este correo, lista para imprimir.</div>
        @else
            <div class="note">⚠️ La etiqueta aún no se pudo descargar, intenta revisar manualmente en MercadoLibre.</div>
        @endif
    </div>
    <div class="footer">
        Sistema GYC — sincronización automática de MercadoLibre
    </div>
</div>
</body>
</html>
