<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prediction;
use App\Models\WorldCupMatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = WorldCupMatch::with(['homeTeam', 'awayTeam'])
            ->orderBy('match_date');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('round')) {
            $query->where('round', $request->round);
        }
        if ($request->filled('group')) {
            $query->where('group_name', strtoupper($request->group));
        }

        $matches = $query->get();

        // Optionally attach user's prediction (works even on public routes)
        $user = auth()->guard('sanctum')->user();
        if ($user) {
            $predictions = Prediction::where('user_id', $user->id)
                ->whereIn('match_id', $matches->pluck('id'))
                ->get()
                ->keyBy('match_id');

            $matches = $matches->map(function ($match) use ($predictions) {
                $match->user_prediction = $predictions->get($match->id);
                return $match;
            });
        }

        return response()->json($matches);
    }

    public function show(Request $request, WorldCupMatch $match): JsonResponse
    {
        $match->load(['homeTeam', 'awayTeam']);

        $user = auth()->guard('sanctum')->user();
        if ($user) {
            $match->user_prediction = Prediction::where('user_id', $user->id)
                ->where('match_id', $match->id)
                ->first();
        }

        return response()->json($match);
    }

    public function updateResult(Request $request, WorldCupMatch $match): JsonResponse
    {
        if (!auth()->user()->is_admin) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'home_score' => 'required|integer|min:0',
            'away_score' => 'required|integer|min:0',
        ]);

        $match->home_score = $validated['home_score'];
        $match->away_score = $validated['away_score'];
        $match->status = 'finished';
        $match->result = $match->computeResult();
        $match->save();

        $this->settlePredictions($match);

        return response()->json($match->load(['homeTeam', 'awayTeam']));
    }

    private function settlePredictions(WorldCupMatch $match): void
    {
        $predictions = Prediction::where('match_id', $match->id)->with('user')->get();

        foreach ($predictions as $prediction) {
            // Undo previous settlement to prevent double-counting on re-runs
            if ($prediction->is_correct !== null) {
                $prediction->user->decrement('total_predictions');
                if ($prediction->is_correct) {
                    $prediction->user->decrement('correct_predictions');
                    $prediction->user->decrement('total_points', $prediction->points_earned);
                }
            }

            $isCorrect = $prediction->prediction === $match->result;
            $points    = $isCorrect ? 3 : 0;

            $prediction->update([
                'is_correct'    => $isCorrect,
                'points_earned' => $points,
            ]);

            $prediction->user->increment('total_predictions');
            if ($isCorrect) {
                $prediction->user->increment('correct_predictions');
                $prediction->user->increment('total_points', $points);
            }
        }
    }
}
