import axios from 'axios';
import type {
  AuthResponse,
  LeaderboardEntry,
  PaginatedResponse,
  Prediction,
  PredictionValue,
  Team,
  TournamentPredictions,
  TournamentStage,
  User,
  WorldCupMatch,
} from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) =>
    api.post<AuthResponse>('/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/login', data).then((r) => r.data),
  logout: () => api.post('/logout').then((r) => r.data),
  me: () => api.get('/me').then((r) => r.data),
  updateProfile: (name: string) => api.patch<User>('/me', { name }).then((r) => r.data),
};

export const teamsApi = {
  list: (params?: { group?: string; search?: string }) =>
    api.get<Team[]>('/teams', { params }).then((r) => r.data),
  get: (id: number) => api.get<Team>(`/teams/${id}`).then((r) => r.data),
};

export const matchesApi = {
  list: (params?: { status?: string; round?: string; group?: string }) =>
    api.get<WorldCupMatch[]>('/matches', { params }).then((r) => r.data),
  get: (id: number) => api.get<WorldCupMatch>(`/matches/${id}`).then((r) => r.data),
  updateResult: (id: number, home_score: number, away_score: number) =>
    api.post<WorldCupMatch>(`/matches/${id}/result`, { home_score, away_score }).then((r) => r.data),
};

export const predictionsApi = {
  create: (match_id: number, prediction: PredictionValue) =>
    api.post<Prediction>('/predictions', { match_id, prediction }).then((r) => r.data),
  myPredictions: () => api.get<Prediction[]>('/predictions/my').then((r) => r.data),
  delete: (id: number) => api.delete(`/predictions/${id}`).then((r) => r.data),
};

export const leaderboardApi = {
  get: (page = 1, per_page = 20) =>
    api
      .get<{ data: PaginatedResponse<LeaderboardEntry>; current_user_rank: number | null }>(
        '/leaderboard',
        { params: { page, per_page } }
      )
      .then((r) => r.data),
};

export const tournamentApi = {
  my: () => api.get<TournamentPredictions>('/tournament-predictions/my').then((r) => r.data),
  save: (stage: TournamentStage, team_ids: number[]) =>
    api.post('/tournament-predictions', { stage, team_ids }).then((r) => r.data),
  settle: (stage: TournamentStage, team_ids: number[]) =>
    api.post('/tournament-predictions/settle', { stage, team_ids }).then((r) => r.data),
};

export default api;
