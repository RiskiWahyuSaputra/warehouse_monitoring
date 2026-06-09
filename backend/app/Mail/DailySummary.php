<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DailySummary extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $recipientName,
        public array $stats, // ['total_items', 'stockout_items', 'low_stock_items', 'pending_approvals', 'today_in', 'today_out']
        public string $period,
        public array $topMovingItems = [],
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->period} Summary Report",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.daily-summary',
            with: [
                'recipientName' => $this->recipientName,
                'stats' => $this->stats,
                'period' => $this->period,
                'topMovingItems' => $this->topMovingItems,
            ],
        );
    }
}
