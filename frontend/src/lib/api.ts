import axios from 'axios';
import type {
  AuthResponse,
  DataSyncResponse,
  LeaderboardEntry,
  MatchPredictionsResponse,
  PaginatedResponse,
  Prediction,
  SpecialPrediction,
  Team,
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
  googleLogin: (credential: string) =>
    api.post<AuthResponse>('/auth/google', { credential }).then((r) => r.data),
  logout: () => api.post('/logout').then((r) => r.data),
  me: () => api.get('/me').then((r) => r.data),
  updateProfile: (name: string) => api.patch<User>('/me', { name }).then((r) => r.data),
  updateAvatar: (avatar: File) => {
    const formData = new FormData();
    formData.append('avatar', avatar);

    return api
      .post<User>('/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },
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
  syncData: () =>
    api.post<DataSyncResponse>('/admin/sync-world-cup-data').then((r) => r.data),
};

export const predictionsApi = {
  create: (match_id: number, predicted_home_score: number, predicted_away_score: number) =>
    api
      .post<Prediction>('/predictions', { match_id, predicted_home_score, predicted_away_score })
      .then((r) => r.data),
  myPredictions: () => api.get<Prediction[]>('/predictions/my').then((r) => r.data),
  forMatch: (matchId: number, page = 1, perPage = 50) =>
    api
      .get<MatchPredictionsResponse>(`/matches/${matchId}/predictions`, {
        params: { page, per_page: perPage },
      })
      .then((r) => r.data),
  delete: (id: number) => api.delete(`/predictions/${id}`).then((r) => r.data),
};

export const specialPredictionsApi = {
  mine: () => api.get<SpecialPrediction[]>('/special-predictions').then((r) => r.data),
  all: (type: string) =>
    api.get<SpecialPrediction[]>('/special-predictions/all', { params: { type } }).then((r) => r.data),
  save: (type: string, value: string) =>
    api.post<SpecialPrediction>('/special-predictions', { type, value }).then((r) => r.data),
  delete: (id: number) => api.delete(`/special-predictions/${id}`),
  settle: (type: string, correct_value: string) =>
    api.post('/special-predictions/settle', { type, correct_value }).then((r) => r.data),
};

export const leaderboardApi = {
  get: (page = 1, per_page = 20, round?: string) =>
    api
      .get<{ data: PaginatedResponse<LeaderboardEntry>; current_user_rank: number | null }>(
        '/leaderboard',
        { params: { page, per_page, round: round || undefined } }
      )
      .then((r) => r.data),
};

export default api;
