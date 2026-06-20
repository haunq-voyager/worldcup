<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('total_points')->default(0)->after('email');
            $table->unsignedInteger('correct_predictions')->default(0)->after('total_points');
            $table->unsignedInteger('total_predictions')->default(0)->after('correct_predictions');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['total_points', 'correct_predictions', 'total_predictions']);
        });
    }
};
