<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Team::query();

        if ($request->filled('group')) {
            $query->where('group_name', strtoupper($request->group));
        }

        if ($request->filled('search')) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        $teams = $query->orderBy('group_name')->orderBy('name')->get();

        return response()->json($teams);
    }

    public function show(Team $team): JsonResponse
    {
        $team->load([
            'homeMatches.awayTeam',
            'awayMatches.homeTeam',
        ]);

        return response()->json($team);
    }
}
