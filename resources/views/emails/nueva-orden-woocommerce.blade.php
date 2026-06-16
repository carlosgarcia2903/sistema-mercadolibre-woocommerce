<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #1a1a1a; background: #f5f5f5; margin: 0; padding: 0; }
        .wrapper { max-width: 620px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .header { background: #7c3aed; padding: 24px 32px; }
        .header h1 { margin: 0; font-size: 20px; color: #fff; }
        .header p { margin: 4px 0 0; font-size: 13px; color: #ddd6fe; }
        .body { padding: 24px 32px; }
        .cols { display: flex; gap: 16px; margin-bottom: 20px; }
        .col { flex: 1; background: #f9fafb; border-radius: 6px; padding: 12px; font-size: 13px; line-height: 1.7; }
        .col-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin-bottom: 6px; }
        .badge-retiro { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: bold; background: #fef3c7; color: #92400e; }
        .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead tr { background: #7c3aed; color: #fff; }
        th { padding: 8px 10px; text-align: left; font-size: 12px; }
        td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row td { background: #f9fafb; font-weight: bold; }
        .pdf-note { margin-top: 20px; padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 13px; color: #15803d; }
        .footer { padding: 20px 32px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #f0f0f0; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>🛍️ Nueva orden #{{ $order['id'] }}</h1>
        <p>
            {{ \Carbon\Carbon::parse($order['date_created'])->format('d/m/Y H:i') }}
            &nbsp;·&nbsp;
            <span style="background:#5b21b6;padding:2px 8px;border-radius:20px;font-size:11px;">{{ strtoupper($order['status']) }}</span>
        </p>
    </div>

    <div class="body">
        @php
            $shippingLine = $order['shipping_lines'][0] ?? null;
            $isPickup = $shippingLine && str_contains(strtolower($shippingLine['method_id'] ?? ''), 'pickup');
            $pickupMeta = [];
            foreach ($shippingLine['meta_data'] ?? [] as $m) {
                $pickupMeta[$m['key']] = html_entity_decode($m['value'] ?? '');
            }
        @endphp

        {{-- Facturación + Envío/Retiro --}}
        <div class="cols">
            <div class="col">
                <div class="col-title">Facturación</div>
                <strong>{{ $order['billing']['first_name'] }} {{ $order['billing']['last_name'] }}</strong><br>
                {{ $order['billing']['address_1'] }}, {{ $order['billing']['city'] }}<br>
                @if(!empty($order['billing']['phone'])) {{ $order['billing']['phone'] }}<br> @endif
                {{ $order['billing']['email'] }}
            </div>

            <div class="col">
                @if($isPickup)
                    <div class="col-title">Retiro &nbsp;<span class="badge-retiro">🏪 Retiro Local</span></div>
                    <strong>{{ $shippingLine['method_title'] ?? 'Retiro en tienda' }}</strong><br>
                    @if(!empty($pickupMeta['pickup_address'])) 📍 {{ $pickupMeta['pickup_address'] }}<br> @endif
                    @if(!empty($pickupMeta['pickup_details'])) {{ $pickupMeta['pickup_details'] }} @endif
                @else
                    <div class="col-title">Envío</div>
                    <strong>{{ $order['shipping']['first_name'] }} {{ $order['shipping']['last_name'] }}</strong><br>
                    {{ $order['shipping']['address_1'] }}, {{ $order['shipping']['city'] }}<br>
                    {{ $order['shipping']['state'] }}, {{ $order['shipping']['postcode'] }}
                @endif
            </div>
        </div>

        {{-- Productos --}}
        <div class="section-title">Productos</div>
        <table>
            <thead>
                <tr>
                    <th>Producto</th>
                    <th class="text-center">Talla</th>
                    <th class="text-center">Cant.</th>
                    <th class="text-right">Precio</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($order['line_items'] as $item)
                @php
                    $talla = null;
                    foreach ($item['meta_data'] ?? [] as $meta) {
                        if (str_contains(strtolower($meta['key'] ?? ''), 'talla')) {
                            $talla = is_array($meta['value']) ? implode(', ', $meta['value']) : $meta['value'];
                            break;
                        }
                    }
                @endphp
                <tr>
                    <td>{{ $item['name'] }}</td>
                    <td class="text-center">{{ $talla ?? '-' }}</td>
                    <td class="text-center">{{ $item['quantity'] }}</td>
                    <td class="text-right">${{ number_format($item['price'], 0, ',', '.') }}</td>
                    <td class="text-right">${{ number_format($item['total'], 0, ',', '.') }}</td>
                </tr>
                @endforeach
                @if(!$isPickup && !empty($order['shipping_total']) && (float)$order['shipping_total'] > 0)
                <tr>
                    <td colspan="4" class="text-right" style="color:#6b7280;font-size:12px;">Envío</td>
                    <td class="text-right">${{ number_format($order['shipping_total'], 0, ',', '.') }}</td>
                </tr>
                @endif
                @if($isPickup)
                <tr>
                    <td colspan="4" class="text-right" style="color:#6b7280;font-size:12px;">Envío</td>
                    <td class="text-right" style="color:#92400e;font-weight:600;">Retiro en tienda</td>
                </tr>
                @endif
                <tr class="total-row">
                    <td colspan="4" class="text-right">TOTAL</td>
                    <td class="text-right">${{ number_format($order['total'], 0, ',', '.') }} {{ $order['currency'] }}</td>
                </tr>
            </tbody>
        </table>

        <p style="font-size:13px;color:#555;margin-top:4px;">
            <strong>Método de pago:</strong> {{ $order['payment_method_title'] ?? '-' }}
        </p>

        <div class="pdf-note">
            📎 Se adjunta el comprobante completo de la orden en formato PDF.
        </div>
    </div>

    <div class="footer">
        Sistema GYC — WooCommerce · gycconfecciones.cl
    </div>
</div>
</body>
</html>
