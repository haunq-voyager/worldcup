<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('predictions', function (Blueprint $table) {
            $table->unsignedTinyInteger('predicted_home_score')->nullable()->after('match_id');
            $table->unsignedTinyInteger('predicted_away_score')->nullable()->after('predicted_home_score');
            $table->unsignedSmallInteger('stake')->default(10)->after('predicted_away_score');
            $table->integer('settle_delta')->default(0)->after('points_earned');
        });

        // points_earned must allow negative values (losers lose their stake)
        // Drop the old 1x2 prediction column — replaced by score fields above.
        Schema::table('predictions', function (Blueprint $table) {
            $table->integer('points_earned')->default(0)->change();
            $table->dropColumn('prediction');
        });
    }

    public function down(): void
    {
        Schema::table('predictions', function (Blueprint $table) {
            $table->dropColumn(['predicted_home_score', 'predicted_away_score', 'stake', 'settle_delta']);
            $table->enum('prediction', ['home_win', 'draw', 'away_win'])->nullable()->after('match_id');
        });
    }
};
