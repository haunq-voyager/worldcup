<?php

use Illuminate\Support\Facades\Schedule;

// Sync World Cup data every 6 hours
Schedule::command('worldcup:sync')->everySixHours();
