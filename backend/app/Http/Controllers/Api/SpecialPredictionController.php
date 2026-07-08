<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SpecialPrediction;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SpecialPredictionController extends Controller
{
    private const STAKE = 50;
    private const TYPES = ['champion', 'best_player'];
    private const SETTLE_AVAILABLE_DATE = '2026-07-20';

    /** GET /special-predictions  (auth) - current user's predictions */
    public function index(Request $request)
    {
        return $request->user()->specialPredictions;
    }

    /** GET /special-predictions/all  (public) - everyone's predictions for a type */
    public function all(Request $request)
    {
        $type = $request->query('type', 'champion');
        if (!in_array($type, self::TYPES, true)) {
            return response()->json(['message' => 'Loai du doan khong hop le.'], 422);
        }

        return SpecialPrediction::where('type', $type)
            ->with('user:id,name,email,avatar_path,google_avatar_url')
            ->orderByDesc('created_at')
            ->get();
    }

    /** POST /special-predictions  (auth) - stopped */
    public function store(Request $request)
    {
        return response()->json(['message' => 'Binh chon dac biet da dung.'], 422);
    }

    /** DELETE /special-predictions/{id}  (auth) - stopped */
    public function destroy(Request $request, SpecialPrediction $specialPrediction)
    {
        return response()->json(['message' => 'Binh chon dac biet da dung, khong the huy.'], 422);
    }

    /** POST /special-predictions/settle  (admin) - pool-settle a type */
    public function settle(Request $request)
    {
        if (!$request->user()->is_admin) {
            return response()->json(['message' => 'Khong co quyen.'], 403);
        }

        $request->validate([
            'type'         => 'required|in:champion,best_player',
            'winner_ids'   => 'present|array',
            'winner_ids.*' => 'integer',
        ]);

        if (CarbonImmutable::today()->lt(CarbonImmutable::parse(self::SETTLE_AVAILABLE_DATE))) {
            return response()->json([
                'message' => 'Chi duoc cap nhat ket qua binh chon dac biet tu ngay 20/07/2026 sau tran cuoi cung.',
            ], 422);
        }

        DB::transaction(function () use ($request) {
            $predictions = SpecialPrediction::where('type', $request->type)
                ->whereNull('is_correct')
                ->with('user')
                ->lockForUpdate()
                ->get();

            if ($predictions->isEmpty()) {
                return;
            }

            $winnerIds = collect($request->input('winner_ids', []))
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();

            $invalidWinnerIds = $winnerIds->diff($predictions->pluck('id'));
            if ($invalidWinnerIds->isNotEmpty()) {
                abort(response()->json(['message' => 'Danh sach nguoi binh chon dung khong hop le.'], 422));
            }

            $winners = $predictions->filter(fn ($prediction) => $winnerIds->contains($prediction->id))->values();
            $losers = $predictions->reject(fn ($prediction) => $winnerIds->contains($prediction->id))->values();

            if ($winners->isNotEmpty()) {
                $pot = $losers->count() * self::STAKE;
                $winnerCount = $winners->count();
                $baseShare = intdiv($pot, $winnerCount);
                $remainder = $pot % $winnerCount;

                foreach ($winners as $index => $winner) {
                    $share = $baseShare + ($index < $remainder ? 1 : 0);
                    $winner->user->increment('total_points', $share);
                    $winner->user->increment('total_predictions');
                    $winner->user->increment('correct_predictions');
                    $winner->forceFill([
                        'is_correct' => true,
                        'points_earned' => $share,
                        'settle_delta' => $share,
                    ])->save();
                }

                foreach ($losers as $loser) {
                    $loser->user->decrement('total_points', self::STAKE);
                    $loser->user->increment('total_predictions');
                    $loser->forceFill([
                        'is_correct' => false,
                        'points_earned' => -self::STAKE,
                        'settle_delta' => -self::STAKE,
                    ])->save();
                }
            } else {
                // No winner - nobody loses.
                foreach ($predictions as $prediction) {
                    $prediction->user->increment('total_predictions');
                    $prediction->forceFill([
                        'is_correct' => false,
                        'points_earned' => 0,
                        'settle_delta' => 0,
                    ])->save();
                }
            }
        });

        return response()->json(['message' => 'Da tinh diem du doan dac biet.']);
    }
}
