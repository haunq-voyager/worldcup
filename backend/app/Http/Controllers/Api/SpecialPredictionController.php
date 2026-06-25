<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SpecialPrediction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SpecialPredictionController extends Controller
{
    private const STAKE = 50;
    private const TYPES = ['champion', 'best_player'];

    /** GET /special-predictions  (auth) — current user's predictions */
    public function index(Request $request)
    {
        return $request->user()->specialPredictions;
    }

    /** GET /special-predictions/all  (public) — everyone's predictions for a type */
    public function all(Request $request)
    {
        $type = $request->query('type', 'champion');
        if (!in_array($type, self::TYPES, true)) {
            return response()->json(['message' => 'Loại dự đoán không hợp lệ.'], 422);
        }

        return SpecialPrediction::where('type', $type)
            ->with('user:id,name,email,avatar_path,google_avatar_url')
            ->orderByDesc('created_at')
            ->get();
    }

    /** POST /special-predictions  (auth) — create or update */
    public function store(Request $request)
    {
        $request->validate([
            'type'  => 'required|in:champion,best_player',
            'value' => 'required|string|max:100',
        ]);

        $existing = SpecialPrediction::where('user_id', $request->user()->id)
            ->where('type', $request->type)
            ->first();

        if ($existing && $existing->is_correct !== null) {
            return response()->json(['message' => 'Dự đoán đã được tính điểm, không thể thay đổi.'], 422);
        }

        $prediction = SpecialPrediction::updateOrCreate(
            ['user_id' => $request->user()->id, 'type' => $request->type],
            ['value' => $request->value, 'stake' => self::STAKE],
        );

        return $prediction;
    }

    /** DELETE /special-predictions/{id}  (auth) */
    public function destroy(Request $request, SpecialPrediction $specialPrediction)
    {
        if ($specialPrediction->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Không có quyền.'], 403);
        }
        if ($specialPrediction->is_correct !== null) {
            return response()->json(['message' => 'Dự đoán đã được tính điểm, không thể hủy.'], 422);
        }
        $specialPrediction->delete();
        return response()->noContent();
    }

    /** POST /special-predictions/settle  (admin) — pool-settle a type */
    public function settle(Request $request)
    {
        if (!$request->user()->is_admin) {
            return response()->json(['message' => 'Không có quyền.'], 403);
        }

        $request->validate([
            'type'          => 'required|in:champion,best_player',
            'correct_value' => 'required|string',
        ]);

        DB::transaction(function () use ($request) {
            $preds = SpecialPrediction::where('type', $request->type)
                ->whereNull('is_correct')
                ->with('user')
                ->lockForUpdate()
                ->get();

            if ($preds->isEmpty()) {
                return;
            }

            $correct = mb_strtolower(trim($request->correct_value));
            $winners = $preds->filter(fn ($p) => mb_strtolower(trim($p->value)) === $correct)->values();
            $losers  = $preds->reject(fn ($p) => mb_strtolower(trim($p->value)) === $correct)->values();

            if ($winners->isNotEmpty()) {
                $pot  = $losers->count() * self::STAKE;
                $n    = $winners->count();
                $base = intdiv($pot, $n);
                $rem  = $pot % $n;

                foreach ($winners as $i => $w) {
                    $share = $base + ($i < $rem ? 1 : 0);
                    $w->user->increment('total_points', $share);
                    $w->user->increment('total_predictions');
                    $w->user->increment('correct_predictions');
                    $w->forceFill(['is_correct' => true, 'points_earned' => $share, 'settle_delta' => $share])->save();
                }

                foreach ($losers as $l) {
                    $l->user->decrement('total_points', self::STAKE);
                    $l->user->increment('total_predictions');
                    $l->forceFill(['is_correct' => false, 'points_earned' => -self::STAKE, 'settle_delta' => -self::STAKE])->save();
                }
            } else {
                // No winner — nobody loses.
                foreach ($preds as $p) {
                    $p->user->increment('total_predictions');
                    $p->forceFill(['is_correct' => false, 'points_earned' => 0, 'settle_delta' => 0])->save();
                }
            }
        });

        return response()->json(['message' => 'Đã tính điểm dự đoán đặc biệt.']);
    }
}
