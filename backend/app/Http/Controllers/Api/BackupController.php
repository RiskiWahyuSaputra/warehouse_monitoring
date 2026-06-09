<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\LowStockAlert;
use App\Mail\DailySummary;
use App\Mail\ApprovalRequestNotification;
use App\Models\ApprovalRequest;
use App\Models\InventoryItem;
use App\Models\StockMovement;
use App\Services\NotificationEmailService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class BackupController extends Controller
{
    private function backupPath(): string
    {
        return storage_path('app/backups');
    }

    public function index(): JsonResponse
    {
        $path = $this->backupPath();
        if (!File::exists($path)) {
            return response()->json([]);
        }

        $files = collect(File::files($path))
            ->filter(fn ($f) => $f->getExtension() === 'zip')
            ->map(fn ($f) => [
                'filename' => $f->getFilename(),
                'size' => $f->getSize(),
                'size_formatted' => $this->formatSize($f->getSize()),
                'created_at' => date('Y-m-d H:i:s', $f->getMTime()),
            ])
            ->sortByDesc('created_at')
            ->values();

        return response()->json($files);
    }

    public function store(Request $request): BinaryFileResponse|JsonResponse
    {
        $backupDir = $this->backupPath();
        if (!File::exists($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        $timestamp = date('Y-m-d_His');
        $filename = "backup_{$timestamp}.zip";
        $filepath = $backupDir . '/' . $filename;

        try {
            $zip = new ZipArchive();
            if ($zip->open($filepath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                return response()->json(['message' => 'Cannot create backup file'], 500);
            }

            $sqlDump = $this->dumpDatabase();
            $zip->addFromString("database_{$timestamp}.sql", $sqlDump);

            $storagePath = storage_path('app');
            $this->addFolderToZip($zip, $storagePath, 'storage', ['backups']);
            $zip->close();

            return response()->download($filepath, $filename, [
                'Content-Type' => 'application/zip',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ])->deleteFileAfterSend(false);

        } catch (\Exception $e) {
            if (File::exists($filepath)) {
                File::delete($filepath);
            }
            return response()->json(['message' => 'Backup failed: ' . $e->getMessage()], 500);
        }
    }

    public function download(string $filename): BinaryFileResponse|JsonResponse
    {
        if (!str_ends_with($filename, '.zip')) {
            return response()->json(['message' => 'Invalid file'], 400);
        }
        $filepath = $this->backupPath() . '/' . $filename;
        if (!File::exists($filepath)) {
            return response()->json(['message' => 'File not found'], 404);
        }
        return response()->download($filepath, $filename, ['Content-Type' => 'application/zip']);
    }

    public function destroy(string $filename): JsonResponse
    {
        if (!str_ends_with($filename, '.zip')) {
            return response()->json(['message' => 'Invalid file'], 400);
        }
        $filepath = $this->backupPath() . '/' . $filename;
        if (!File::exists($filepath)) {
            return response()->json(['message' => 'File not found'], 404);
        }
        File::delete($filepath);
        return response()->json(['message' => 'Backup deleted']);
    }

    /**
     * Send test email to current admin user.
     */
    public function testEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:low-stock,daily-summary,approval',
        ]);

        $user = $request->user();
        $type = $validated['type'];

        try {
            switch ($type) {
                case 'low-stock':
                    $items = InventoryItem::where('min_stock', '>', 0)
                        ->with('stockLevels')
                        ->take(3)
                        ->get()
                        ->map(fn ($item) => [
                            'item' => $item,
                            'current_stock' => $item->stockLevels->sum('quantity'),
                            'min_stock' => $item->min_stock,
                        ])->all();
                    Mail::to($user->email)->queue(new LowStockAlert($items, $user->name));
                    break;

                case 'daily-summary':
                    $stats = [
                        'total_items' => InventoryItem::count(),
                        'stockout_items' => 0,
                        'low_stock_items' => 0,
                        'pending_approvals' => ApprovalRequest::where('status', 'pending')->count(),
                        'today_in' => (int) StockMovement::where('type', 'in')->whereDate('created_at', Carbon::today())->sum('quantity'),
                        'today_out' => (int) StockMovement::where('type', 'out')->whereDate('created_at', Carbon::today())->sum('quantity'),
                    ];
                    Mail::to($user->email)->queue(new DailySummary($user->name, $stats, 'Daily', []));
                    break;

                case 'approval':
                    $approval = ApprovalRequest::with('requester', 'item')->first();
                    if ($approval) {
                        Mail::to($user->email)->queue(new ApprovalRequestNotification($approval, $user->name));
                    } else {
                        return response()->json(['message' => 'No approval requests found to test with'], 404);
                    }
                    break;
            }

            $driver = config('mail.default');
            return response()->json([
                'message' => "Test email ({$type}) sent via {$driver} driver to {$user->email}",
                'driver' => $driver,
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send test email: ' . $e->getMessage()], 500);
        }
    }

    private function dumpDatabase(): string
    {
        $connection = config('database.default');
        $dbConfig = config("database.connections.{$connection}");
        $host = $dbConfig['host'] ?? '127.0.0.1';
        $port = $dbConfig['port'] ?? 3306;
        $database = $dbConfig['database'] ?? '';
        $username = $dbConfig['username'] ?? 'root';
        $password = $dbConfig['password'] ?? '';

        $cmd = sprintf(
            'mysqldump --host=%s --port=%d --user=%s %s --single-transaction --routines --triggers --add-drop-table 2>&1',
            escapeshellarg($host), $port, escapeshellarg($username), escapeshellarg($database)
        );
        if (!empty($password)) {
            $cmd = sprintf(
                'mysqldump --host=%s --port=%d --user=%s --password=%s %s --single-transaction --routines --triggers --add-drop-table 2>&1',
                escapeshellarg($host), $port, escapeshellarg($username), escapeshellarg($password), escapeshellarg($database)
            );
        }

        $output = [];
        $rc = 0;
        exec($cmd, $output, $rc);
        return $rc === 0 ? implode("\n", $output) : $this->dumpDatabaseViaLaravel();
    }

    private function dumpDatabaseViaLaravel(): string
    {
        $tables = DB::select('SHOW TABLES');
        $sql = "-- Backup generated at " . date('Y-m-d H:i:s') . "\n-- Via Laravel fallback\n\nSET FOREIGN_KEY_CHECKS=0;\n\n";
        $dbName = config('database.connections.' . config('database.default') . '.database');

        foreach ($tables as $table) {
            $arr = (array) $table;
            $first = array_values($arr)[0] ?? 'unknown';
            $tableName = $table->{'Tables_in_' . $dbName} ?? $first;
            if ($tableName === 'migrations') continue;

            $create = DB::select("SHOW CREATE TABLE `{$tableName}`");
            $row = (array) ($create[0] ?? []);
            $sql .= "DROP TABLE IF EXISTS `{$tableName}`;\n" . ($row['Create Table'] ?? '') . ";\n\n";

            $rows = DB::select("SELECT * FROM `{$tableName}`");
            if (!empty($rows)) {
                $cols = array_keys((array) $rows[0]);
                $colList = implode('`, `', $cols);
                foreach ($rows as $r) {
                    $vals = array_map(fn ($v) => $v === null ? 'NULL' : "'" . addslashes($v) . "'", (array) $r);
                    $sql .= "INSERT INTO `{$tableName}` (`{$colList}`) VALUES (" . implode(', ', $vals) . ");\n";
                }
                $sql .= "\n";
            }
        }
        $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";
        return $sql;
    }

    private function addFolderToZip(ZipArchive $zip, string $folder, string $zipPath, array $excludeDirs = []): void
    {
        foreach (File::allFiles($folder) as $file) {
            $relPath = $file->getRelativePath();
            foreach ($excludeDirs as $ex) {
                if (str_starts_with($relPath, $ex)) continue 2;
            }
            $zip->addFile($file->getRealPath(), $zipPath . '/' . $relPath . '/' . $file->getFilename());
        }
    }

    private function formatSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        $size = $bytes;
        while ($size >= 1024 && $i < count($units) - 1) {
            $size /= 1024;
            $i++;
        }
        return round($size, 1) . ' ' . $units[$i];
    }
}
