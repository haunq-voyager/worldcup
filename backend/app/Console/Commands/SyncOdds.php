<?php

namespace App\Console\Commands;

use App\Models\Team;
use App\Models\WorldCupMatch;
use App\Services\MatchSettlementService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SyncOdds extends Command
{
    protected $signature   = 'worldcup:sync-odds';
    protected $description = 'Sync betting odds (1x2, handicap, over/under) from the-odds-api.com';

    private const API_URL = 'https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds';
    private const SCORES_API_URL = 'https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/scores';

    // Preferred bookmakers per market (sharp books first), fallback to any.
    private const BOOK_PRIORITY = ['pinnacle', 'betfair_ex_eu', 'marathonbet', 'unibet_nl', 'williamhill', 'betclic_fr', 'coolbet'];

    // the-odds-api English team name → our country_code
    private const NAME_MAP = [
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
        $key = env('ODDS_API_KEY');
        if (empty($key)) {
            $this->error('ODDS_API_KEY is not set.');
            return 1;
        }

        $this->info('[worldcup:sync-odds] Fetching odds from the-odds-api.com...');

        $teams = Team::all()->keyBy('country_code');

        $scoresResult = $this->syncScores($key, $teams);
        if ($scoresResult === null) {
            return 1;
        }

        try {
            $response = Http::timeout(30)->get(self::API_URL, [
                'regions'    => 'eu',
                'markets'    => 'h2h,spreads,totals',
                'oddsFormat' => 'decimal',
                'apiKey'     => $key,
            ]);
        } catch (\Throwable $e) {
            $this->error('HTTP error: ' . $e->getMessage());
            return 1;
        }

        if (!$response->ok()) {
            $this->error('API returned status ' . $response->status() . ': ' . $response->body());
            return 1;
        }

        $remaining = $response->header('x-requests-remaining');
        if ($remaining !== null) {
            $this->info("[worldcup:sync-odds] API credits remaining: {$remaining}");
        }

        $events = $response->json() ?? [];
        if (empty($events)) {
            $this->warn('No odds events returned.');
            $this->info("[worldcup:sync-odds] Scores done - {$scoresResult['matched']} matched, {$scoresResult['fixtures']} fixtures synced, {$scoresResult['skipped']} skipped.");
            return 0;
        }

        $matched = 0;
        $skipped = 0;

        foreach ($events as $event) {
            $teamsForEvent = $this->teamsForEvent($event, $teams);
            if ($teamsForEvent === null) {
                $skipped++;
                continue;
            }

            [$homeName, $awayName, $homeId, $awayId] = $teamsForEvent;
            $match = $this->findMatchForEvent($homeId, $awayId, $event, ['scheduled', 'live']);
            if ($match === null) {
                $matchResult = $this->findOrSyncMatchForEvent($homeId, $awayId, $event, ['scheduled', 'live']);
                if ($matchResult === null) {
                    $skipped++;
                    continue;
                }

                $match = $matchResult['match'];
            }

            $odds = $this->extractOdds($event, $homeName, $awayName);
            if ($odds === null) {
                $skipped++;
                continue;
            }

            // Orient odds to OUR match home/away (odds event may be swapped)
            if ($match->home_team_id === $awayId) {
                $odds = $this->swapOrientation($odds);
            }

            $match->odds = $odds;
            $match->odds_updated_at = now();
            $match->save();
            $matched++;
        }

        $this->info("[worldcup:sync-odds] Done - {$matched} odds matched, {$skipped} odds skipped; {$scoresResult['matched']} scores matched, {$scoresResult['fixtures']} fixtures synced, {$scoresResult['skipped']} scores skipped.");
        return 0;
    }

    /**
     * @param \Illuminate\Support\Collection<string,\App\Models\Team> $teams
     * @return array{matched: int, fixtures: int, skipped: int}|null
     */
    private function syncScores(string $key, \Illuminate\Support\Collection $teams): ?array
    {
        $this->info('[worldcup:sync-odds] Fetching scores from the-odds-api.com...');

        try {
            $response = Http::timeout(30)->get(self::SCORES_API_URL, [
                'daysFrom' => 3,
                'apiKey'   => $key,
            ]);
        } catch (\Throwable $e) {
            $this->error('Scores HTTP error: ' . $e->getMessage());
            return null;
        }

        if (!$response->ok()) {
            $this->error('Scores API returned status ' . $response->status() . ': ' . $response->body());
            return null;
        }

        $events = $response->json() ?? [];
        if (empty($events)) {
            $this->warn('No score events returned.');
            return ['matched' => 0, 'fixtures' => 0, 'skipped' => 0];
        }

        $matched = 0;
        $fixtures = 0;
        $skipped = 0;

        foreach ($events as $event) {
            $teamsForEvent = $this->teamsForEvent($event, $teams);
            if ($teamsForEvent === null) {
                $skipped++;
                continue;
            }

            [$homeName, $awayName, $homeId, $awayId] = $teamsForEvent;
            $matchResult = $this->findOrSyncMatchForEvent($homeId, $awayId, $event);
            if ($matchResult === null) {
                $skipped++;
                continue;
            }

            ['match' => $match, 'synced' => $synced] = $matchResult;
            if ($synced) {
                $fixtures++;
            }

            $score = $this->extractScore($event, $homeName, $awayName);
            if ($score === null) {
                continue;
            }

            if ($match->home_team_id === $awayId) {
                $score = [
                    'home' => $score['away'],
                    'away' => $score['home'],
                ];
            }

            $completed = (bool) ($event['completed'] ?? false);
            $status = $completed ? 'finished' : 'live';
            $result = $completed ? $this->computeResult($score['home'], $score['away']) : null;
            $scoreChanged = $match->home_score === null
                || $match->away_score === null
                || (int) $match->home_score !== $score['home']
                || (int) $match->away_score !== $score['away']
                || $match->result !== $result;

            if ($match->settled && $completed && $scoreChanged) {
                app(MatchSettlementService::class)->reverse($match);
            }

            $match->forceFill([
                'status'     => $status,
                'home_score' => $score['home'],
                'away_score' => $score['away'],
                'result'     => $result,
            ])->save();

            if ($completed) {
                app(MatchSettlementService::class)->settle($match);
            }

            $matched++;
        }

        return ['matched' => $matched, 'fixtures' => $fixtures, 'skipped' => $skipped];
    }

    /**
     * @param \Illuminate\Support\Collection<string,\App\Models\Team> $teams
     * @return array{string, string, int, int}|null
     */
    private function teamsForEvent(array $event, \Illuminate\Support\Collection $teams): ?array
    {
        $homeName = $event['home_team'] ?? null;
        $awayName = $event['away_team'] ?? null;
        $homeCode = self::NAME_MAP[$homeName] ?? null;
        $awayCode = self::NAME_MAP[$awayName] ?? null;

        if (!$homeName || !$awayName || !$homeCode || !$awayCode || !isset($teams[$homeCode], $teams[$awayCode])) {
            return null;
        }

        return [$homeName, $awayName, $teams[$homeCode]->id, $teams[$awayCode]->id];
    }

    /**
     * @param list<string>|null $statuses
     */
    private function findMatchForEvent(int $homeId, int $awayId, array $event, ?array $statuses = null): ?WorldCupMatch
    {
        $query = WorldCupMatch::query()
            ->where(function ($q) use ($homeId, $awayId) {
                $q->where(function ($q) use ($homeId, $awayId) {
                    $q->where('home_team_id', $homeId)
                        ->where('away_team_id', $awayId);
                })->orWhere(function ($q) use ($homeId, $awayId) {
                    $q->where('home_team_id', $awayId)
                        ->where('away_team_id', $homeId);
                });
            });

        if ($statuses !== null) {
            $query->whereIn('status', $statuses);
        }

        $candidates = $query->get();
        if ($candidates->isEmpty()) {
            return null;
        }

        if (empty($event['commence_time'])) {
            return $candidates->first();
        }

        try {
            $commence = Carbon::parse($event['commence_time']);
            $match = $candidates->sortBy(
                fn (WorldCupMatch $match) => abs($match->match_date->diffInSeconds($commence, false))
            )->first();

            if ($match === null || abs($match->match_date->diffInSeconds($commence, false)) > 12 * 60 * 60) {
                return null;
            }

            return $match;
        } catch (\Throwable) {
            return $candidates->first();
        }
    }

    /**
     * @param list<string>|null $statuses
     * @return array{match: WorldCupMatch, synced: bool}|null
     */
    private function findOrSyncMatchForEvent(int $homeId, int $awayId, array $event, ?array $statuses = null): ?array
    {
        $match = $this->findMatchForEvent($homeId, $awayId, $event, $statuses);
        if ($match !== null) {
            return ['match' => $match, 'synced' => false];
        }

        try {
            $kickoff = Carbon::parse($event['commence_time'] ?? null)->setTimezone('UTC');
        } catch (\Throwable) {
            return null;
        }

        $completed = (bool) ($event['completed'] ?? false);
        $slot = WorldCupMatch::query()
            ->where('round', '!=', 'group')
            ->get()
            ->filter(function (WorldCupMatch $candidate) use ($completed) {
                if ($candidate->predictions()->exists()) {
                    return false;
                }

                if ($completed) {
                    return true;
                }

                return $candidate->status === 'scheduled'
                    && $candidate->home_score === null
                    && $candidate->away_score === null;
            })
            ->sortBy(fn (WorldCupMatch $candidate) => abs($candidate->match_date->diffInSeconds($kickoff, false)))
            ->first();

        if ($slot === null || abs($slot->match_date->diffInSeconds($kickoff, false)) > 12 * 60 * 60) {
            return null;
        }

        $slot->forceFill([
            'home_team_id' => $homeId,
            'away_team_id' => $awayId,
            'match_date'   => $kickoff,
            'status'       => 'scheduled',
            'home_score'   => null,
            'away_score'   => null,
            'result'       => null,
            'settled'      => false,
        ])->save();

        return ['match' => $slot, 'synced' => true];
    }

    /** @return array{home: int, away: int}|null */
    private function extractScore(array $event, string $homeName, string $awayName): ?array
    {
        $scores = $event['scores'] ?? [];
        if (empty($scores)) {
            return null;
        }

        $homeScore = $this->scoreByName($scores, $homeName);
        $awayScore = $this->scoreByName($scores, $awayName);

        if ($homeScore === null || $awayScore === null) {
            return null;
        }

        return ['home' => $homeScore, 'away' => $awayScore];
    }

    private function scoreByName(array $scores, string $name): ?int
    {
        foreach ($scores as $score) {
            if (($score['name'] ?? null) !== $name || !isset($score['score'])) {
                continue;
            }

            return is_numeric($score['score']) ? (int) $score['score'] : null;
        }

        return null;
    }

    private function computeResult(int $homeScore, int $awayScore): string
    {
        if ($homeScore > $awayScore) return 'home_win';
        if ($homeScore < $awayScore) return 'away_win';
        return 'draw';
    }

    /**
     * Build a normalised odds object oriented to the ODDS event's home/away.
     */
    private function extractOdds(array $event, string $homeName, string $awayName): ?array
    {
        $books = $event['bookmakers'] ?? [];
        if (empty($books)) return null;

        $h2h     = $this->pickMarket($books, 'h2h');
        $spreads = $this->pickMarket($books, 'spreads');
        $totals  = $this->pickMarket($books, 'totals');

        $odds = [];

        if ($h2h) {
            $odds['h2h'] = [
                'home' => $this->priceByName($h2h['outcomes'], $homeName),
                'draw' => $this->priceByName($h2h['outcomes'], 'Draw'),
                'away' => $this->priceByName($h2h['outcomes'], $awayName),
                'book' => $h2h['book'],
            ];
        }

        if ($spreads) {
            $home = $this->outcomeByName($spreads['outcomes'], $homeName);
            $away = $this->outcomeByName($spreads['outcomes'], $awayName);
            if ($home && $away) {
                $odds['spreads'] = [
                    'home_point' => $home['point'] ?? null,
                    'home_price' => $home['price'] ?? null,
                    'away_point' => $away['point'] ?? null,
                    'away_price' => $away['price'] ?? null,
                    'book'       => $spreads['book'],
                ];
            }
        }

        if ($totals) {
            $over  = $this->outcomeByName($totals['outcomes'], 'Over');
            $under = $this->outcomeByName($totals['outcomes'], 'Under');
            if ($over && $under) {
                $odds['totals'] = [
                    'point' => $over['point'] ?? null,
                    'over'  => $over['price'] ?? null,
                    'under' => $under['price'] ?? null,
                    'book'  => $totals['book'],
                ];
            }
        }

        return empty($odds) ? null : $odds;
    }

    /** Pick a market from the first preferred bookmaker that offers it. */
    private function pickMarket(array $books, string $marketKey): ?array
    {
        $ordered = [];
        foreach (self::BOOK_PRIORITY as $pref) {
            foreach ($books as $b) {
                if (($b['key'] ?? null) === $pref) $ordered[] = $b;
            }
        }
        foreach ($books as $b) {
            if (!in_array($b['key'] ?? null, self::BOOK_PRIORITY, true)) $ordered[] = $b;
        }

        foreach ($ordered as $b) {
            foreach ($b['markets'] ?? [] as $m) {
                if (($m['key'] ?? null) === $marketKey && !empty($m['outcomes'])) {
                    return ['outcomes' => $m['outcomes'], 'book' => $b['title'] ?? ($b['key'] ?? '')];
                }
            }
        }
        return null;
    }

    private function outcomeByName(array $outcomes, string $name): ?array
    {
        foreach ($outcomes as $o) {
            if (($o['name'] ?? null) === $name) return $o;
        }
        return null;
    }

    private function priceByName(array $outcomes, string $name): ?float
    {
        $o = $this->outcomeByName($outcomes, $name);
        return $o['price'] ?? null;
    }

    private function swapOrientation(array $odds): array
    {
        if (isset($odds['h2h'])) {
            [$odds['h2h']['home'], $odds['h2h']['away']] = [$odds['h2h']['away'], $odds['h2h']['home']];
        }
        if (isset($odds['spreads'])) {
            $s = $odds['spreads'];
            $odds['spreads'] = [
                'home_point' => $s['away_point'],
                'home_price' => $s['away_price'],
                'away_point' => $s['home_point'],
                'away_price' => $s['home_price'],
                'book'       => $s['book'],
            ];
        }
        // totals are symmetric — no change
        return $odds;
    }
}
