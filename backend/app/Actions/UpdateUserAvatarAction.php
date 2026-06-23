<?php

namespace App\Actions;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Throwable;

class UpdateUserAvatarAction
{
    public function execute(User $user, UploadedFile $avatar): User
    {
        $disk = Storage::disk('public');
        $newPath = $avatar->store('avatars', 'public');
        $oldPath = $user->avatar_path;

        try {
            $user->avatar_path = $newPath;
            $user->save();
        } catch (Throwable $exception) {
            $disk->delete($newPath);
            throw $exception;
        }

        if ($oldPath && $oldPath !== $newPath) {
            $disk->delete($oldPath);
        }

        return $user->fresh();
    }
}
