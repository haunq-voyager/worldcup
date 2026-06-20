<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TournamentPrediction extends Model
{
    protected $fillable = ['user_id', 'team_id', 'stage', 'is_correct'];

    protected $casts = ['is_correct' => 'boolean'];

    public function user(): BelongsTo  { return $this->belongsTo(User::class); }
    public function team(): BelongsTo  { return $this->belongsTo(Team::class); }
}
