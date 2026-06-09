<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class BackupController extends Controller
{
    /**
     * Path untuk menyimpan backup files.
     */
    private function backupPath(): string
    {
        return storage_path('app/backups');
    }

    /**
     * List semua backup yang tersedia.
     */
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

    /**
     * Buat backup baru (DB dump + storage folder) dan return sebagai download.
     */
    public function store(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
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

            // 1. Dump database
            $sqlDump = $this->dumpDatabase();
            $zip->addFromString("database_{$timestamp}.sql", $sqlDump);

            // 2. Backup storage/app (kecuali folder backups sendiri)
            $storagePath = storage_path('app');
            $this->addFolderToZip($zip, $storagePath, 'storage', ['backups']);

            $zip->close();

            // Return file sebagai download
            return response()->download($filepath, $filename, [
                'Content-Type' => 'application/zip',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ])->deleteFileAfterSend(false);

        } catch (\Exception $e) {
            // Cleanup jika gagal
            if (File::exists($filepath)) {
                File::delete($filepath);
            }
            return response()->json(['message' => 'Backup failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Download backup yang sudah ada.
     */
    public function download(string $filename): \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
    {
        // Security: hanya izinkan .zip
        if (!str_ends_with($filename, '.zip')) {
            return response()->json(['message' => 'Invalid file'], 400);
        }

        $filepath = $this->backupPath() . '/' . $filename;

        if (!File::exists($filepath)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        return response()->download($filepath, $filename, [
            'Content-Type' => 'application/zip',
        ]);
    }

    /**
     * Hapus backup.
     */
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
     * Dump database MySQL ke SQL string.
     */
    private function dumpDatabase(): string
    {
        $connection = config('database.default');
        $dbConfig = config("database.connections.{$connection}");

        $host = $dbConfig['host'] ?? '127.0.0.1';
        $port = $dbConfig['port'] ?? 3306;
        $database = $dbConfig['database'] ?? '';
        $username = $dbConfig['username'] ?? 'root';
        $password = $dbConfig['password'] ?? '';

        // Build mysqldump command
        $command = sprintf(
            'mysqldump --host=%s --port=%d --user=%s %s --single-transaction --routines --triggers --add-drop-table 2>&1',
            escapeshellarg($host),
            $port,
            escapeshellarg($username),
            escapeshellarg($database)
        );

        if (!empty($password)) {
            $command = sprintf(
                'mysqldump --host=%s --port=%d --user=%s --password=%s %s --single-transaction --routines --triggers --add-drop-table 2>&1',
                escapeshellarg($host),
                $port,
                escapeshellarg($username),
                escapeshellarg($password),
                escapeshellarg($database)
            );
        }

        $output = [];
        $returnCode = 0;
        exec($command, $output, $returnCode);

        if ($returnCode !== 0) {
            // Fallback: dump via Laravel (tanpa mysqldump binary)
            return $this->dumpDatabaseViaLaravel();
        }

        return implode("\n", $output);
    }

    /**
     * Fallback dump via Laravel (tanpa mysqldump).
     */
    private function dumpDatabaseViaLaravel(): string
    {
        $tables = DB::select('SHOW TABLES');
        $sql = "-- Backup generated at " . date('Y-m-d H:i:s') . "\n";
        $sql .= "-- Via Laravel fallback (mysqldump not available)\n\n";
        $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        $dbName = config('database.connections.' . config('database.default') . '.database');

        foreach ($tables as $table) {
            $tableArray = (array) $table;
            $firstVal = array_values($tableArray)[0] ?? 'unknown';
            $tableName = $table->{'Tables_in_' . $dbName} ?? $firstVal;

            // Skip migration table untuk avoid conflicts
            if ($tableName === 'migrations') continue;

            // Get create table
            $create = DB::select("SHOW CREATE TABLE `{$tableName}`");
            $createRow = (array) ($create[0] ?? []);
            $createSql = $createRow['Create Table'] ?? array_values((array) ($create[1] ?? []))[0] ?? '';
            $sql .= "DROP TABLE IF EXISTS `{$tableName}`;\n";
            $sql .= $createSql . ";\n\n";

            // Get data
            $rows = DB::select("SELECT * FROM `{$tableName}`");
            if (!empty($rows)) {
                $columns = array_keys((array) $rows[0]);
                $columnList = implode('`, `', $columns);

                foreach ($rows as $row) {
                    $values = array_map(function ($val) {
                        if ($val === null) return 'NULL';
                        return "'" . addslashes($val) . "'";
                    }, (array) $row);

                    $sql .= "INSERT INTO `{$tableName}` (`{$columnList}`) VALUES (" . implode(', ', $values) . ");\n";
                }
                $sql .= "\n";
            }
        }

        $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";

        return $sql;
    }

    /**
     * Recursive add folder to zip, skip excluded dirs.
     */
    private function addFolderToZip(ZipArchive $zip, string $folder, string $zipPath, array $excludeDirs = []): void
    {
        $files = File::allFiles($folder);

        foreach ($files as $file) {
            $relativePath = $file->getRelativePath();

            // Skip excluded directories
            $skip = false;
            foreach ($excludeDirs as $exclude) {
                if (str_starts_with($relativePath, $exclude)) {
                    $skip = true;
                    break;
                }
            }
            if ($skip) continue;

            $localPath = $zipPath . '/' . $relativePath . '/' . $file->getFilename();
            $zip->addFile($file->getRealPath(), $localPath);
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
