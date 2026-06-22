<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prediction;
use App\Models\WorldCupMatch;
use App\Services\MatchSettlementService;
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

    public function updateResult(Request $request, WorldCupMatch $match, MatchSettlementService $settlement): JsonResponse
    {
        if (!auth()->user()->is_admin) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'home_score' => 'required|integer|min:0',
            'away_score' => 'required|integer|min:0',
        ]);

        // Re-entering a result: undo the previous payout first.
        if ($match->settled) {
            $settlement->reverse($match);
        }

        $match->home_score = $validated['home_score'];
        $match->away_score = $validated['away_score'];
        $match->status = 'finished';
        $match->result = $match->computeResult();
        $match->save();

        $settlement->settle($match);

        return response()->json($match->fresh()->load(['homeTeam', 'awayTeam']));
    }
}
