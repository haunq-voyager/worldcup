<?php

namespace App\Actions;

use App\Exceptions\SyncInProgressException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class SyncWorldCupDataAction
{
    /** @return array{matches: string, odds: string} */
    public function execute(): array
    {
        $lock = Cache::lock('worldcup:data-sync', 120);

        if (! $lock->get()) {
            throw new SyncInProgressException('Quá trình cập nhật dữ liệu đang chạy.');
        }

        try {
            $matchesOutput = $this->runCommand(
                'worldcup:sync',
                'Không thể cập nhật lịch thi đấu và tỷ số.',
            );
            $oddsOutput = $this->runCommand(
                'worldcup:sync-odds',
                'Không thể cập nhật tỷ lệ cược.',
            );

            return ['matches' => $matchesOutput, 'odds' => $oddsOutput];
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
