<?php

namespace App\Services;

use App\Models\User;

class AdminAccessService
{
    public function isAllowed(string $email): bool
    {
        $allowedEmails = array_map(
            static fn (string $allowedEmail): string => strtolower(trim($allowedEmail)),
            config('admins.emails', []),
        );

        return in_array(strtolower(trim($email)), $allowedEmails, true);
    }

    public function grantIfAllowed(User $user): User
    {
        if (! $user->is_admin && $this->isAllowed($user->email)) {
            $user->is_admin = true;
            $user->save();
        }

        return $user;
    }
}
