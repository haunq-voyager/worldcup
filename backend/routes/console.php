<?php

use Illuminate\Support\Facades\Schedule;

// Sync World Cup match results every 30 minutes
Schedule::command('worldcup:sync')->everyThirtyMinutes()->withoutOverlapping();
