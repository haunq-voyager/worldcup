<?php

namespace App\Services;

use App\Models\WorldCupMatch;
use Illuminate\Support\Facades\DB;

/**
 * Pool-based settlement for exact-score predictions.
 *
 * When a match finishes:
 *   - Correct predictors (exact score) share the pot formed by the losers' penalties.
 *   - Each wrong predictor loses STAKE vcoins (balance may go negative) — but ONLY
 *     when at least one player got it right.
 *   - If nobody is correct, nobody loses or gains.
 */
class MatchSettlementService
{
    public const STAKE = 10;

    public function settle(WorldCupMatch $match): void
    {
        if ($match->status !== 'finished' || $match->home_score === null || $match->away_score === null) {
            return;
        }
        if ($match->settled) {
            return;
        }

        DB::transaction(function () use ($match) {
            $preds = $match->predictions()->with('user')->lockForUpdate()->get();

            if ($preds->isEmpty()) {
                $match->settled = true;
                $match->save();
                return;
            }

            $isWinner = fn ($p) => (int) $p->predicted_home_score === (int) $match->home_score
                                && (int) $p->predicted_away_score === (int) $match->away_score;

            $winners = $preds->filter($isWinner)->values();
            $losers  = $preds->reject($isWinner)->values();

            if ($winners->isNotEmpty()) {
                $pot  = $losers->count() * self::STAKE;
                $n    = $winners->count();
                $base = intdiv($pot, $n);
                $rem  = $pot % $n;

                foreach ($winners as $i => $w) {
                    $share = $base + ($i < $rem ? 1 : 0); // spread the remainder
                    $w->user->increment('total_points', $share);
                    $w->user->increment('total_predictions');
                    $w->user->increment('correct_predictions');
                    $w->forceFill([
                        'is_correct'    => true,
                        'points_earned' => $share,
                        'settle_delta'  => $share,
                    ])->save();
                }

                foreach ($losers as $l) {
                    $l->user->decrement('total_points', self::STAKE); // may go negative
                    $l->user->increment('total_predictions');
                    $l->forceFill([
                        'is_correct'    => false,
                        'points_earned' => -self::STAKE,
                        'settle_delta'  => -self::STAKE,
                    ])->save();
                }
            } else {
                // No winner — nobody loses.
                foreach ($preds as $p) {
                    $p->user->increment('total_predictions');
                    $p->forceFill([
                        'is_correct'    => false,
                        'points_earned' => 0,
                        'settle_delta'  => 0,
                    ])->save();
                }
            }

            $match->settled = true;
            $match->save();
        });
    }

    /**
     * Undo a previous settlement (used when an admin re-enters a result).
     */
    public function reverse(WorldCupMatch $match): void
    {
        if (! $match->settled) {
            return;
        }

        DB::transaction(function () use ($match) {
            $preds = $match->predictions()->with('user')->lockForUpdate()->get();

            foreach ($preds as $p) {
                if ($p->settle_delta) {
                    $p->user->decrement('total_points', $p->settle_delta);
                }
                if ($p->is_correct !== null) {
                    $p->user->decrement('total_predictions');
                    if ($p->is_correct) {
                        $p->user->decrement('correct_predictions');
                    }
                }
                $p->forceFill([
                    'is_correct'    => null,
                    'points_earned' => 0,
                    'settle_delta'  => 0,
                ])->save();
            }

            $match->settled = false;
            $match->save();
        });
    }
}
