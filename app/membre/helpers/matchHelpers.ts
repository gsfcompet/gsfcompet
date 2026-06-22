import { Competition, Match, Player, CompetitionPlayer, Team, ScoreStatus } from "../types";

export function normalizeScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function getFinalHomeScore(match: Match) {
  return normalizeScore(match.home_score ?? match.score_home);
}

export function getFinalAwayScore(match: Match) {
  return normalizeScore(match.away_score ?? match.score_away);
}

export function hasFinalScore(match: Match) {
  return getFinalHomeScore(match) !== null && getFinalAwayScore(match) !== null;
}

export function getScoreStatus(match: Match): ScoreStatus {
  return match.score_status ?? null;
}

export function getCompetitionName(competitions: Competition[], match: Match) {
  const c = competitions.find((x) => x.id === match.competition_id);
  return c?.title || c?.name || "Compétition";
}

export function getMatchDate(match: Match) {
  const raw = match.match_date;
  if (!raw) return "Date non définie";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(raw));
}

export function isTeamOnlyMatch(match: Match) {
  const hasTeam = match.home_team_id || match.away_team_id;
  const hasReg = match.home_competition_player_id || match.away_competition_player_id;
  const hasPlayer = match.home_player_id || match.away_player_id || match.player1_id || match.player2_id;
  return Boolean(hasTeam && !hasReg && !hasPlayer);
}

export function isMatchForPlayer(match: Match, player: Player | null, regs: CompetitionPlayer[]) {
  if (!player?.id) return false;
  if (isTeamOnlyMatch(match)) return false;

  const explicit = [match.home_player_id, match.away_player_id, match.player1_id, match.player2_id].filter(Boolean);
  if (explicit.length > 0) return explicit.includes(player.id);

  const myRegs = regs.filter((r) => r.player_id === player.id).map((r) => r.id);
  const explicitRegs = [match.home_competition_player_id, match.away_competition_player_id].filter(Boolean);

  return explicitRegs.some((id) => myRegs.includes(String(id)));
}

export function getPlayerDisplayName(id: string | null | undefined, map: Map<string, Player>) {
  if (!id) return null;
  const p = map.get(id);
  return p?.ea_name || p?.name || null;
}

export function getRegistrationDisplayName(
  id: string | null | undefined,
  regMap: Map<string, CompetitionPlayer>,
  playerMap: Map<string, Player>
) {
  if (!id) return null;
  const reg = regMap.get(id);
  if (!reg) return null;
  const p = playerMap.get(reg.player_id);
  return p?.ea_name || p?.name || reg.ea_team_name || null;
}

export function getSideName(
  match: Match,
  side: "home" | "away",
  teamMap: Map<string, Team>,
  playerMap: Map<string, Player>,
  regMap: Map<string, CompetitionPlayer>
) {
  const teamId = side === "home" ? match.home_team_id : match.away_team_id;
  const playerId = side === "home" ? match.home_player_id : match.away_player_id;
  const altPlayerId = side === "home" ? match.player1_id : match.player2_id;
  const regId = side === "home" ? match.home_competition_player_id : match.away_competition_player_id;

  return (
    teamMap.get(teamId || "")?.name ||
    getPlayerDisplayName(playerId, playerMap) ||
    getPlayerDisplayName(altPlayerId, playerMap) ||
    getRegistrationDisplayName(regId, regMap, playerMap) ||
    (side === "home" ? "Domicile" : "Extérieur")
  );
}
