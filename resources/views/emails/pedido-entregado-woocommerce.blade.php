<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #1a1a1a; background: #f5f5f5; margin: 0; padding: 0; }
        .wrapper { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .header { background: #16a34a; padding: 24px 32px; }
        .header h1 { margin: 0; font-size: 20px; color: #fff; }
        .body { padding: 24px 32px; font-size: 14px; line-height: 1.6; color: #374151; }
        .order-id { font-weight: 600; color: #111827; }
        .footer { padding: 20px 32px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #f0f0f0; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>✅ Tu pedido ha sido entregado</h1>
    </div>
    <div class="body">
        <p>Hola {{ $order->customer_name ?: '' }},</p>
        <p>
            Te confirmamos que tu pedido <span class="order-id">#{{ $order->platform_order_id }}</span>
            ya fue entregado. ¡Gracias por tu compra!
        </p>
        <p>
            Si tienes alguna duda o algún problema con tu pedido, puedes responder este correo y te ayudaremos.
        </p>
    </div>
    <div class="footer">
        GYC Confecciones
    </div>
</div>
</body>
</html>
