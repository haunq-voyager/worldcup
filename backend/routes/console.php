<?php

use Illuminate\Support\Facades\Schedule;

// Sync World Cup match results every 15 minutes
Schedule::command('worldcup:sync')->everyFifteenMinutes()->withoutOverlapping();

// Sync betting odds every 6 hours (the-odds-api free tier ~500 credits/month, 3 per call)
Schedule::command('worldcup:sync-odds')->everySixHours()->withoutOverlapping();
