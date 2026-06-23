<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'google_id',
        'google_avatar_url',
        'is_admin',
        'total_points',
        'correct_predictions',
        'total_predictions',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'avatar_path',
        'google_id',
        'google_avatar_url',
    ];

    protected $appends = ['avatar_url'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
        ];
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar_path
            ? Storage::disk('public')->url($this->avatar_path)
            : $this->google_avatar_url;
    }

    public function predictions(): HasMany
    {
        return $this->hasMany(Prediction::class);
    }

    public function specialPredictions(): HasMany
    {
        return $this->hasMany(SpecialPrediction::class);
    }
}
