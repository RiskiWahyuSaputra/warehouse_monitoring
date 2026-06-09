<?php

namespace App\Mail;

use App\Models\ApprovalRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ApprovalRequestNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ApprovalRequest $approval,
        public string $recipientName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Approval Request: {$this->approval->item?->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.approval-request',
            with: [
                'approval' => $this->approval,
                'recipientName' => $this->recipientName,
                'itemName' => $this->approval->item?->name ?? 'Unknown',
                'requesterName' => $this->approval->requester?->name ?? 'Unknown',
                'quantity' => $this->approval->quantity,
            ],
        );
    }
}
