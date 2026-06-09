<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Daily forecast generation at 6:00 AM
Schedule::command('forecasts:generate')->dailyAt('06:00');

// Daily low stock check at 8:00 AM
Schedule::command('inventory:check-low-stock')->dailyAt('08:00');

// Daily backup at 2:00 AM (keep last 7 backups)
Schedule::command('backup:run --keep=7')->dailyAt('02:00');

// Daily low stock email alert at 9:00 AM
Schedule::command('emails:low-stock')->dailyAt('09:00');

// Daily summary email at 6:00 PM
Schedule::command('emails:daily-summary')->dailyAt('18:00');

// Weekly summary email every Monday at 7:00 AM
Schedule::command('emails:weekly-summary')->weeklyOn(1, '07:00');
