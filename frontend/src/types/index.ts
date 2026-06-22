export interface User {
  id: number;
  name: string;
  email: string;
  is_admin?: boolean;
  total_points: number;
  correct_predictions: number;
  total_predictions: number;
  rank?: number;
  accuracy?: number;
}

export interface Team {
  id: number;
  name: string;
  country_code: string;
  flag_url: string | null;
  group_name: string | null;
  confederation: string | null;
  description: string | null;
}

export type MatchStatus = 'scheduled' | 'live' | 'finished';
export type MatchResult = 'home_win' | 'draw' | 'away_win';
export type PredictionValue = 'home_win' | 'draw' | 'away_win';

export interface WorldCupMatch {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_team: Team;
  away_team: Team;
  match_date: string;
  venue: string | null;
  round: string;
  group_name: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  result: MatchResult | null;
  user_prediction?: Prediction | null;
}

export interface Prediction {
  id: number;
  user_id: number;
  match_id: number;
  prediction: PredictionValue;
  is_correct: boolean | null;
  points_earned: number;
  created_at: string;
  match?: WorldCupMatch;
}

export interface LeaderboardEntry extends User {
  rank: number;
  accuracy: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Tournament predictions
export type TournamentStage = 'quarter_final' | 'semi_final' | 'runner_up' | 'champion';

export interface TournamentPick {
  id: number;
  team_id: number;
  team: Team;
  is_correct: boolean | null;
}

export interface StageInfo {
  limit: number;
  points: number;
  label: string;
  locked: boolean;
}

export interface TournamentPredictions {
  quarter_final: TournamentPick[];
  semi_final: TournamentPick[];
  runner_up: TournamentPick[];
  champion: TournamentPick[];
  stages_info: Record<TournamentStage, StageInfo>;
}
