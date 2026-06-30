<?php

namespace App\Console\Commands;

use App\Models\Team;
use App\Models\WorldCupMatch;
use App\Services\MatchSettlementService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SyncWorldCupData extends Command
{
    protected $signature   = 'worldcup:sync';
    protected $description = 'Sync World Cup 2026 schedule and results from openfootball/worldcup.json';

    private const API_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

    private const ROUND_MAP = [
        'Round of 32'           => 'round_of_32',
        'Round of 16'           => 'round_of_16',
        'Quarter-final'         => 'quarter_final',
        'Semi-final'            => 'semi_final',
        'Match for third place' => 'third_place',
        'Final'                 => 'final',
    ];

    private const TEAM_NAME_MAP = [
        'Algeria' => 'ALG', 'Argentina' => 'ARG', 'Australia' => 'AUS', 'Austria' => 'AUT',
        'Belgium' => 'BEL', 'Bosnia & Herzegovina' => 'BIH', 'Brazil' => 'BRA', 'Canada' => 'CAN',
        'Cape Verde' => 'CPV', 'Colombia' => 'COL', 'Croatia' => 'CRO', 'Curaçao' => 'CUW',
        'Czech Republic' => 'CZE', 'DR Congo' => 'COD', 'Ecuador' => 'ECU', 'Egypt' => 'EGY',
        'England' => 'ENG', 'France' => 'FRA', 'Germany' => 'GER', 'Ghana' => 'GHA',
        'Haiti' => 'HAI', 'Iran' => 'IRN', 'Iraq' => 'IRQ', 'Ivory Coast' => 'CIV',
        'Japan' => 'JPN', 'Jordan' => 'JOR', 'Mexico' => 'MEX', 'Morocco' => 'MAR',
        'Netherlands' => 'NED', 'New Zealand' => 'NZL', 'Norway' => 'NOR', 'Panama' => 'PAN',
        'Paraguay' => 'PAR', 'Portugal' => 'POR', 'Qatar' => 'QAT', 'Saudi Arabia' => 'KSA',
        'Scotland' => 'SCO', 'Senegal' => 'SEN', 'South Africa' => 'RSA', 'South Korea' => 'KOR',
        'Spain' => 'ESP', 'Sweden' => 'SWE', 'Switzerland' => 'SUI', 'Tunisia' => 'TUN',
        'Turkey' => 'TUR', 'USA' => 'USA', 'Uruguay' => 'URU', 'Uzbekistan' => 'UZB',
    ];

    public function handle(): int
    {
        $this->info('[worldcup:sync] Fetching matches from openfootball/worldcup.json...');

        try {
            $response = Http::timeout(30)->get(self::API_URL);
        } catch (\Throwable $e) {
            $this->error('HTTP error: ' . $e->getMessage());
            return 1;
        }

        if (! $response->ok()) {
            $this->error('API returned status ' . $response->status() . ': ' . $response->body());
            return 1;
        }

        $matches = $response->json('matches', []);
        if (empty($matches)) {
            $this->warn('No matches returned from API.');
            return 0;
        }

        $teams   = Team::all()->keyBy('country_code');
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $syncedMatchIds = [];

        foreach ($matches as $game) {
            $homeCode = self::TEAM_NAME_MAP[$game['team1'] ?? ''] ?? null;
            $awayCode = self::TEAM_NAME_MAP[$game['team2'] ?? ''] ?? null;
            if (! $homeCode || ! $awayCode) {
                $skipped++;
                continue;
            }

            $homeTeam = $teams[$homeCode] ?? null;
            $awayTeam = $teams[$awayCode] ?? null;
            if (! $homeTeam || ! $awayTeam) {
                $skipped++;
                continue;
            }

            $kickoff = $this->parseKickoff($game);
            if ($kickoff === null) {
                $skipped++;
                continue;
            }

            $score = $game['score']['ft'] ?? null;
            $homeScore = is_array($score) && array_key_exists(0, $score) ? $score[0] : null;
            $awayScore = is_array($score) && array_key_exists(1, $score) ? $score[1] : null;
            $status = ($homeScore !== null && $awayScore !== null) ? 'finished' : 'scheduled';
            $round = self::ROUND_MAP[$game['round'] ?? ''] ?? 'group';

            $group = null;
            if ($round === 'group' && isset($game['group'])) {
                $group = trim(str_ireplace('group', '', $game['group']));
            }

            $match = $this->findExistingMatch($homeTeam->id, $awayTeam->id, $round, $kickoff)
                ?? $this->findMutableSlot($round, $kickoff);

            $values = [
                'home_team_id' => $homeTeam->id,
                'away_team_id' => $awayTeam->id,
                'match_date'   => $kickoff,
                'group_name'   => $group,
                'status'       => $status,
                'home_score'   => $homeScore,
                'away_score'   => $awayScore,
                'result'       => $this->computeResult($homeScore, $awayScore),
                'venue'        => $game['ground'] ?? ('Stadium ' . ($group ?? $round)),
            ];

            if ($match === null) {
                $match = WorldCupMatch::create($values);
                $created++;
            } else {
                $match->forceFill($values)->save();
                $updated++;
            }

            $syncedMatchIds[] = $match->id;

            if ($status === 'finished') {
                app(MatchSettlementService::class)->settle($match);
            }
        }

        $hidden = $this->hideStaleKnockoutPlaceholders($syncedMatchIds);

        $this->info("[worldcup:sync] Done - {$created} created, {$updated} updated, {$skipped} skipped, {$hidden} stale placeholders hidden.");
        return 0;
    }

    private function parseKickoff(array $game): ?Carbon
    {
        if (empty($game['date']) || empty($game['time'])) {
            return null;
        }

        if (! preg_match('/^(\d{2}:\d{2})\s+UTC([+-]\d{1,2})$/', $game['time'], $matches)) {
            return null;
        }

        $offset = sprintf('%+03d:00', (int) $matches[2]);

        try {
            return Carbon::parse("{$game['date']} {$matches[1]} {$offset}")->setTimezone('UTC');
        } catch (\Throwable) {
            return null;
        }
    }

    private function findExistingMatch(int $homeId, int $awayId, string $round, Carbon $kickoff): ?WorldCupMatch
    {
        return WorldCupMatch::query()
            ->where('round', $round)
            ->where(function ($query) use ($homeId, $awayId) {
                $query->where(function ($query) use ($homeId, $awayId) {
                    $query->where('home_team_id', $homeId)
                        ->where('away_team_id', $awayId);
                })->orWhere(function ($query) use ($homeId, $awayId) {
                    $query->where('home_team_id', $awayId)
                        ->where('away_team_id', $homeId);
                });
            })
            ->get()
            ->sortBy(fn (WorldCupMatch $match) => abs($match->match_date->diffInSeconds($kickoff, false)))
            ->first();
    }

    private function findMutableSlot(string $round, Carbon $kickoff): ?WorldCupMatch
    {
        if ($round === 'group') {
            return null;
        }

        $slot = WorldCupMatch::query()
            ->where('round', $round)
            ->where('status', 'scheduled')
            ->whereNull('home_score')
            ->whereNull('away_score')
            ->get()
            ->filter(fn (WorldCupMatch $match) => ! $match->predictions()->exists())
            ->sortBy(fn (WorldCupMatch $match) => abs($match->match_date->diffInSeconds($kickoff, false)))
            ->first();

        if ($slot === null || abs($slot->match_date->diffInSeconds($kickoff, false)) > 12 * 60 * 60) {
            return null;
        }

        return $slot;
    }

    private function computeResult(?int $homeScore, ?int $awayScore): ?string
    {
        if ($homeScore === null || $awayScore === null) {
            return null;
        }

        if ($homeScore > $awayScore) return 'home_win';
        if ($homeScore < $awayScore) return 'away_win';
        return 'draw';
    }

    /** @param list<int> $syncedMatchIds */
    private function hideStaleKnockoutPlaceholders(array $syncedMatchIds): int
    {
        $query = WorldCupMatch::query()
            ->where('round', '!=', 'group')
            ->where('status', 'scheduled')
            ->whereNull('home_score')
            ->whereNull('away_score')
            ->where(function ($query) {
                $query->whereNotNull('odds')
                    ->orWhereNotNull('odds_updated_at');
            });

        if ($syncedMatchIds !== []) {
            $query->whereNotIn('id', $syncedMatchIds);
        }

        $hidden = 0;
        foreach ($query->get() as $match) {
            if ($match->predictions()->exists()) {
                continue;
            }

            $match->forceFill([
                'odds'            => null,
                'odds_updated_at' => null,
            ])->save();

            $hidden++;
        }

        return $hidden;
    }
}
