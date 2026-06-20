<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournament_predictions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            // stage: champion(1), runner_up(1), semi_final(4), quarter_final(8)
            $table->string('stage');
            $table->boolean('is_correct')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'team_id', 'stage']);
            $table->index(['user_id', 'stage']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_predictions');
    }
};
