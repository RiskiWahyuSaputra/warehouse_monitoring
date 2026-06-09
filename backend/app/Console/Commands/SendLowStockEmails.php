<?php

namespace App\Console\Commands;

use App\Services\NotificationEmailService;
use Illuminate\Console\Command;

class SendLowStockEmails extends Command
{
    protected $signature = 'emails:low-stock';
    protected $description = 'Send low stock alert emails to admin/manager';

    public function handle(NotificationEmailService $service): int
    {
        $this->info('Checking for low stock items...');
        $sent = $service->sendLowStockAlert();

        if ($sent === 0) {
            $this->info('No low stock items found or no recipients.');
        } else {
            $this->info("Sent low stock alerts to {$sent} recipient(s).");
        }

        return 0;
    }
}
