<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->get('per_page', 20);

        $leaders = User::select(['id', 'name', 'email', 'total_points', 'correct_predictions', 'total_predictions'])
            ->orderByDesc('total_points')
            ->orderByDesc('correct_predictions')
            ->paginate($perPage);

        // Attach rank
        $rank = ($leaders->currentPage() - 1) * $leaders->perPage() + 1;
        $leaders->getCollection()->transform(function ($user) use (&$rank) {
            $user->rank = $rank++;
            $user->accuracy = $user->total_predictions > 0
                ? round(($user->correct_predictions / $user->total_predictions) * 100, 1)
                : 0;
            return $user;
        });

        // Current user's rank
        $currentUserRank = null;
        if ($request->user()) {
            $currentUserRank = User::where('total_points', '>', $request->user()->total_points)->count() + 1;
        }

        return response()->json([
            'data'              => $leaders,
            'current_user_rank' => $currentUserRank,
        ]);
    }
}
