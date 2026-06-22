<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('predictions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('match_id')->constrained('world_cup_matches')->onDelete('cascade');
            $table->enum('prediction', ['home_win', 'draw', 'away_win']);
            $table->boolean('is_correct')->nullable();
            $table->unsignedTinyInteger('points_earned')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'match_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('predictions');
    }
};
