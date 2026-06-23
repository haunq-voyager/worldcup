<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaderboardController extends Controller
{
    private const ROUNDS = [
        'group', 'round_of_32', 'round_of_16', 'quarter_final',
        'semi_final', 'third_place', 'final',
    ];

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->get('per_page', 20);
        $round   = $request->get('round');
        $round   = in_array($round, self::ROUNDS, true) ? $round : null;

        if ($round) {
            return $this->byRound($request, $round, $perPage);
        }

        return $this->overall($request, $perPage);
    }

    private function overall(Request $request, int $perPage): JsonResponse
    {
        $leaders = User::select(['id', 'name', 'email', 'avatar_path', 'total_points', 'correct_predictions', 'total_predictions'])
            ->orderByDesc('total_points')
            ->orderByDesc('correct_predictions')
            ->paginate($perPage);

        $rank = ($leaders->currentPage() - 1) * $leaders->perPage() + 1;
        $leaders->getCollection()->transform(function ($user) use (&$rank) {
            $user->rank = $rank++;
            $user->accuracy = $user->total_predictions > 0
                ? round(($user->correct_predictions / $user->total_predictions) * 100, 1)
                : 0;
            return $user;
        });

        $currentUserRank = null;
        if ($request->user()) {
            $currentUserRank = User::where('total_points', '>', $request->user()->total_points)->count() + 1;
        }

        return response()->json([
            'data'              => $leaders,
            'current_user_rank' => $currentUserRank,
        ]);
    }

    private function byRound(Request $request, string $round, int $perPage): JsonResponse
    {
        // Per-round aggregates from each user's predictions in that round.
        $agg = DB::table('predictions')
            ->join('world_cup_matches', 'predictions.match_id', '=', 'world_cup_matches.id')
            ->where('world_cup_matches.round', $round)
            ->groupBy('predictions.user_id')
            ->select(
                'predictions.user_id',
                DB::raw('COALESCE(SUM(predictions.points_earned), 0) as round_points'),
                DB::raw('SUM(CASE WHEN predictions.is_correct THEN 1 ELSE 0 END) as round_correct'),
                DB::raw('COUNT(predictions.id) as round_total')
            );

        $leaders = User::query()
            ->joinSub($agg, 'rp', 'rp.user_id', '=', 'users.id')
            ->select([
                'users.id',
                'users.name',
                'users.email',
                'users.avatar_path',
                DB::raw('rp.round_points as total_points'),
                DB::raw('rp.round_correct as correct_predictions'),
                DB::raw('rp.round_total as total_predictions'),
            ])
            ->orderByDesc('rp.round_points')
            ->orderByDesc('rp.round_correct')
            ->paginate($perPage);

        $rank = ($leaders->currentPage() - 1) * $leaders->perPage() + 1;
        $leaders->getCollection()->transform(function ($user) use (&$rank) {
            $user->total_points        = (int) $user->total_points;
            $user->correct_predictions = (int) $user->correct_predictions;
            $user->total_predictions   = (int) $user->total_predictions;
            $user->rank = $rank++;
            $user->accuracy = $user->total_predictions > 0
                ? round(($user->correct_predictions / $user->total_predictions) * 100, 1)
                : 0;
            return $user;
        });

        $currentUserRank = null;
        if ($request->user()) {
            $myPoints = (int) DB::table('predictions')
                ->join('world_cup_matches', 'predictions.match_id', '=', 'world_cup_matches.id')
                ->where('world_cup_matches.round', $round)
                ->where('predictions.user_id', $request->user()->id)
                ->sum('predictions.points_earned');

            $hasPlayed = DB::table('predictions')
                ->join('world_cup_matches', 'predictions.match_id', '=', 'world_cup_matches.id')
                ->where('world_cup_matches.round', $round)
                ->where('predictions.user_id', $request->user()->id)
                ->exists();

            if ($hasPlayed) {
                $currentUserRank = DB::query()->fromSub($agg, 'rp')
                    ->where('rp.round_points', '>', $myPoints)
                    ->count() + 1;
            }
        }

        return response()->json([
            'data'              => $leaders,
            'current_user_rank' => $currentUserRank,
        ]);
    }
}
