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
    protected $description = 'Sync World Cup 2026 match results from api.football-data.org';

    private const API_URL = 'https://api.football-data.org/v4/matches';

    // football-data.org stage → our round
    private const STAGE_MAP = [
        'GROUP_STAGE'    => 'group',
        'LAST_32'        => 'round_of_32',
        'LAST_16'        => 'round_of_16',
        'QUARTER_FINALS' => 'quarter_final',
        'SEMI_FINALS'    => 'semi_final',
        'THIRD_PLACE'    => 'third_place',
        'FINAL'          => 'final',
    ];

    public function handle(): int
    {
        $token = env('FOOTBALL_DATA_TOKEN');
        if (empty($token)) {
            $this->error('FOOTBALL_DATA_TOKEN is not set.');
            return 1;
        }

        $this->info('[worldcup:sync] Fetching matches from football-data.org...');

        try {
            $response = Http::timeout(30)
                ->withHeaders(['X-Auth-Token' => $token])
                ->get(self::API_URL);
        } catch (\Throwable $e) {
            $this->error('HTTP error: ' . $e->getMessage());
            return 1;
        }

        if (!$response->ok()) {
            $this->error('API returned status ' . $response->status() . ': ' . $response->body());
            return 1;
        }

        $matches = $response->json('matches', []);
        if (empty($matches)) {
            $this->warn('No matches returned from API.');
            return 0;
        }

        // Build team lookup keyed by country_code (= football-data TLA)
        $teams   = Team::all()->keyBy('country_code');
        $created = 0;
        $updated = 0;
        $skipped = 0;

        foreach ($matches as $game) {
            // Only World Cup matches
            if (($game['competition']['code'] ?? null) !== 'WC') {
                continue;
            }

            $homeCode = $game['homeTeam']['tla'] ?? null;
            $awayCode = $game['awayTeam']['tla'] ?? null;
            if (!$homeCode || !$awayCode) {
                $skipped++;
                continue;
            }

            $homeTeam = $teams[$homeCode] ?? null;
            $awayTeam = $teams[$awayCode] ?? null;
            if (!$homeTeam || !$awayTeam) {
                $skipped++;
                continue;
            }

            // Date (API is UTC ISO-8601)
            try {
                $dt = Carbon::parse($game['utcDate'])->setTimezone('UTC');
            } catch (\Throwable) {
                $skipped++;
                continue;
            }

            // Status
            $apiStatus = strtoupper($game['status'] ?? 'SCHEDULED');
            if (in_array($apiStatus, ['FINISHED', 'AWARDED'], true)) {
                $status = 'finished';
            } elseif (in_array($apiStatus, ['IN_PLAY', 'PAUSED'], true)) {
                $status = 'live';
            } else {
                $status = 'scheduled';
            }

            $homeScore = ($status !== 'scheduled') ? ($game['score']['fullTime']['home'] ?? null) : null;
            $awayScore = ($status !== 'scheduled') ? ($game['score']['fullTime']['away'] ?? null) : null;

            $round = self::STAGE_MAP[$game['stage'] ?? ''] ?? 'group';

            // group like "GROUP_A" → "A"
            $group = null;
            if ($round === 'group' && !empty($game['group'])) {
                $group = trim(str_ireplace('group', '', str_replace('_', ' ', $game['group'])));
            }

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
                    'venue'      => $game['venue'] ?? ('Stadium ' . ($group ?? $round)),
                ]
            );

            // Settle predictions if match just became finished
            if ($status === 'finished' && ($match->wasRecentlyCreated || $match->wasChanged('status'))) {
                $this->settlePredictions($match, $homeScore, $awayScore);
            }

            $match->wasRecentlyCreated ? $created++ : $updated++;
        }

        $this->info("[worldcup:sync] Done — {$created} created, {$updated} updated, {$skipped} skipped.");
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
