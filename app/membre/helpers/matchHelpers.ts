import type {
  Competition,
  CompetitionPlayer,
  Match,
  Player,
  ScoreStatus,
  Team,
} from "../types";

export function normalizeScore(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

export function getFinalHomeScore(match: Match): number | null {
  return normalizeScore(match.home_score ?? match.score_home);
}

export function getFinalAwayScore(match: Match): number | null {
  return normalizeScore(match.away_score ?? match.score_away);
}

export function hasFinalScore(match: Match): boolean {
  return getFinalHomeScore(match) !== null && getFinalAwayScore(match) !== null;
}

export function getScoreStatus(match: Match): ScoreStatus {
  return match.score_status ?? null;
}

export function getCompetitionName(
  competitions: Competition[],
  match: Match
): string {
  const competition = competitions.find(
    (item) => item.id === match.competition_id
  );

  return competition?.title || competition?.name || "Compétition";
}

export function getMatchDate(match: Match): string {
  if (!match.match_date) return "Date non définie";

  const date = new Date(match.match_date);
  if (Number.isNaN(date.getTime())) return "Date non définie";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function isTeamOnlyMatch(match: Match): boolean {
  const hasTeam = Boolean(match.home_team_id || match.away_team_id);
  const hasRegistration = Boolean(
    match.home_competition_player_id || match.away_competition_player_id
  );
  const hasPlayer = Boolean(
    match.home_player_id ||
      match.away_player_id ||
      match.player1_id ||
      match.player2_id
  );

  return hasTeam && !hasRegistration && !hasPlayer;
}

export function isMatchForPlayer(
  match: Match,
  player: Player | null,
  registrations: CompetitionPlayer[]
): boolean {
  if (!player?.id || isTeamOnlyMatch(match)) return false;

  const explicitPlayerIds = [
    match.home_player_id,
    match.away_player_id,
    match.player1_id,
    match.player2_id,
  ].filter((id): id is string => Boolean(id));

  if (explicitPlayerIds.length > 0) {
    return explicitPlayerIds.includes(player.id);
  }

  const playerRegistrationIds = new Set(
    registrations
      .filter((registration) => registration.player_id === player.id)
      .map((registration) => registration.id)
  );

  const explicitRegistrationIds = [
    match.home_competition_player_id,
    match.away_competition_player_id,
  ].filter((id): id is string => Boolean(id));

  return explicitRegistrationIds.some((id) =>
    playerRegistrationIds.has(id)
  );
}

export function getPlayerDisplayName(
  id: string | null | undefined,
  playerMap: Map<string, Player>
): string | null {
  if (!id) return null;

  const player = playerMap.get(id);
  return player?.ea_name || player?.name || null;
}

export function getRegistrationDisplayName(
  id: string | null | undefined,
  registrationMap: Map<string, CompetitionPlayer>,
  playerMap: Map<string, Player>
): string | null {
  if (!id) return null;

  const registration = registrationMap.get(id);
  if (!registration) return null;

  const player = playerMap.get(registration.player_id);

  return (
    player?.ea_name ||
    player?.name ||
    registration.ea_team_name ||
    null
  );
}

export function getSideName(
  match: Match,
  side: "home" | "away",
  teamMap: Map<string, Team>,
  playerMap: Map<string, Player>,
  registrationMap: Map<string, CompetitionPlayer>
): string {
  const isHome = side === "home";

  const teamId = isHome ? match.home_team_id : match.away_team_id;
  const playerId = isHome ? match.home_player_id : match.away_player_id;
  const alternatePlayerId = isHome ? match.player1_id : match.player2_id;
  const registrationId = isHome
    ? match.home_competition_player_id
    : match.away_competition_player_id;

  return (
    teamMap.get(teamId || "")?.name ||
    getPlayerDisplayName(playerId, playerMap) ||
    getPlayerDisplayName(alternatePlayerId, playerMap) ||
    getRegistrationDisplayName(registrationId, registrationMap, playerMap) ||
    (isHome ? "Domicile" : "Extérieur")
  );
}