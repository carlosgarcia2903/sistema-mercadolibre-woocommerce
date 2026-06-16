<?php

namespace App\Mail;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NuevaOrdenWooCommerce extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public array $order) {}

    public function envelope(): Envelope
    {
        $nombre = trim(($this->order['billing']['first_name'] ?? '') . ' ' . ($this->order['billing']['last_name'] ?? ''));
        return new Envelope(
            subject: "🛍️ Nueva orden WooCommerce #{$this->order['id']} — {$nombre}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.nueva-orden-woocommerce');
    }

    public function attachments(): array
    {
        $pdf = Pdf::loadView('pdfs.orden-woocommerce', ['order' => $this->order]);

        return [
            Attachment::fromData(fn () => $pdf->output(), "orden-{$this->order['id']}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
