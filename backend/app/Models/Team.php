<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    protected $fillable = [
        'name',
        'country_code',
        'flag_url',
        'group_name',
        'confederation',
        'description',
    ];

    public function homeMatches(): HasMany
    {
        return $this->hasMany(WorldCupMatch::class, 'home_team_id');
    }

    public function awayMatches(): HasMany
    {
        return $this->hasMany(WorldCupMatch::class, 'away_team_id');
    }
}
