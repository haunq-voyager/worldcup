<?php

namespace App\Console\Commands;

use App\Models\Team;
use App\Models\WorldCupMatch;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SyncOdds extends Command
{
    protected $signature   = 'worldcup:sync-odds';
    protected $description = 'Sync betting odds (1x2, handicap, over/under) from the-odds-api.com';

    private const API_URL = 'https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds';

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
            return 0;
        }

        $teams   = Team::all()->keyBy('country_code');
        $matched = 0;
        $skipped = 0;

        foreach ($events as $event) {
            $homeName = $event['home_team'] ?? null;
            $awayName = $event['away_team'] ?? null;
            $homeCode = self::NAME_MAP[$homeName] ?? null;
            $awayCode = self::NAME_MAP[$awayName] ?? null;

            if (!$homeCode || !$awayCode || !isset($teams[$homeCode], $teams[$awayCode])) {
                $skipped++;
                continue;
            }

            $homeId = $teams[$homeCode]->id;
            $awayId = $teams[$awayCode]->id;

            // Candidate matches with this team pair (either orientation), upcoming/live only
            $candidates = WorldCupMatch::whereIn('status', ['scheduled', 'live'])
                ->where(function ($q) use ($homeId, $awayId) {
                    $q->where(['home_team_id' => $homeId, 'away_team_id' => $awayId])
                      ->orWhere(['home_team_id' => $awayId, 'away_team_id' => $homeId]);
                })
                ->get();

            if ($candidates->isEmpty()) {
                $skipped++;
                continue;
            }

            // Pick the fixture closest in time to the odds event's kickoff
            $match = $candidates->first();
            if ($candidates->count() > 1 && !empty($event['commence_time'])) {
                try {
                    $commence = \Carbon\Carbon::parse($event['commence_time']);
                    $match = $candidates->sortBy(
                        fn ($m) => abs($m->match_date->diffInSeconds($commence, false))
                    )->first();
                } catch (\Throwable) {
                    // keep first
                }
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

        $this->info("[worldcup:sync-odds] Done — {$matched} matched, {$skipped} skipped.");
        return 0;
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
