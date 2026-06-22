<?php

namespace App\Console\Commands;

use App\Models\Team;
use App\Models\WorldCupMatch;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SyncWorldCupData extends Command
{
    protected $signature   = 'worldcup:sync';
    protected $description = 'Sync World Cup 2026 match results from worldcup26.ir';

    // worldcup26.ir team id → our country_code
    private const TEAM_MAP = [
        '1'=>'MEX','2'=>'RSA','3'=>'KOR','4'=>'CZE',
        '5'=>'CAN','6'=>'BIH','7'=>'QAT','8'=>'SUI',
        '9'=>'BRA','10'=>'MAR','11'=>'HAI','12'=>'SCO',
        '13'=>'USA','14'=>'PAR','15'=>'AUS','16'=>'TUR',
        '17'=>'GER','18'=>'CUW','19'=>'CIV','20'=>'ECU',
        '21'=>'NED','22'=>'JPN','23'=>'SWE','24'=>'TUN',
        '25'=>'BEL','26'=>'EGY','27'=>'IRN','28'=>'NZL',
        '29'=>'ESP','30'=>'CPV','31'=>'KSA','32'=>'URU',
        '33'=>'FRA','34'=>'SEN','35'=>'IRQ','36'=>'NOR',
        '37'=>'ARG','38'=>'ALG','39'=>'AUT','40'=>'JOR',
        '41'=>'POR','42'=>'COD','43'=>'UZB','44'=>'COL',
        '45'=>'ENG','46'=>'CRO','47'=>'GHA','48'=>'PAN',
    ];

    private const ROUND_MAP = [
        'group'         => 'group',
        'round_of_32'   => 'round_of_32',
        'round_of_16'   => 'round_of_16',
        'quarter_final' => 'quarter_final',
        'semi_final'    => 'semi_final',
        'third_place'   => 'third_place',
        'final'         => 'final',
    ];

    public function handle(): int
    {
        $this->info('[worldcup:sync] Fetching games from worldcup26.ir...');

        try {
            $response = Http::timeout(30)->get('https://worldcup26.ir/get/games');
        } catch (\Throwable $e) {
            $this->error('HTTP error: ' . $e->getMessage());
            return 1;
        }

        if (!$response->ok()) {
            $this->error('API returned status ' . $response->status());
            return 1;
        }

        $games = $response->json('games', []);
        if (empty($games)) {
            $this->warn('No games returned from API.');
            return 0;
        }

        // Build team lookup keyed by country_code
        $teams = Team::all()->keyBy('country_code');
        $created = 0;
        $updated = 0;

        foreach ($games as $game) {
            $homeCode = self::TEAM_MAP[$game['home_team_id'] ?? ''] ?? null;
            $awayCode = self::TEAM_MAP[$game['away_team_id'] ?? ''] ?? null;
            if (!$homeCode || !$awayCode) continue;

            $homeTeam = $teams[$homeCode] ?? null;
            $awayTeam = $teams[$awayCode] ?? null;
            if (!$homeTeam || !$awayTeam) continue;

            // Parse date (API timezone: America/Los_Angeles = PDT/UTC-7)
            try {
                $dt = Carbon::createFromFormat('m/d/Y H:i', $game['local_date'], 'America/Los_Angeles')
                    ->setTimezone('UTC');
            } catch (\Throwable) {
                continue;
            }

            // Status
            $finished = strtoupper($game['finished'] ?? '') === 'TRUE';
            $elapsed  = strtolower(trim($game['time_elapsed'] ?? ''));
            if ($finished || $elapsed === 'finished') {
                $status = 'finished';
            } elseif ($elapsed === 'ht' || (is_numeric($elapsed) && (int)$elapsed > 0)) {
                // Only live if HT or actual elapsed minutes > 0
                $status = 'live';
            } else {
                $status = 'scheduled';
            }

            $homeScore = ($status !== 'scheduled') ? (int)($game['home_score'] ?? 0) : null;
            $awayScore = ($status !== 'scheduled') ? (int)($game['away_score'] ?? 0) : null;
            $round     = self::ROUND_MAP[$game['type'] ?? 'group'] ?? 'group';
            $group     = ($round === 'group') ? ($game['group'] ?? null) : null;

            $match = WorldCupMatch::updateOrCreate(
                [
                    'home_team_id' => $homeTeam->id,
                    'away_team_id' => $awayTeam->id,
                    'round'        => $round,
                ],
                [
                    'match_date' => $dt,
                    'group_name' => $group,
                    'status'     => $status,
                    'home_score' => $homeScore,
                    'away_score' => $awayScore,
                    'venue'      => 'Stadium ' . ($group ?? $round),
                ]
            );

            // Settle predictions if match just became finished
            if ($status === 'finished' && ($match->wasRecentlyCreated || $match->wasChanged('status'))) {
                $this->settlePredictions($match, $homeScore, $awayScore);
            }

            $match->wasRecentlyCreated ? $created++ : $updated++;
        }

        $this->info("[worldcup:sync] Done — {$created} created, {$updated} updated.");
        return 0;
    }

    private function settlePredictions(WorldCupMatch $match, ?int $homeScore, ?int $awayScore): void
    {
        if ($homeScore === null || $awayScore === null) return;

        $actual = $homeScore > $awayScore ? 'home_win'
                : ($homeScore < $awayScore ? 'away_win' : 'draw');

        foreach ($match->predictions as $prediction) {
            $correct = ($prediction->prediction === $actual);
            $prediction->update(['is_correct' => $correct]);
            if ($correct) {
                $prediction->user->increment('total_points', 3);
            }
            $prediction->user->increment('total_predictions');
            if ($correct) {
                $prediction->user->increment('correct_predictions');
            }
        }
    }
}
