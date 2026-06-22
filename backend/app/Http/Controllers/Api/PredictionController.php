<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prediction;
use App\Models\WorldCupMatch;
use App\Services\MatchSettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PredictionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'match_id'             => 'required|exists:world_cup_matches,id',
            'predicted_home_score' => 'required|integer|min:0|max:99',
            'predicted_away_score' => 'required|integer|min:0|max:99',
        ]);

        $match = WorldCupMatch::findOrFail($validated['match_id']);

        if ($match->status !== 'scheduled') {
            return response()->json(['message' => 'Trận đấu đã bắt đầu hoặc kết thúc, không thể dự đoán.'], 422);
        }
        if ($match->match_date->isPast()) {
            return response()->json(['message' => 'Thời gian dự đoán đã hết.'], 422);
        }

        $prediction = Prediction::updateOrCreate(
            [
                'user_id'  => $request->user()->id,
                'match_id' => $match->id,
            ],
            [
                'predicted_home_score' => $validated['predicted_home_score'],
                'predicted_away_score' => $validated['predicted_away_score'],
                'stake'                => MatchSettlementService::STAKE,
            ]
        );

        return response()->json($prediction->load('match.homeTeam', 'match.awayTeam'), 201);
    }

    public function myPredictions(Request $request): JsonResponse
    {
        $predictions = Prediction::where('user_id', $request->user()->id)
            ->with(['match.homeTeam', 'match.awayTeam'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($predictions);
    }

    public function destroy(Request $request, Prediction $prediction): JsonResponse
    {
        if ($prediction->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Không có quyền.'], 403);
        }

        $match = $prediction->match;
        if ($match->status !== 'scheduled' || $match->match_date->isPast()) {
            return response()->json(['message' => 'Không thể xóa dự đoán cho trận đã bắt đầu.'], 422);
        }

        $prediction->delete();

        return response()->json(['message' => 'Đã hủy dự đoán.']);
    }
}
