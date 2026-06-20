<?php

namespace Database\Seeders;

use App\Models\Team;
use App\Models\WorldCupMatch;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class MatchSeeder extends Seeder
{
    private function vn(string $vnDatetime): Carbon
    {
        return Carbon::createFromFormat('Y-m-d H:i', $vnDatetime, 'Asia/Ho_Chi_Minh')
            ->setTimezone('UTC');
    }

    public function run(): void
    {
        // Fully idempotent: never deletes existing data.
        // Group matches are seeded only if the table is empty (first boot only).
        // Knockout placeholders are created only if they don't already exist.

        $t = Team::all()->keyBy('country_code')->map->id;

        if (WorldCupMatch::where('round', 'group')->doesntExist()) {
            $this->seedGroupMatches($t);
        }

        $this->seedKnockoutSlots();
    }

    private function seedGroupMatches(array|\Illuminate\Support\Collection $t): void
    {
        $groupMatches = [
            // ── Lượt 1 ──────────────────────────────────────────────────────────
            ['2026-06-12 02:00', 'MEX', 'RSA', 'A'],
            ['2026-06-12 09:00', 'KOR', 'CZE', 'A'],
            ['2026-06-13 02:00', 'CAN', 'BIH', 'B'],
            ['2026-06-13 09:00', 'USA', 'PAR', 'D'],
            ['2026-06-14 02:00', 'HAI', 'SCO', 'C'],
            ['2026-06-14 05:00', 'AUS', 'TUR', 'D'],
            ['2026-06-14 08:00', 'BRA', 'MAR', 'C'],
            ['2026-06-14 11:00', 'QAT', 'SUI', 'B'],
            ['2026-06-15 02:00', 'CIV', 'ECU', 'E'],
            ['2026-06-15 05:00', 'GER', 'CUW', 'E'],
            ['2026-06-15 08:00', 'NED', 'JPN', 'F'],
            ['2026-06-15 11:00', 'SWE', 'TUN', 'F'],
            ['2026-06-15 23:00', 'ESP', 'CPV', 'H'],
            ['2026-06-16 02:00', 'BEL', 'EGY', 'G'],
            ['2026-06-16 05:00', 'KSA', 'URU', 'H'],
            ['2026-06-16 08:00', 'IRN', 'NZL', 'G'],
            ['2026-06-17 02:00', 'FRA', 'SEN', 'I'],
            ['2026-06-17 05:00', 'IRQ', 'NOR', 'I'],
            ['2026-06-17 08:00', 'ARG', 'ALG', 'J'],
            ['2026-06-17 11:00', 'AUT', 'JOR', 'J'],
            ['2026-06-17 23:00', 'GHA', 'PAN', 'L'],
            ['2026-06-18 02:00', 'ENG', 'CRO', 'L'],
            ['2026-06-18 05:00', 'POR', 'COD', 'K'],
            ['2026-06-18 08:00', 'UZB', 'COL', 'K'],

            // ── Lượt 2 ──────────────────────────────────────────────────────────
            ['2026-06-18 23:00', 'CZE', 'RSA', 'A'],
            ['2026-06-19 02:00', 'SUI', 'BIH', 'B'],
            ['2026-06-19 05:00', 'CAN', 'QAT', 'B'],
            ['2026-06-19 08:00', 'MEX', 'KOR', 'A'],
            ['2026-06-20 02:00', 'USA', 'AUS', 'D'],
            ['2026-06-20 05:00', 'SCO', 'MAR', 'C'],
            ['2026-06-20 07:30', 'BRA', 'HAI', 'C'],
            ['2026-06-20 10:00', 'TUR', 'PAR', 'D'],
            ['2026-06-21 00:00', 'NED', 'SWE', 'F'],
            ['2026-06-21 03:00', 'GER', 'CIV', 'E'],
            ['2026-06-21 07:00', 'ECU', 'CUW', 'E'],
            ['2026-06-21 11:00', 'TUN', 'JPN', 'F'],
            ['2026-06-21 23:00', 'ESP', 'KSA', 'H'],
            ['2026-06-22 02:00', 'BEL', 'IRN', 'G'],
            ['2026-06-22 05:00', 'URU', 'CPV', 'H'],
            ['2026-06-22 08:00', 'NZL', 'EGY', 'G'],
            ['2026-06-23 00:00', 'ARG', 'AUT', 'J'],
            ['2026-06-23 04:00', 'FRA', 'IRQ', 'I'],
            ['2026-06-23 07:00', 'NOR', 'SEN', 'I'],
            ['2026-06-23 10:00', 'JOR', 'ALG', 'J'],
            ['2026-06-24 00:00', 'POR', 'UZB', 'K'],
            ['2026-06-24 03:00', 'ENG', 'GHA', 'L'],
            ['2026-06-24 06:00', 'PAN', 'CRO', 'L'],
            ['2026-06-24 09:00', 'COL', 'COD', 'K'],

            // ── Lượt 3 ──────────────────────────────────────────────────────────
            ['2026-06-24 23:00', 'SUI', 'CAN', 'B'],
            ['2026-06-24 23:00', 'BIH', 'QAT', 'B'],
            ['2026-06-25 02:00', 'SCO', 'BRA', 'C'],
            ['2026-06-25 02:00', 'MAR', 'HAI', 'C'],
            ['2026-06-25 05:00', 'CZE', 'MEX', 'A'],
            ['2026-06-25 05:00', 'RSA', 'KOR', 'A'],
            ['2026-06-25 23:00', 'CUW', 'CIV', 'E'],
            ['2026-06-25 23:00', 'ECU', 'GER', 'E'],
            ['2026-06-26 02:00', 'JPN', 'SWE', 'F'],
            ['2026-06-26 02:00', 'TUN', 'NED', 'F'],
            ['2026-06-26 05:00', 'TUR', 'USA', 'D'],
            ['2026-06-26 05:00', 'PAR', 'AUS', 'D'],
            ['2026-06-26 23:00', 'NOR', 'FRA', 'I'],
            ['2026-06-26 23:00', 'SEN', 'IRQ', 'I'],
            ['2026-06-27 02:00', 'EGY', 'IRN', 'G'],
            ['2026-06-27 02:00', 'NZL', 'BEL', 'G'],
            ['2026-06-27 05:00', 'CPV', 'KSA', 'H'],
            ['2026-06-27 05:00', 'URU', 'ESP', 'H'],
            ['2026-06-27 23:00', 'COL', 'POR', 'K'],
            ['2026-06-27 23:00', 'COD', 'UZB', 'K'],
            ['2026-06-28 02:00', 'PAN', 'ENG', 'L'],
            ['2026-06-28 02:00', 'CRO', 'GHA', 'L'],
            ['2026-06-28 05:00', 'JOR', 'ARG', 'J'],
            ['2026-06-28 05:00', 'ALG', 'AUT', 'J'],
        ];

        foreach ($groupMatches as [$vnTime, $homeCode, $awayCode, $group]) {
            if (!isset($t[$homeCode]) || !isset($t[$awayCode])) continue;
            WorldCupMatch::firstOrCreate(
                ['home_team_id' => $t[$homeCode], 'away_team_id' => $t[$awayCode], 'round' => 'group'],
                [
                    'match_date' => $this->vn($vnTime),
                    'group_name' => $group,
                    'status'     => 'scheduled',
                    'home_score' => null,
                    'away_score' => null,
                    'venue'      => "Stadium {$group}",
                ]
            );
        }
    }

    private function seedKnockoutSlots(): void
    {
        $slots = [
            ['2026-06-29 02:00', 'round_of_32'],
            ['2026-06-29 05:00', 'round_of_32'],
            ['2026-06-29 08:00', 'round_of_32'],
            ['2026-06-30 02:00', 'round_of_32'],
            ['2026-06-30 05:00', 'round_of_32'],
            ['2026-06-30 08:00', 'round_of_32'],
            ['2026-07-01 02:00', 'round_of_32'],
            ['2026-07-01 05:00', 'round_of_32'],
            ['2026-07-01 08:00', 'round_of_32'],
            ['2026-07-02 02:00', 'round_of_32'],
            ['2026-07-02 05:00', 'round_of_32'],
            ['2026-07-02 08:00', 'round_of_32'],
            ['2026-07-03 03:00', 'round_of_32'],
            ['2026-07-03 07:00', 'round_of_32'],
            ['2026-07-04 03:00', 'round_of_32'],
            ['2026-07-04 07:00', 'round_of_32'],
            ['2026-07-05 03:00', 'round_of_16'],
            ['2026-07-05 07:00', 'round_of_16'],
            ['2026-07-06 03:00', 'round_of_16'],
            ['2026-07-06 07:00', 'round_of_16'],
            ['2026-07-07 03:00', 'round_of_16'],
            ['2026-07-07 07:00', 'round_of_16'],
            ['2026-07-08 03:00', 'round_of_16'],
            ['2026-07-08 07:00', 'round_of_16'],
            ['2026-07-10 05:00', 'quarter_final'],
            ['2026-07-11 05:00', 'quarter_final'],
            ['2026-07-12 03:00', 'quarter_final'],
            ['2026-07-12 07:00', 'quarter_final'],
            ['2026-07-15 05:00', 'semi_final'],
            ['2026-07-16 05:00', 'semi_final'],
            ['2026-07-19 03:00', 'third_place'],
            ['2026-07-20 03:00', 'final'],
        ];

        $teams = Team::all()->values();
        $total = $teams->count();

        foreach ($slots as $i => [$vnTime, $round]) {
            $utc = $this->vn($vnTime);
            // Only create if this (date, round) slot doesn't exist yet
            if (!WorldCupMatch::where('round', $round)->whereDate('match_date', $utc->toDateString())->where('match_date', $utc)->exists()) {
                $home = $teams[($i * 2)     % $total];
                $away = $teams[($i * 2 + 1) % $total];
                WorldCupMatch::create([
                    'home_team_id' => $home->id,
                    'away_team_id' => $away->id,
                    'match_date'   => $utc,
                    'round'        => $round,
                    'group_name'   => null,
                    'status'       => 'scheduled',
                    'home_score'   => null,
                    'away_score'   => null,
                    'venue'        => 'TBD',
                ]);
            }
        }
    }
}
