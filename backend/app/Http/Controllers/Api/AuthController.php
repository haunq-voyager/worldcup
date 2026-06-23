<?php

namespace App\Http\Controllers\Api;

use App\Actions\LoginWithGoogleAction;
use App\Actions\UpdateUserAvatarAction;
use App\Exceptions\InvalidGoogleCredentialException;
use App\Http\Controllers\Controller;
use App\Http\Requests\GoogleLoginRequest;
use App\Http\Requests\UpdateAvatarRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function googleLogin(GoogleLoginRequest $request, LoginWithGoogleAction $action): JsonResponse
    {
        try {
            $auth = $action->execute($request->string('credential')->toString());
        } catch (InvalidGoogleCredentialException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        return response()->json($auth, Response::HTTP_OK);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Đăng xuất thành công.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $request->user()->update(['name' => $validated['name']]);

        return response()->json($request->user()->fresh());
    }

    public function updateAvatar(UpdateAvatarRequest $request, UpdateUserAvatarAction $action): JsonResponse
    {
        $user = $action->execute($request->user(), $request->file('avatar'));

        return response()->json($user);
    }
}
