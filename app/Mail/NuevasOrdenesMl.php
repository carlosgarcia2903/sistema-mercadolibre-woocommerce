<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class NuevasOrdenesMl extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param array $ordenes  Lista de órdenes nuevas con sus items y datos de envío
     */
    public function __construct(public array $ordenes) {}

    public function envelope(): Envelope
    {
        $cantidad = count($this->ordenes);
        return new Envelope(
            subject: "🛒 {$cantidad} orden(es) nueva(s) de MercadoLibre",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.nuevas-ordenes-ml',
        );
    }

    public function attachments(): array
    {
        $adjuntos = [];

        foreach ($this->ordenes as $orden) {
            if (!empty($orden['pdf_path']) && Storage::disk('local')->exists($orden['pdf_path'])) {
                $adjuntos[] = Attachment::fromStorageDisk('local', $orden['pdf_path'])
                    ->as("etiqueta-{$orden['order_id']}.pdf")
                    ->withMime('application/pdf');
            }
        }

        return $adjuntos;
    }
}
