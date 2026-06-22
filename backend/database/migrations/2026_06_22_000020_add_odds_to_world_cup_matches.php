<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('world_cup_matches', function (Blueprint $table) {
            $table->json('odds')->nullable()->after('away_score');
            $table->timestamp('odds_updated_at')->nullable()->after('odds');
        });
    }

    public function down(): void
    {
        Schema::table('world_cup_matches', function (Blueprint $table) {
            $table->dropColumn(['odds', 'odds_updated_at']);
        });
    }
};
