<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;
use ZipArchive;

class BackupDatabase extends Command
{
    protected $signature = 'backup:run
                            {--keep=7 : Number of backups to keep (delete older)}';

    protected $description = 'Create a full backup (database + storage) and keep only recent N backups';

    public function handle(): int
    {
        $this->info('Starting backup...');

        $backupDir = storage_path('app/backups');
        if (!File::exists($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        $timestamp = date('Y-m-d_His');
        $filename = "backup_{$timestamp}.zip";
        $filepath = $backupDir . '/' . $filename;

        try {
            $zip = new ZipArchive();

            if ($zip->open($filepath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                $this->error('Cannot create backup file');
                return 1;
            }

            // 1. Database dump
            $this->info('Dumping database...');
            $sqlDump = $this->dumpDatabase();
            $zip->addFromString("database_{$timestamp}.sql", $sqlDump);

            // 2. Storage folder
            $this->info('Backing up storage...');
            $storagePath = storage_path('app');
            $this->addFolderToZip($zip, $storagePath, 'storage', ['backups']);

            $zip->close();

            $size = $this->formatSize(File::size($filepath));
            $this->info("Backup created: {$filename} ({$size})");

            // 3. Cleanup old backups
            $keep = (int) $this->option('keep');
            $this->cleanupOldBackups($backupDir, $keep);

            return 0;

        } catch (\Exception $e) {
            if (File::exists($filepath)) {
                File::delete($filepath);
            }
            $this->error('Backup failed: ' . $e->getMessage());
            return 1;
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
            return $this->dumpDatabaseViaLaravel();
        }

        return implode("\n", $output);
    }

    private function dumpDatabaseViaLaravel(): string
    {
        $tables = DB::select('SHOW TABLES');
        $sql = "-- Backup generated at " . date('Y-m-d H:i:s') . "\n";
        $sql .= "-- Via Laravel fallback\n\n";
        $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        $dbName = config('database.connections.' . config('database.default') . '.database');

        foreach ($tables as $table) {
            $tableArray = (array) $table;
            $firstVal = array_values($tableArray)[0] ?? 'unknown';
            $tableName = $table->{'Tables_in_' . $dbName} ?? $firstVal;

            if ($tableName === 'migrations') continue;

            $create = DB::select("SHOW CREATE TABLE `{$tableName}`");
            $createRow = (array) ($create[0] ?? []);
            $createSql = $createRow['Create Table'] ?? '';

            $sql .= "DROP TABLE IF EXISTS `{$tableName}`;\n";
            $sql .= $createSql . ";\n\n";

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

    private function addFolderToZip(ZipArchive $zip, string $folder, string $zipPath, array $excludeDirs = []): void
    {
        $files = File::allFiles($folder);

        foreach ($files as $file) {
            $relativePath = $file->getRelativePath();

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

    private function cleanupOldBackups(string $backupDir, int $keep): void
    {
        $files = collect(File::files($backupDir))
            ->filter(fn ($f) => $f->getExtension() === 'zip')
            ->sortByDesc(fn ($f) => $f->getMTime());

        if ($files->count() > $keep) {
            $files->slice($keep)->each(fn ($f) => File::delete($f->getRealPath()));
            $this->info('Cleaned up old backups, keeping ' . $keep . ' most recent');
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
