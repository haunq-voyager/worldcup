<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('world_cup_matches', function (Blueprint $table) {
            $table->boolean('settled')->default(false)->after('result');
        });
    }

    public function down(): void
    {
        Schema::table('world_cup_matches', function (Blueprint $table) {
            $table->dropColumn('settled');
        });
    }
};
