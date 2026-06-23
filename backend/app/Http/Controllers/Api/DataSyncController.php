<?php

namespace App\Http\Controllers\Api;

use App\Actions\SyncWorldCupDataAction;
use App\Exceptions\SyncInProgressException;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

class DataSyncController extends Controller
{
    public function __invoke(Request $request, SyncWorldCupDataAction $action): JsonResponse
    {
        if (! $request->user()->is_admin) {
            return response()->json(
                ['message' => 'Bạn không có quyền cập nhật dữ liệu.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        try {
            $result = $action->execute();
        } catch (SyncInProgressException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                Response::HTTP_CONFLICT,
            );
        } catch (RuntimeException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                Response::HTTP_BAD_GATEWAY,
            );
        }

        return response()->json([
            'message' => 'Cập nhật lịch thi đấu, tỷ số và odds thành công.',
            'data' => $result,
        ], Response::HTTP_OK);
    }
}
