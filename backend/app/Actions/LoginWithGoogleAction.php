<?php

namespace App\Actions;

use App\Contracts\GoogleIdentityContract;
use App\Exceptions\InvalidGoogleCredentialException;
use App\Models\User;
use App\Services\AdminAccessService;
use Illuminate\Support\Facades\DB;

class LoginWithGoogleAction
{
    public function __construct(
        private GoogleIdentityContract $googleIdentity,
        private AdminAccessService $adminAccess,
    ) {
    }

    /** @return array{user: User, token: string} */
    public function execute(string $credential): array
    {
        $identity = $this->googleIdentity->verify($credential);

        $user = DB::transaction(function () use ($identity): User {
            $user = User::query()
                ->where('google_id', $identity['subject'])
                ->lockForUpdate()
                ->first();

            if (! $user) {
                $user = User::query()
                    ->where('email', $identity['email'])
                    ->lockForUpdate()
                    ->first();
            }

            if ($user?->google_id && $user->google_id !== $identity['subject']) {
                throw new InvalidGoogleCredentialException(
                    'Email này đã được liên kết với một tài khoản Google khác.',
                );
            }

            if (! $user) {
                $user = new User();
                $user->email = $identity['email'];
                $user->name = $identity['name'];
                $user->password = null;
                $user->is_admin = $this->adminAccess->isAllowed($identity['email']);
            }

            $user->google_id = $identity['subject'];
            $user->google_avatar_url = $identity['avatar_url'];
            $user->email_verified_at ??= now();
            $user->save();

            return $this->adminAccess->grantIfAllowed($user);
        });

        $user->tokens()->delete();

        return [
            'user' => $user->fresh(),
            'token' => $user->createToken('google_auth')->plainTextToken,
        ];
    }
}
