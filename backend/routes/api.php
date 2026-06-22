<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\LeaderboardController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\PredictionController;
use App\Http\Controllers\Api\TeamController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

Route::get('/teams',       [TeamController::class, 'index']);
Route::get('/teams/{team}', [TeamController::class, 'show']);

Route::get('/matches',        [MatchController::class, 'index']);
Route::get('/matches/{match}', [MatchController::class, 'show']);

Route::get('/leaderboard', [LeaderboardController::class, 'index']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout',  [AuthController::class, 'logout']);
    Route::get('/me',       [AuthController::class, 'me']);
    Route::patch('/me',     [AuthController::class, 'updateProfile']);

    // Match predictions
    Route::post('/predictions',                [PredictionController::class, 'store']);
    Route::get('/predictions/my',              [PredictionController::class, 'myPredictions']);
    Route::delete('/predictions/{prediction}', [PredictionController::class, 'destroy']);

    // Admin
    Route::post('/matches/{match}/result',     [MatchController::class, 'updateResult']);
});
