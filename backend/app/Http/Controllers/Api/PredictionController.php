<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePredictionRequest;
use App\Models\Prediction;
use App\Models\WorldCupMatch;
use App\Services\MatchSettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PredictionController extends Controller
{
    public function forMatch(Request $request, WorldCupMatch $match): JsonResponse
    {
        $validated = $request->validate([
            'page'     => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
        ]);

        $predictions = $match->predictions()
            ->select([
                'id',
                'user_id',
                'match_id',
                'predicted_home_score',
                'predicted_away_score',
                'trash_talk',
                'is_correct',
                'points_earned',
                'created_at',
            ])
            ->with('user:id,name,avatar_path')
            ->orderBy('created_at')
            ->paginate(
                perPage: $validated['per_page'] ?? 50,
                page: $validated['page'] ?? 1,
            );

        $summary = $match->predictions()
            ->selectRaw('COUNT(*) AS total')
            ->selectRaw('SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END) AS correct')
            ->selectRaw('SUM(CASE WHEN is_correct = false THEN 1 ELSE 0 END) AS wrong')
            ->selectRaw('SUM(CASE WHEN is_correct IS NULL THEN 1 ELSE 0 END) AS pending')
            ->first();

        return response()->json([
            'data' => $predictions->getCollection()->map(fn (Prediction $prediction) => [
                'id'                       => $prediction->id,
                'user'                     => [
                    'id'   => $prediction->user->id,
                    'name' => $prediction->user->name,
                    'avatar_url' => $prediction->user->avatar_url,
                ],
                'predicted_home_score'     => $prediction->predicted_home_score,
                'predicted_away_score'     => $prediction->predicted_away_score,
                'trash_talk'                => $prediction->trash_talk,
                'is_correct'               => $prediction->is_correct,
                'points_earned'            => $prediction->points_earned,
                'created_at'               => $prediction->created_at,
            ])->values(),
            'meta' => [
                'current_page' => $predictions->currentPage(),
                'last_page'    => $predictions->lastPage(),
                'per_page'     => $predictions->perPage(),
                'total'        => $predictions->total(),
            ],
            'summary' => [
                'total'   => (int) $summary->total,
                'correct' => (int) $summary->correct,
                'wrong'   => (int) $summary->wrong,
                'pending' => (int) $summary->pending,
            ],
        ]);
    }

    public function store(StorePredictionRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $match = WorldCupMatch::findOrFail($validated['match_id']);

        if ($match->status !== 'scheduled') {
            return response()->json(['message' => 'Trận đấu đã bắt đầu hoặc kết thúc, không thể dự đoán.'], 422);
        }
        if ($match->match_date->isPast()) {
            return response()->json(['message' => 'Thời gian dự đoán đã hết.'], 422);
        }

        $values = [
            'predicted_home_score' => $validated['predicted_home_score'],
            'predicted_away_score' => $validated['predicted_away_score'],
            'stake'                => MatchSettlementService::STAKE,
        ];

        if (array_key_exists('trash_talk', $validated)) {
            $values['trash_talk'] = $validated['trash_talk'];
        }

        $prediction = Prediction::updateOrCreate(
            [
                'user_id'  => $request->user()->id,
                'match_id' => $match->id,
            ],
            $values,
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
