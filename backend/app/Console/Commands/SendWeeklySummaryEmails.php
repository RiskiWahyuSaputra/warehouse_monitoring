<?php

namespace App\Console\Commands;

use App\Services\NotificationEmailService;
use Illuminate\Console\Command;

class SendWeeklySummaryEmails extends Command
{
    protected $signature = 'emails:weekly-summary';
    protected $description = 'Send weekly summary emails to admin/manager';

    public function handle(NotificationEmailService $service): int
    {
        $this->info('Sending weekly summary emails...');
        $sent = $service->sendWeeklySummary();

        if ($sent === 0) {
            $this->info('No recipients found.');
        } else {
            $this->info("Sent weekly summary to {$sent} recipient(s).");
        }

        return 0;
    }
}
