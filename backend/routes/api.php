<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DataSyncController;
use App\Http\Controllers\Api\LeaderboardController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\PredictionController;
use App\Http\Controllers\Api\SpecialPredictionController;
use App\Http\Controllers\Api\TeamController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/auth/google', [AuthController::class, 'googleLogin'])
    ->middleware('throttle:10,1')
    ->name('auth.google');

Route::get('/teams',       [TeamController::class, 'index']);
Route::get('/teams/{team}', [TeamController::class, 'show']);

Route::get('/matches',        [MatchController::class, 'index']);
Route::get('/matches/{match}', [MatchController::class, 'show']);
Route::get('/matches/{match}/predictions', [PredictionController::class, 'forMatch']);

Route::get('/leaderboard', [LeaderboardController::class, 'index']);

// Special predictions — public list
Route::get('/special-predictions/all', [SpecialPredictionController::class, 'all']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout',  [AuthController::class, 'logout']);
    Route::get('/me',       [AuthController::class, 'me']);
    Route::patch('/me',     [AuthController::class, 'updateProfile']);
    Route::post('/me/avatar', [AuthController::class, 'updateAvatar'])
        ->middleware('throttle:10,1')
        ->name('profile.avatar.update');

    // Match predictions
    Route::post('/predictions',                [PredictionController::class, 'store']);
    Route::get('/predictions/my',              [PredictionController::class, 'myPredictions']);
    Route::delete('/predictions/{prediction}', [PredictionController::class, 'destroy']);

    // Special predictions (champion / best player)
    Route::get('/special-predictions',                              [SpecialPredictionController::class, 'index']);
    Route::post('/special-predictions',                             [SpecialPredictionController::class, 'store']);
    Route::delete('/special-predictions/{specialPrediction}',       [SpecialPredictionController::class, 'destroy']);
    Route::post('/special-predictions/settle',                      [SpecialPredictionController::class, 'settle']);

    // Admin
    Route::post('/admin/sync-world-cup-data', DataSyncController::class)
        ->middleware('throttle:1,1')
        ->name('admin.sync-world-cup-data');
});
