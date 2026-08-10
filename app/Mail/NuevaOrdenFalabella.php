<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class NuevaOrdenFalabella extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param array $orden Datos de la orden nueva (items, cliente, etiqueta)
     */
    public function __construct(public array $orden) {}

    public function envelope(): Envelope
    {
        $conPdf  = !empty($this->orden['pdf_path']) && Storage::disk('local')->exists($this->orden['pdf_path']);
        $subject = "🟢 Nueva orden Falabella #{$this->orden['order_id']}";
        if ($conPdf) {
            $subject .= ' 📎';
        }

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.nueva-orden-falabella',
        );
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
