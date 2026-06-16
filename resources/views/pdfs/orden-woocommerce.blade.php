<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }
        .page { padding: 32px; }

        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #7c3aed; }
        .company-name { font-size: 22px; font-weight: bold; color: #7c3aed; }
        .company-sub { font-size: 11px; color: #777; margin-top: 2px; }
        .order-info { text-align: right; }
        .order-number { font-size: 18px; font-weight: bold; color: #1a1a1a; }
        .order-date { font-size: 11px; color: #777; margin-top: 2px; }
        .order-status { display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; background: #ede9fe; color: #5b21b6; }

        .cols { display: flex; gap: 16px; margin-bottom: 20px; }
        .col { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
        .col-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px; }
        .col p { font-size: 12px; line-height: 1.7; color: #374151; }
        .col strong { color: #111827; }

        .badge-retiro { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: bold; background: #fef3c7; color: #92400e; }

        .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        thead tr { background: #7c3aed; color: #fff; }
        thead th { padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; }
        tbody tr:nth-child(even) { background: #f9fafb; }
        tbody td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }

        .totals { margin-left: auto; width: 260px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 24px; }
        .totals-row { display: flex; justify-content: space-between; padding: 7px 14px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
        .totals-row:last-child { border-bottom: none; background: #7c3aed; color: #fff; font-weight: bold; font-size: 13px; }
        .totals-label { color: #6b7280; }
        .totals-row:last-child .totals-label { color: #fff; }

        .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af; }
    </style>
</head>
<body>
<div class="page">

    {{-- Header --}}
    <div class="header">
        <div>
            <div class="company-name">GYC Confecciones</div>
            <div class="company-sub">gycconfecciones.cl</div>
        </div>
        <div class="order-info">
            <div class="order-number">Orden #{{ $order['id'] }}</div>
            <div class="order-date">{{ \Carbon\Carbon::parse($order['date_created'])->format('d/m/Y H:i') }}</div>
            <span class="order-status">{{ strtoupper($order['status']) }}</span>
        </div>
    </div>

    @php
        // Detectar si es retiro local
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
            <div class="col-title">Datos de Facturación</div>
            <p>
                <strong>{{ $order['billing']['first_name'] }} {{ $order['billing']['last_name'] }}</strong><br>
                @if(!empty($order['billing']['company'])) {{ $order['billing']['company'] }}<br> @endif
                {{ $order['billing']['address_1'] }}@if(!empty($order['billing']['address_2'])), {{ $order['billing']['address_2'] }}@endif<br>
                {{ $order['billing']['city'] }}, {{ $order['billing']['state'] }} {{ $order['billing']['postcode'] }}<br>
                @if(!empty($order['billing']['phone'])) Tel: {{ $order['billing']['phone'] }}<br> @endif
                {{ $order['billing']['email'] }}
            </p>
        </div>

        <div class="col">
            @if($isPickup)
                <div class="col-title">Retiro en Tienda &nbsp;<span class="badge-retiro">🏪 Retiro Local</span></div>
                <p>
                    <strong>{{ $shippingLine['method_title'] ?? 'Retiro Local' }}</strong><br>
                    @if(!empty($pickupMeta['pickup_address'])) 📍 {{ $pickupMeta['pickup_address'] }}<br> @endif
                    @if(!empty($pickupMeta['pickup_details'])) {{ $pickupMeta['pickup_details'] }}<br> @endif
                    @if(!empty($pickupMeta['pickup_location'])) Punto: {{ $pickupMeta['pickup_location'] }} @endif
                </p>
            @else
                <div class="col-title">Datos de Envío</div>
                <p>
                    <strong>{{ $order['shipping']['first_name'] }} {{ $order['shipping']['last_name'] }}</strong><br>
                    @if(!empty($order['shipping']['company'])) {{ $order['shipping']['company'] }}<br> @endif
                    {{ $order['shipping']['address_1'] }}@if(!empty($order['shipping']['address_2'])), {{ $order['shipping']['address_2'] }}@endif<br>
                    {{ $order['shipping']['city'] }}, {{ $order['shipping']['state'] }} {{ $order['shipping']['postcode'] }}<br>
                    @if(!empty($order['shipping']['phone'])) Tel: {{ $order['shipping']['phone'] }} @endif
                </p>
            @endif
        </div>

        <div class="col">
            <div class="col-title">Pago</div>
            <p>
                <strong>{{ $order['payment_method_title'] ?? '-' }}</strong><br>
                @if(!empty($order['transaction_id']))
                    ID: {{ $order['transaction_id'] }}
                @endif
            </p>
        </div>
    </div>

    {{-- Productos --}}
    <div class="section-title">Detalle de Productos</div>
    <table>
        <thead>
            <tr>
                <th>Producto</th>
                <th class="text-center">Talla</th>
                <th class="text-center">Cant.</th>
                <th class="text-right">Precio unit.</th>
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
                <td>
                    {{ $item['name'] }}
                    @if(!empty($item['sku'])) <br><span style="font-size:10px;color:#9ca3af">SKU: {{ $item['sku'] }}</span> @endif
                </td>
                <td class="text-center">{{ $talla ?? '-' }}</td>
                <td class="text-center">{{ $item['quantity'] }}</td>
                <td class="text-right">${{ number_format($item['price'], 0, ',', '.') }}</td>
                <td class="text-right">${{ number_format($item['total'], 0, ',', '.') }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Totales --}}
    <div class="totals">
        @php $subtotal = array_sum(array_column($order['line_items'], 'total')); @endphp
        <div class="totals-row">
            <span class="totals-label">Subtotal</span>
            <span>${{ number_format($subtotal, 0, ',', '.') }}</span>
        </div>
        @if(!$isPickup && !empty($order['shipping_total']) && (float)$order['shipping_total'] > 0)
        <div class="totals-row">
            <span class="totals-label">Envío</span>
            <span>${{ number_format($order['shipping_total'], 0, ',', '.') }}</span>
        </div>
        @endif
        @if($isPickup)
        <div class="totals-row">
            <span class="totals-label">Envío</span>
            <span>Retiro en tienda</span>
        </div>
        @endif
        @if(!empty($order['discount_total']) && (float)$order['discount_total'] > 0)
        <div class="totals-row">
            <span class="totals-label">Descuento</span>
            <span>-${{ number_format($order['discount_total'], 0, ',', '.') }}</span>
        </div>
        @endif
        <div class="totals-row">
            <span class="totals-label">TOTAL</span>
            <span>${{ number_format($order['total'], 0, ',', '.') }} {{ $order['currency'] }}</span>
        </div>
    </div>

    @if(!empty($order['customer_note']))
    <div class="col" style="margin-bottom:20px;">
        <div class="col-title">Nota del Cliente</div>
        <p>{{ $order['customer_note'] }}</p>
    </div>
    @endif

    <div class="footer">
        Documento generado por Sistema GYC — {{ now()->format('d/m/Y H:i') }}
    </div>
</div>
</body>
</html>
