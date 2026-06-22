export type ScoreStatus = "pending" | "validated" | "refused" | null;

export type Profile = {
  id?: string;
  user_id?: string;
  username?: string | null;
  pseudo?: string | null;
  role?: string | null;
  numero_maillot?: number | null;
  plateforme?: string | null;
  pays?: string | null;
  equipe_ea?: string | null;
  ea_team?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
};

export type Player = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  ea_name?: string | null;
  platform?: string | null;
};

export type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
  ea_team_id?: string | null;
  ea_team_name?: string | null;
};

export type EaTeam = {
  id: string;
  country?: string | null;
  name?: string | null;
};

export type Team = {
  id: string;
  name?: string | null;
};

export type Competition = {
  id: string;
  title?: string | null;
  name?: string | null;
  season?: string | null;
  status?: string | null;
  participant_type?: "teams" | "players" | null;
};

export type Match = {
  id: string;
  competition_id?: string | null;
  home_team_id?: string | null;
  away_team_id?: string | null;
  home_player_id?: string | null;
  away_player_id?: string | null;
  player1_id?: string | null;
  player2_id?: string | null;
  home_competition_player_id?: string | null;
  away_competition_player_id?: string | null;
  match_date?: string | null;
  created_at?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  score_home?: number | null;
  score_away?: number | null;
  submitted_home_score?: number | null;
  submitted_away_score?: number | null;
  score_status?: ScoreStatus;
  score_admin_note?: string | null;
  admin_note?: string | null;
  refusal_reason?: string | null;
};
