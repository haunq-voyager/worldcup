<?php

namespace App\Contracts;

/**
 * @phpstan-type GoogleIdentityPayload array{
 *     subject: string,
 *     email: string,
 *     name: string,
 *     avatar_url: string|null
 * }
 */
interface GoogleIdentityContract
{
    /** @return GoogleIdentityPayload */
    public function verify(string $credential): array;
}
