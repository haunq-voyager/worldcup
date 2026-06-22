<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorldCupMatch extends Model
{
    protected $table = 'world_cup_matches';

    protected $fillable = [
        'home_team_id',
        'away_team_id',
        'match_date',
        'venue',
        'round',
        'group_name',
        'status',
        'home_score',
        'away_score',
        'result',
        'settled',
        'odds',
        'odds_updated_at',
    ];

    protected $casts = [
        'match_date'      => 'datetime',
        'settled'         => 'boolean',
        'odds'            => 'array',
        'odds_updated_at' => 'datetime',
    ];

    public function homeTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'home_team_id');
    }

    public function awayTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'away_team_id');
    }

    public function predictions(): HasMany
    {
        return $this->hasMany(Prediction::class, 'match_id');
    }

    public function computeResult(): ?string
    {
        if ($this->home_score === null || $this->away_score === null) {
            return null;
        }
        if ($this->home_score > $this->away_score) return 'home_win';
        if ($this->home_score < $this->away_score) return 'away_win';
        return 'draw';
    }
}
