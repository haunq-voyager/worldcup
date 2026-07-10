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
            ->where(function ($query) {
                $query->where('round', 'group')
                    ->orWhere('status', '!=', 'scheduled')
                    ->orWhereNotNull('odds_updated_at')
                    ->orWhereNotNull('home_score')
                    ->orWhereNotNull('away_score');
            })
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
        $this->attachTrashTalks($matches);

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
        $this->attachTrashTalks(collect([$match]));

        $user = auth()->guard('sanctum')->user();
        if ($user) {
            $match->user_prediction = Prediction::where('user_id', $user->id)
                ->where('match_id', $match->id)
                ->first();
        }

        return response()->json($match);
    }

    private function attachTrashTalks($matches): void
    {
        $activeMatches = $matches->filter(fn (WorldCupMatch $match) =>
            $match->status === 'live' || ($match->status === 'scheduled' && $match->match_date->isFuture())
        );
        $matchIds = $activeMatches->pluck('id');

        if ($matches->isEmpty()) {
            return;
        }

        $trashTalks = $matchIds->isEmpty()
            ? collect()
            : Prediction::query()
                ->select(['id', 'user_id', 'match_id', 'trash_talk', 'created_at'])
                ->with('user:id,name,avatar_path,google_avatar_url')
                ->whereIn('match_id', $matchIds)
                ->whereNotNull('trash_talk')
                ->where('trash_talk', '!=', '')
                ->orderBy('created_at')
                ->get()
                ->groupBy('match_id');

        $matches->each(function (WorldCupMatch $match) use ($trashTalks) {
            $match->setAttribute('trash_talks', ($trashTalks->get($match->id) ?? collect())
                ->map(fn (Prediction $prediction) => [
                    'id' => $prediction->id,
                    'message' => $prediction->trash_talk,
                    'created_at' => $prediction->created_at,
                    'match' => [
                        'id' => $match->id,
                        'home_team' => $match->homeTeam->name,
                        'away_team' => $match->awayTeam->name,
                    ],
                    'user' => [
                        'id' => $prediction->user->id,
                        'name' => $prediction->user->name,
                        'avatar_url' => $prediction->user->avatar_url,
                    ],
                ])
                ->values());
        });
    }
}
