<?php

namespace App\Console\Commands;

use App\Services\NotificationEmailService;
use Illuminate\Console\Command;

class SendDailySummaryEmails extends Command
{
    protected $signature = 'emails:daily-summary';
    protected $description = 'Send daily summary emails to admin/manager';

    public function handle(NotificationEmailService $service): int
    {
        $this->info('Sending daily summary emails...');
        $sent = $service->sendDailySummary();

        if ($sent === 0) {
            $this->info('No recipients found.');
        } else {
            $this->info("Sent daily summary to {$sent} recipient(s).");
        }

        return 0;
    }
}
