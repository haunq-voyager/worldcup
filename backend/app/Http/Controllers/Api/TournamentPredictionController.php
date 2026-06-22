<?php

namespace App\Http\Controllers\Api;

use App\Models\Team;
use App\Models\TournamentPrediction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TournamentPredictionController extends Controller
{
    // Stage limits and points
    private const STAGES = [
        'quarter_final' => ['limit' => 8,  'points' => 2,  'label' => 'Tứ kết'],
        'semi_final'    => ['limit' => 4,  'points' => 3,  'label' => 'Bán kết'],
        'runner_up'     => ['limit' => 1,  'points' => 6,  'label' => 'Á quân'],
        'champion'      => ['limit' => 1,  'points' => 10, 'label' => 'Vô địch'],
    ];

    // Lock dates (UTC): can no longer change picks after this date
    private const LOCK_DATES = [
        'quarter_final' => '2026-07-04 00:00:00',
        'semi_final'    => '2026-07-11 00:00:00',
        'runner_up'     => '2026-07-15 00:00:00',
        'champion'      => '2026-07-19 00:00:00',
    ];

    public function my(): JsonResponse
    {
        $user = auth()->user();
        $picks = TournamentPrediction::where('user_id', $user->id)
            ->with('team:id,name,country_code,flag_url,group_name')
            ->get()
            ->groupBy('stage');

        $result = [];
        foreach (array_keys(self::STAGES) as $stage) {
            $result[$stage] = ($picks[$stage] ?? collect())->map(fn($p) => [
                'id'         => $p->id,
                'team_id'    => $p->team_id,
                'team'       => $p->team,
                'is_correct' => $p->is_correct,
            ])->values();
        }

        $result['stages_info'] = collect(self::STAGES)->map(fn($s, $k) => [
            ...$s,
            'locked' => now()->gte(self::LOCK_DATES[$k]),
        ]);

        return response()->json($result);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'stage'    => 'required|in:quarter_final,semi_final,runner_up,champion',
            'team_ids' => 'required|array',
            'team_ids.*' => 'integer|exists:teams,id',
        ]);

        $stage = $data['stage'];
        $teamIds = array_unique($data['team_ids']);

        // Check lock
        if (now()->gte(self::LOCK_DATES[$stage])) {
            return response()->json(['message' => 'Đã hết thời gian dự đoán cho giai đoạn này.'], 403);
        }

        // Check limit
        $limit = self::STAGES[$stage]['limit'];
        if (count($teamIds) > $limit) {
            return response()->json(['message' => "Giai đoạn này chỉ chọn tối đa {$limit} đội."], 422);
        }

        $user = auth()->user();

        // Delete old picks, insert new
        TournamentPrediction::where('user_id', $user->id)->where('stage', $stage)->delete();

        foreach ($teamIds as $teamId) {
            TournamentPrediction::create([
                'user_id' => $user->id,
                'team_id' => $teamId,
                'stage'   => $stage,
            ]);
        }

        return response()->json(['message' => 'Đã lưu dự đoán.', 'count' => count($teamIds)]);
    }

    // Admin: settle a stage after it's complete
    public function settle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'stage'    => 'required|in:quarter_final,semi_final,runner_up,champion',
            'team_ids' => 'required|array',
            'team_ids.*' => 'integer|exists:teams,id',
        ]);

        $stage   = $data['stage'];
        $correct = array_map('intval', $data['team_ids']);
        $points  = self::STAGES[$stage]['points'];

        $predictions = TournamentPrediction::where('stage', $stage)->with('user')->get();
        $settled = 0;

        foreach ($predictions as $p) {
            $isCorrect = in_array($p->team_id, $correct);
            $p->update(['is_correct' => $isCorrect]);
            if ($isCorrect) {
                $p->user->increment('total_points', $points);
                $settled++;
            }
        }

        return response()->json(['message' => "Đã chấm {$settled} dự đoán đúng cho giai đoạn {$stage}."]);
    }

    // Public: leaderboard for tournament predictions
    public function leaderboard(): JsonResponse
    {
        $data = TournamentPrediction::with(['user:id,name', 'team:id,name,flag_url'])
            ->where('is_correct', true)
            ->get()
            ->groupBy('user_id')
            ->map(fn($picks, $userId) => [
                'user'   => $picks->first()->user,
                'points' => $picks->sum(fn($p) => self::STAGES[$p->stage]['points']),
                'picks'  => $picks->count(),
            ])
            ->sortByDesc('points')
            ->values();

        return response()->json($data);
    }
}
