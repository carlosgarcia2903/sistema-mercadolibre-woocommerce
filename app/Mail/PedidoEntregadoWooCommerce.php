<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PedidoEntregadoWooCommerce extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Tu pedido #{$this->order->platform_order_id} ha sido entregado",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.pedido-entregado-woocommerce');
    }
}
