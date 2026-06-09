<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LowStockAlert extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param array $items Array of ['item' => InventoryItem, 'current_stock' => int, 'min_stock' => int]
     * @param string $recipientName
     */
    public function __construct(
        public array $items,
        public string $recipientName,
    ) {}

    public function envelope(): Envelope
    {
        $count = count($this->items);
        return new Envelope(
            subject: "Low Stock Alert: {$count} item(s) need attention",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.low-stock-alert',
            with: [
                'items' => $this->items,
                'recipientName' => $this->recipientName,
                'count' => count($this->items),
            ],
        );
    }
}
