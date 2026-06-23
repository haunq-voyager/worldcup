<?php

namespace App\Integrations;

use App\Contracts\GoogleIdentityContract;
use App\Exceptions\InvalidGoogleCredentialException;
use Google\Client;

class GoogleIdentityAdapter implements GoogleIdentityContract
{
    public function __construct(private Client $client)
    {
    }

    public function verify(string $credential): array
    {
        $payload = $this->client->verifyIdToken($credential);

        if (! is_array($payload)) {
            throw new InvalidGoogleCredentialException('Phiên đăng nhập Google không hợp lệ.');
        }

        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $subject = trim((string) ($payload['sub'] ?? ''));
        $hostedDomain = strtolower(trim((string) ($payload['hd'] ?? '')));
        $allowedDomain = strtolower(trim((string) config('google.allowed_domain')));
        $emailVerified = filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOL);

        if (
            $subject === ''
            || $email === ''
            || ! $emailVerified
            || $hostedDomain !== $allowedDomain
            || ! str_ends_with($email, '@'.$allowedDomain)
        ) {
            throw new InvalidGoogleCredentialException(
                'Chỉ tài khoản Google Workspace @'.$allowedDomain.' được phép đăng nhập.',
            );
        }

        return [
            'subject' => $subject,
            'email' => $email,
            'name' => trim((string) ($payload['name'] ?? $email)),
            'avatar_url' => filled($payload['picture'] ?? null)
                ? (string) $payload['picture']
                : null,
        ];
    }
}
