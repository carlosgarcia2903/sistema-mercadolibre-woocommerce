<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class EtiquetaDisponibleMl extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param array $orden  ['order_id', 'customer', 'logistic_type', 'pdf_path']
     */
    public function __construct(public array $orden) {}

    public function envelope(): Envelope
    {
        $tipo = $this->orden['logistic_type'] === 'self_service' ? 'Flex' : 'Envío ML';
        return new Envelope(
            subject: "📎 Etiqueta disponible — Orden #{$this->orden['order_id']} ({$tipo})",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.etiqueta-disponible-ml');
    }

    public function attachments(): array
    {
        if (!empty($this->orden['pdf_path']) && Storage::disk('local')->exists($this->orden['pdf_path'])) {
            return [
                Attachment::fromStorageDisk('local', $this->orden['pdf_path'])
                    ->as("etiqueta-{$this->orden['order_id']}.pdf")
                    ->withMime('application/pdf'),
            ];
        }

        return [];
    }
}
