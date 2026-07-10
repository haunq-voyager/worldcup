export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
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

export interface MatchOdds {
  h2h?: { home: number | null; draw: number | null; away: number | null; book: string };
  spreads?: {
    home_point: number | null;
    home_price: number | null;
    away_point: number | null;
    away_price: number | null;
    book: string;
  };
  totals?: { point: number | null; over: number | null; under: number | null; book: string };
}

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
  odds?: MatchOdds | null;
  odds_updated_at?: string | null;
  user_prediction?: Prediction | null;
  trash_talks?: MatchTrashTalk[];
}

export interface MatchTrashTalk {
  id: number;
  message: string;
  created_at: string;
  match: {
    id: number;
    home_team: string;
    away_team: string;
  };
  user: Pick<User, 'id' | 'name' | 'avatar_url'>;
}

export interface Prediction {
  id: number;
  user_id: number;
  match_id: number;
  predicted_home_score: number;
  predicted_away_score: number;
  trash_talk: string | null;
  stake: number;
  is_correct: boolean | null;
  points_earned: number;
  created_at: string;
  match?: WorldCupMatch;
}

export interface MatchPredictionViewer {
  id: number;
  user: Pick<User, 'id' | 'name' | 'avatar_url'>;
  predicted_home_score: number;
  predicted_away_score: number;
  trash_talk: string | null;
  is_correct: boolean | null;
  points_earned: number;
  created_at: string;
}

export interface CorrectPredictionToday {
  id: number;
  user: Pick<User, 'id' | 'name' | 'avatar_url'>;
  match: {
    id: number;
    home_team: string;
    away_team: string;
    home_score: number | null;
    away_score: number | null;
  };
  predicted_home_score: number;
  predicted_away_score: number;
  points_earned: number;
}

export interface CorrectPredictionsTodayResponse {
  date: string;
  total: number;
  data: CorrectPredictionToday[];
}

export interface MatchPredictionsResponse {
  data: MatchPredictionViewer[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  summary: {
    total: number;
    correct: number;
    wrong: number;
    pending: number;
  };
}


export interface SpecialPrediction {
  id: number;
  user_id: number;
  type: 'champion' | 'best_player';
  value: string;
  stake: number;
  is_correct: boolean | null;
  points_earned: number;
  created_at: string;
  user?: Pick<User, 'id' | 'name' | 'email' | 'avatar_url'>;
}

export interface LeaderboardEntry extends User {
  rank: number;
  accuracy: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface DataSyncResponse {
  message: string;
  data: {
    odds: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
