<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpecialPrediction extends Model
{
    protected $fillable = [
        'user_id', 'type', 'value', 'stake',
        'is_correct', 'points_earned', 'settle_delta',
    ];

    protected $casts = [
        'is_correct' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
