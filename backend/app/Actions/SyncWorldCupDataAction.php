<?php

namespace App\Actions;

use App\Exceptions\SyncInProgressException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class SyncWorldCupDataAction
{
    /** @return array{odds: string} */
    public function execute(): array
    {
        $lock = Cache::lock('worldcup:data-sync', 120);

        if (! $lock->get()) {
            throw new SyncInProgressException('Quá trình cập nhật dữ liệu đang chạy.');
        }

        try {
            $oddsOutput = $this->runCommand(
                'worldcup:sync-odds',
                'Không thể cập nhật tỷ lệ cược và tỷ số.',
            );

            return ['odds' => $oddsOutput];
        } finally {
            $lock->release();
        }
    }

    private function runCommand(string $command, string $fallbackMessage): string
    {
        $exitCode = Artisan::call($command);
        $output = trim(Artisan::output());

        if ($exitCode !== 0) {
            throw new RuntimeException($output ?: $fallbackMessage);
        }

        return $output;
    }
}
