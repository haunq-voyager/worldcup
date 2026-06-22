<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('special_predictions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['champion', 'best_player']);
            $table->string('value');         // country_code for champion, player name for best_player
            $table->integer('stake')->default(50);
            $table->boolean('is_correct')->nullable();
            $table->integer('points_earned')->default(0);
            $table->integer('settle_delta')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'type']); // one per type per user
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('special_predictions');
    }
};
