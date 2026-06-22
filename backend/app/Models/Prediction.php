<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Prediction extends Model
{
    protected $fillable = [
        'user_id',
        'match_id',
        'prediction',
        'predicted_home_score',
        'predicted_away_score',
        'stake',
        'is_correct',
        'points_earned',
        'settle_delta',
    ];

    protected $casts = [
        'is_correct' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(WorldCupMatch::class, 'match_id');
    }
}
