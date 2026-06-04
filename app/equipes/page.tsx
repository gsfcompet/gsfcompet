"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ParticipantKind = "player" | "team";
type ParticipantFilter = "all" | "players" | "teams";

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: "teams" | "players";
  created_at?: string | null;
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
  ea_team_id: string | null;
  ea_team_name: string | null;
  created_at?: string | null;
};

type CompetitionTeam = {
  id: string;
  competition_id: string;
  team_id: string;
  created_at?: string | null;
};

type Player = {
  id: string;
  user_id: string | null;
  name: string | null;
  ea_name: string | null;
  platform: string | null;
};

type Profile = {
  id: string;
  username: string | null;
  pays: string | null;
  numero_maillot: number | null;
};

type Team = {
  id: string;
  name: string;
  manager: string | null;
  created_at?: string | null;
};

type Match = {
  id: string;
  competition_id: string;

  home_competition_player_id: string | null;
  away_competition_player_id: string | null;

  home_team_id: string | null;
  away_team_id: string | null;

  status: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string | null;
};

type ParticipantStats = {
  mj: number;
  v: number;
  n: number;
  p: number;
  bp: number;
  bc: number;
  ga: number;
  pts: number;
};

type ParticipantRow = {
  id: string;
  kind: ParticipantKind;
  competition_id: string;
  competition: Competition | null;
  stats: ParticipantStats;

  registration?: CompetitionPlayer;
  player?: Player | null;
  profile?: Profile | null;

  competitionTeam?: CompetitionTeam | null;
  team?: Team | null;
};

const emptyStats: ParticipantStats = {
  mj: 0,
  v: 0,
  n: 0,
  p: 0,
  bp: 0,
  bc: 0,
  ga: 0,
  pts: 0,
};

function getCompetitionLabel(competition: Competition | null) {
  if (!competition) return "Compétition inconnue";

  return competition.season
    ? `${competition.name} · ${competition.season}`
    : competition.name;
}

function getCompetitionTypeLabel(competition: Competition | null) {
  if (!competition) return "Type inconnu";

  if (competition.participant_type === "teams") return "Teams esport";
  return "Joueurs";
}

function getStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "planned") return "Planifiée";
  if (status === "scheduled") return "Programmée";
  if (status === "completed") return "Terminée";
  if (status === "archived") return "Archivée";

  return status;
}

function getStatusClass(status: string) {
  if (status === "active") {
    return "border-green-400/40 bg-green-500/15 text-green-300";
  }

  if (status === "planned" || status === "scheduled") {
    return "border-yellow-400/40 bg-yellow-500/15 text-yellow-300";
  }

  if (status === "completed") {
    return "border-blue-400/40 bg-blue-500/15 text-blue-300";
  }

  return "border-slate-400/30 bg-slate-500/10 text-slate-300";
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(value: string | null) {
  if (!value) return "À planifier";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date invalide";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function createStats() {
  return { ...emptyStats };
}

export default function EquipesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionPlayers, setCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>(
    []
  );
  const [players, setPlayers] = useState<Player[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [selectedCompetitionId, setSelectedCompetitionId] = useState("all");
  const [participantFilter, setParticipantFilter] =
    useState<ParticipantFilter>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const competitionsResult = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (competitionsResult.error) {
      setErrorMessage(
        `Erreur compétitions : ${competitionsResult.error.message}`
      );
      setLoading(false);
      return;
    }

    const competitionPlayersResult = await supabase
      .from("competition_players")
      .select("*")
      .order("created_at", { ascending: true });

    if (competitionPlayersResult.error) {
      setErrorMessage(
        `Erreur participants joueurs : ${competitionPlayersResult.error.message}`
      );
      setLoading(false);
      return;
    }

    const competitionTeamsResult = await supabase
      .from("competition_teams")
      .select("*")
      .order("created_at", { ascending: true });

    if (competitionTeamsResult.error) {
      setErrorMessage(
        `Erreur teams esport : ${competitionTeamsResult.error.message}`
      );
      setLoading(false);
      return;
    }

    const teamsResult = await supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: true });

    if (teamsResult.error) {
      setErrorMessage(`Erreur équipes : ${teamsResult.error.message}`);
      setLoading(false);
      return;
    }

    const matchesResult = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (matchesResult.error) {
      setErrorMessage(`Erreur matchs : ${matchesResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedCompetitionPlayers =
      (competitionPlayersResult.data ?? []) as CompetitionPlayer[];

    const playerIds = Array.from(
      new Set(
        loadedCompetitionPlayers
          .map((registration) => registration.player_id)
          .filter(Boolean)
      )
    );

    let loadedPlayers: Player[] = [];

    if (playerIds.length > 0) {
      const playersResult = await supabase
        .from("players")
        .select("*")
        .in("id", playerIds);

      if (playersResult.error) {
        setErrorMessage(`Erreur joueurs : ${playersResult.error.message}`);
        setLoading(false);
        return;
      }

      loadedPlayers = (playersResult.data ?? []) as Player[];
    }

    const profileIds = Array.from(
      new Set(
        loadedPlayers
          .map((player) => player.user_id)
          .filter(Boolean) as string[]
      )
    );

    let loadedProfiles: Profile[] = [];

    if (profileIds.length > 0) {
      const profilesResult = await supabase
        .from("profiles")
        .select("id, username, pays, numero_maillot")
        .in("id", profileIds);

      if (!profilesResult.error) {
        loadedProfiles = (profilesResult.data ?? []) as Profile[];
      }
    }

    setCompetitions((competitionsResult.data ?? []) as Competition[]);
    setCompetitionPlayers(loadedCompetitionPlayers);
    setCompetitionTeams((competitionTeamsResult.data ?? []) as CompetitionTeam[]);
    setTeams((teamsResult.data ?? []) as Team[]);
    setPlayers(loadedPlayers);
    setProfiles(loadedProfiles);
    setMatches((matchesResult.data ?? []) as Match[]);
    setLoading(false);
  }

  const competitionById = useMemo(() => {
    return new Map(competitions.map((competition) => [competition.id, competition]));
  }, [competitions]);

  const playerById = useMemo(() => {
    return new Map(players.map((player) => [player.id, player]));
  }, [players]);

  const profileById = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.id, profile]));
  }, [profiles]);

  const teamById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  function getPlayerStats(registrationId: string, competitionId: string) {
    const stats = createStats();

    matches
      .filter((match) => {
        const isParticipant =
          match.home_competition_player_id === registrationId ||
          match.away_competition_player_id === registrationId;

        return (
          match.competition_id === competitionId &&
          isParticipant &&
          match.status === "completed" &&
          match.home_score !== null &&
          match.away_score !== null
        );
      })
      .forEach((match) => {
        const isHome = match.home_competition_player_id === registrationId;

        const goalsFor = isHome ? match.home_score ?? 0 : match.away_score ?? 0;
        const goalsAgainst = isHome
          ? match.away_score ?? 0
          : match.home_score ?? 0;

        stats.mj += 1;
        stats.bp += goalsFor;
        stats.bc += goalsAgainst;

        if (goalsFor > goalsAgainst) {
          stats.v += 1;
          stats.pts += 3;
        } else if (goalsFor === goalsAgainst) {
          stats.n += 1;
          stats.pts += 1;
        } else {
          stats.p += 1;
        }
      });

    stats.ga = stats.bp - stats.bc;

    return stats;
  }

  function getTeamStats(teamId: string, competitionId: string) {
    const stats = createStats();

    matches
      .filter((match) => {
        const isParticipant =
          match.home_team_id === teamId || match.away_team_id === teamId;

        return (
          match.competition_id === competitionId &&
          isParticipant &&
          match.status === "completed" &&
          match.home_score !== null &&
          match.away_score !== null
        );
      })
      .forEach((match) => {
        const isHome = match.home_team_id === teamId;

        const goalsFor = isHome ? match.home_score ?? 0 : match.away_score ?? 0;
        const goalsAgainst = isHome
          ? match.away_score ?? 0
          : match.home_score ?? 0;

        stats.mj += 1;
        stats.bp += goalsFor;
        stats.bc += goalsAgainst;

        if (goalsFor > goalsAgainst) {
          stats.v += 1;
          stats.pts += 3;
        } else if (goalsFor === goalsAgainst) {
          stats.n += 1;
          stats.pts += 1;
        } else {
          stats.p += 1;
        }
      });

    stats.ga = stats.bp - stats.bc;

    return stats;
  }

  const teamCompetitionRows = useMemo(() => {
    const rows = new Map<string, CompetitionTeam>();

    competitionTeams.forEach((competitionTeam) => {
      rows.set(
        `${competitionTeam.competition_id}:${competitionTeam.team_id}`,
        competitionTeam
      );
    });

    matches.forEach((match) => {
      [match.home_team_id, match.away_team_id].forEach((teamId) => {
        if (!teamId) return;

        const key = `${match.competition_id}:${teamId}`;

        if (!rows.has(key)) {
          rows.set(key, {
            id: key,
            competition_id: match.competition_id,
            team_id: teamId,
          });
        }
      });
    });

    return Array.from(rows.values());
  }, [competitionTeams, matches]);

  const participantRows = useMemo<ParticipantRow[]>(() => {
    const playerRows: ParticipantRow[] = competitionPlayers
      .filter((registration) => {
        return (
          selectedCompetitionId === "all" ||
          registration.competition_id === selectedCompetitionId
        );
      })
      .map((registration) => {
        const competition = competitionById.get(registration.competition_id) ?? null;
        const player = playerById.get(registration.player_id) ?? null;
        const profile = player?.user_id
          ? profileById.get(player.user_id) ?? null
          : null;

        return {
          id: `player:${registration.id}`,
          kind: "player",
          competition_id: registration.competition_id,
          competition,
          registration,
          player,
          profile,
          stats: getPlayerStats(registration.id, registration.competition_id),
        };
      });

    const linkedTeamRows: ParticipantRow[] = teamCompetitionRows
      .filter((competitionTeam) => {
        return (
          selectedCompetitionId === "all" ||
          competitionTeam.competition_id === selectedCompetitionId
        );
      })
      .map((competitionTeam) => {
        const competition = competitionById.get(competitionTeam.competition_id) ?? null;
        const team = teamById.get(competitionTeam.team_id) ?? null;

        return {
          id: `team:${competitionTeam.competition_id}:${competitionTeam.team_id}`,
          kind: "team",
          competition_id: competitionTeam.competition_id,
          competition,
          competitionTeam,
          team,
          stats: getTeamStats(competitionTeam.team_id, competitionTeam.competition_id),
        };
      });

    const linkedTeamIds = new Set(
      linkedTeamRows
        .map((row) => row.team?.id)
        .filter(Boolean) as string[]
    );

    const standaloneTeamRows: ParticipantRow[] =
      selectedCompetitionId === "all"
        ? teams
            .filter((team) => !linkedTeamIds.has(team.id))
            .map((team) => ({
              id: `team:standalone:${team.id}`,
              kind: "team",
              competition_id: "standalone",
              competition: null,
              competitionTeam: null,
              team,
              stats: createStats(),
            }))
        : [];

    const teamRows = [...linkedTeamRows, ...standaloneTeamRows];

    let rows = [...playerRows, ...teamRows];

    if (participantFilter === "players") {
      rows = rows.filter((row) => row.kind === "player");
    }

    if (participantFilter === "teams") {
      rows = rows.filter((row) => row.kind === "team");
    }

    const query = search.trim().toLowerCase();

    if (query) {
      rows = rows.filter((row) => {
        const values =
          row.kind === "player"
            ? [
                row.competition?.name,
                row.competition?.season,
                row.player?.name,
                row.player?.ea_name,
                row.player?.platform,
                row.profile?.username,
                row.profile?.pays,
                row.registration?.ea_team_name,
              ]
            : [
                row.competition?.name,
                row.competition?.season,
                row.team?.name,
                row.team?.manager,
              ];

        return values.filter(Boolean).join(" ").toLowerCase().includes(query);
      });
    }

    rows.sort((a, b) => {
      const competitionCompare = getCompetitionLabel(a.competition).localeCompare(
        getCompetitionLabel(b.competition)
      );

      if (competitionCompare !== 0) return competitionCompare;

      if (a.kind !== b.kind) return a.kind === "team" ? -1 : 1;
      if (b.stats.pts !== a.stats.pts) return b.stats.pts - a.stats.pts;
      if (b.stats.ga !== a.stats.ga) return b.stats.ga - a.stats.ga;
      if (b.stats.bp !== a.stats.bp) return b.stats.bp - a.stats.bp;

      return getParticipantName(a).localeCompare(getParticipantName(b));
    });

    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    competitionPlayers,
    teamCompetitionRows,
    selectedCompetitionId,
    participantFilter,
    search,
    competitionById,
    playerById,
    profileById,
    teamById,
    matches,
  ]);

  const visibleCompetitionIds = useMemo(() => {
    return Array.from(new Set(participantRows.map((row) => row.competition_id)));
  }, [participantRows]);

  const visibleMatches = useMemo(() => {
    if (selectedCompetitionId === "all") {
      return matches.filter((match) =>
        visibleCompetitionIds.includes(match.competition_id)
      );
    }

    return matches.filter((match) => match.competition_id === selectedCompetitionId);
  }, [matches, selectedCompetitionId, visibleCompetitionIds]);

  const playerRowsCount = participantRows.filter(
    (row) => row.kind === "player"
  ).length;

  const teamRowsCount = participantRows.filter((row) => row.kind === "team").length;

  const completedMatchesCount = visibleMatches.filter(
    (match) => match.status === "completed"
  ).length;

  const scheduledMatchesCount = visibleMatches.filter(
    (match) => match.status === "scheduled"
  ).length;

  const selectedCompetition =
    selectedCompetitionId === "all"
      ? null
      : competitionById.get(selectedCompetitionId) ?? null;

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <section className="rounded-[28px] border border-yellow-700/30 bg-gradient-to-br from-[#21070b] via-[#12040d] to-black p-6 shadow-2xl shadow-black/50">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-yellow-400">
                Guardian&apos;s Family
              </p>

              <h1 className="mt-3 text-4xl font-black text-yellow-100 md:text-5xl">
                Équipes & participants
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-yellow-100/70">
                Vue hybride prête pour les compétitions individuelles et les
                futures compétitions entre teams esport.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/competitions"
                className="rounded-xl border border-yellow-500/40 px-5 py-3 text-sm font-black text-yellow-200 transition hover:bg-yellow-500/10"
              >
                Compétitions
              </Link>

              {selectedCompetition && (
                <>
                  <Link
                    href={`/competitions/${selectedCompetition.id}/matchs`}
                    className="rounded-xl border border-yellow-500/40 px-5 py-3 text-sm font-black text-yellow-200 transition hover:bg-yellow-500/10"
                  >
                    Matchs
                  </Link>

                  <Link
                    href={`/competitions/${selectedCompetition.id}/classement`}
                    className="rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-red-600"
                  >
                    Classement
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {loading && (
          <div className="mt-8 rounded-2xl border border-yellow-700/30 bg-[#140711]/95 p-6 text-yellow-100/60">
            Chargement des participants...
          </div>
        )}

        {!loading && errorMessage && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-red-300">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && (
          <>
            <section className="mt-8 rounded-[28px] border border-yellow-700/30 bg-[#140711]/95 p-6 shadow-2xl shadow-black/40">
              <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr_auto_auto] xl:items-end">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-yellow-200">
                    Filtrer par compétition
                  </span>

                  <select
                    value={selectedCompetitionId}
                    onChange={(event) =>
                      setSelectedCompetitionId(event.target.value)
                    }
                    className="w-full rounded-xl border border-yellow-700/30 bg-black px-4 py-3 text-yellow-100 outline-none transition focus:border-yellow-400"
                  >
                    <option value="all">Toutes les compétitions</option>

                    {competitions.map((competition) => (
                      <option key={competition.id} value={competition.id}>
                        {competition.name}
                        {competition.season ? ` · ${competition.season}` : ""}
                        {competition.participant_type === "teams"
                          ? " · Teams esport"
                          : " · Joueurs"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-yellow-200">
                    Rechercher
                  </span>

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full rounded-xl border border-yellow-700/30 bg-black px-4 py-3 text-yellow-100 outline-none transition focus:border-yellow-400"
                    placeholder="Joueur, team, équipe, pays..."
                  />
                </label>

                <div>
                  <span className="mb-2 block text-sm font-black text-yellow-200">
                    Type
                  </span>

                  <div className="flex rounded-xl border border-yellow-700/30 bg-black p-1">
                    <FilterButton
                      active={participantFilter === "all"}
                      onClick={() => setParticipantFilter("all")}
                    >
                      Tous
                    </FilterButton>

                    <FilterButton
                      active={participantFilter === "players"}
                      onClick={() => setParticipantFilter("players")}
                    >
                      Joueurs
                    </FilterButton>

                    <FilterButton
                      active={participantFilter === "teams"}
                      onClick={() => setParticipantFilter("teams")}
                    >
                      Teams
                    </FilterButton>
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-sm font-black text-yellow-200">
                    Vue
                  </span>

                  <div className="flex rounded-xl border border-yellow-700/30 bg-black p-1">
                    <FilterButton
                      active={viewMode === "cards"}
                      onClick={() => setViewMode("cards")}
                    >
                      Cartes
                    </FilterButton>

                    <FilterButton
                      active={viewMode === "table"}
                      onClick={() => setViewMode("table")}
                    >
                      Tableau
                    </FilterButton>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-5">
                <StatTile label="Participants" value={participantRows.length} />
                <StatTile label="Joueurs" value={playerRowsCount} />
                <StatTile label="Teams" value={teamRowsCount} />
                <StatTile label="Matchs" value={visibleMatches.length} />
                <StatTile label="Terminés" value={completedMatchesCount} />
              </div>

              {scheduledMatchesCount > 0 && (
                <div className="mt-4 rounded-2xl border border-yellow-700/25 bg-black/25 p-4 text-sm text-yellow-100/65">
                  {scheduledMatchesCount} match(s) programmé(s) dans la
                  sélection actuelle.
                </div>
              )}
            </section>

            {participantRows.length === 0 ? (
              <section className="mt-8 rounded-[28px] border border-yellow-700/30 bg-[#140711]/95 p-6 text-yellow-100/60 shadow-2xl shadow-black/40">
                Aucun participant trouvé pour cette sélection.
              </section>
            ) : viewMode === "cards" ? (
              <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {participantRows.map((row) =>
                  row.kind === "team" ? (
                    <TeamParticipantCard key={row.id} row={row} />
                  ) : (
                    <PlayerParticipantCard key={row.id} row={row} />
                  )
                )}
              </section>
            ) : (
              <ParticipantsTable rows={participantRows} />
            )}
          </>
        )}
      </section>
    </main>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-lg bg-yellow-400 px-4 py-2 text-sm font-black text-black"
          : "rounded-lg px-4 py-2 text-sm font-black text-yellow-200"
      }
    >
      {children}
    </button>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-yellow-700/25 bg-black/25 p-4">
      <p className="text-sm text-yellow-100/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-yellow-200">{value}</p>
    </div>
  );
}

function getParticipantName(row: ParticipantRow) {
  if (row.kind === "team") {
    return row.team?.name || "Team esport";
  }

  return (
    row.player?.name ||
    row.profile?.username ||
    row.player?.ea_name ||
    "Joueur"
  );
}

function PlayerParticipantCard({ row }: { row: ParticipantRow }) {
  const playerName = getParticipantName(row);
  const eaName = row.player?.ea_name || playerName;
  const country = row.profile?.pays || "France";
  const platform = row.player?.platform || "PC";
  const eaTeam = row.registration?.ea_team_name || "Sans équipe";
  const competitionLabel = getCompetitionLabel(row.competition);
  const initials = getInitials(playerName || eaTeam);

  return (
    <article className="rounded-[28px] border border-yellow-700/30 bg-[#140711]/95 p-5 shadow-2xl shadow-black/40 transition hover:border-yellow-500/45">
      <ParticipantHeader
        initials={initials || "J"}
        title={playerName}
        subtitle={`EA : ${eaName}`}
        badge="Joueur"
        badgeTone="player"
        platform={platform}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoBox label="Équipe EA FC" value={eaTeam} />
        <InfoBox label="Pays membre" value={country} />
      </div>

      <CompetitionBox
        competition={row.competition}
        competitionLabel={competitionLabel}
      />

      <StatsGrid stats={row.stats} />
    </article>
  );
}

function TeamParticipantCard({ row }: { row: ParticipantRow }) {
  const teamName = row.team?.name || "Team esport";
  const manager = row.team?.manager || "À définir";
  const competitionLabel = getCompetitionLabel(row.competition);
  const initials = getInitials(teamName);

  return (
    <article className="rounded-[28px] border border-red-500/35 bg-gradient-to-br from-[#1b0710] via-[#140711] to-black p-5 shadow-2xl shadow-black/40 transition hover:border-red-400/60">
      <ParticipantHeader
        initials={initials || "T"}
        title={teamName}
        subtitle={`Manager : ${manager}`}
        badge="Team esport"
        badgeTone="team"
        platform="Club"
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoBox label="Manager" value={manager} />
        <InfoBox label="Format" value="Compétition teams" />
      </div>

      <CompetitionBox
        competition={row.competition}
        competitionLabel={competitionLabel}
      />

      <StatsGrid stats={row.stats} />
    </article>
  );
}

function ParticipantHeader({
  initials,
  title,
  subtitle,
  badge,
  badgeTone,
  platform,
}: {
  initials: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeTone: "player" | "team";
  platform: string;
}) {
  const badgeClass =
    badgeTone === "team"
      ? "border-red-400/40 bg-red-500/15 text-red-300"
      : "border-yellow-400/40 bg-yellow-500/15 text-yellow-300";

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-yellow-500/35 bg-red-900/30 text-xl font-black text-yellow-200">
          {initials}
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-xl font-black text-yellow-100">
            {title}
          </h2>
          <p className="mt-1 truncate text-sm text-yellow-100/55">{subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${badgeClass}`}
        >
          {badge}
        </span>

        <span className="rounded-full border border-yellow-500/35 bg-black/35 px-3 py-1 text-xs font-black uppercase text-yellow-200">
          {platform}
        </span>
      </div>
    </div>
  );
}

function CompetitionBox({
  competition,
  competitionLabel,
}: {
  competition: Competition | null;
  competitionLabel: string;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-yellow-700/25 bg-black/25 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-400">
            Compétition
          </p>

          <p className="mt-1 text-sm font-black text-yellow-100">
            {competitionLabel}
          </p>

          <p className="mt-1 text-xs text-yellow-100/45">
            {getCompetitionTypeLabel(competition)}
          </p>
        </div>

        {competition && (
          <span
            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
              competition.status
            )}`}
          >
            {getStatusLabel(competition.status)}
          </span>
        )}
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-yellow-700/25 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-yellow-100/45">
        {label}
      </p>
      <p className="mt-2 truncate font-black text-yellow-100">{value}</p>
    </div>
  );
}

function StatsGrid({ stats }: { stats: ParticipantStats }) {
  return (
    <div className="mt-5 grid grid-cols-4 gap-2 text-center">
      <SmallStat label="MJ" value={stats.mj} />
      <SmallStat label="V" value={stats.v} tone="green" />
      <SmallStat label="N" value={stats.n} tone="yellow" />
      <SmallStat label="P" value={stats.p} tone="red" />
      <SmallStat label="BP" value={stats.bp} tone="green" />
      <SmallStat label="BC" value={stats.bc} tone="red" />
      <SmallStat label="GA" value={stats.ga} />
      <SmallStat label="PTS" value={stats.pts} />
    </div>
  );
}

function SmallStat({
  label,
  value,
  tone = "gold",
}: {
  label: string;
  value: number;
  tone?: "gold" | "green" | "red" | "yellow";
}) {
  const color =
    tone === "green"
      ? "text-green-300"
      : tone === "red"
      ? "text-red-300"
      : tone === "yellow"
      ? "text-orange-300"
      : "text-yellow-200";

  return (
    <div className="rounded-xl border border-yellow-700/25 bg-black/25 p-3">
      <p className={`text-lg font-black ${color}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-100/45">
        {label}
      </p>
    </div>
  );
}

function ParticipantsTable({ rows }: { rows: ParticipantRow[] }) {
  return (
    <section className="mt-8 rounded-[28px] border border-yellow-700/30 bg-[#140711]/95 p-6 shadow-2xl shadow-black/40">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-yellow-100">
            Vue tableur des participants
          </h2>

          <p className="mt-2 text-sm text-yellow-100/60">
            Affichage compact prêt pour les joueurs individuels et les teams esport.
          </p>
        </div>

        <span className="flex h-9 min-w-9 items-center justify-center rounded-full border border-yellow-500/40 bg-black/40 px-3 text-sm font-black text-yellow-200 shadow-inner shadow-yellow-950/30">
          {rows.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-yellow-700/25 bg-black/25">
        <div className="max-h-[660px] overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed border-collapse text-left text-[11px] xl:text-xs">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[20%]" />
              <col className="w-[4%]" />
              <col className="w-[4%]" />
              <col className="w-[4%]" />
              <col className="w-[4%]" />
              <col className="w-[5%]" />
              <col className="w-[5%]" />
              <col className="w-[5%]" />
              <col className="w-[5%]" />
            </colgroup>

            <thead className="sticky top-0 z-10 bg-[#26070b] text-[9px] uppercase tracking-[0.16em] text-yellow-200">
              <tr>
                <th className="border-b border-yellow-700/30 px-3 py-3">
                  Type
                </th>
                <th className="border-b border-yellow-700/30 px-3 py-3">
                  Participant
                </th>
                <th className="border-b border-yellow-700/30 px-3 py-3">
                  Détails
                </th>
                <th className="border-b border-yellow-700/30 px-3 py-3">
                  Compétition
                </th>
                <th className="border-b border-yellow-700/30 px-2 py-3 text-center">
                  MJ
                </th>
                <th className="border-b border-yellow-700/30 px-2 py-3 text-center">
                  V
                </th>
                <th className="border-b border-yellow-700/30 px-2 py-3 text-center">
                  N
                </th>
                <th className="border-b border-yellow-700/30 px-2 py-3 text-center">
                  P
                </th>
                <th className="border-b border-yellow-700/30 px-2 py-3 text-center">
                  BP
                </th>
                <th className="border-b border-yellow-700/30 px-2 py-3 text-center">
                  BC
                </th>
                <th className="border-b border-yellow-700/30 px-2 py-3 text-center">
                  GA
                </th>
                <th className="border-b border-yellow-700/30 px-2 py-3 text-center">
                  PTS
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const participantName = getParticipantName(row);
                const competitionLabel = row.competition
                  ? getCompetitionLabel(row.competition)
                  : "Aucune compétition";

                return (
                  <tr
                    key={row.id}
                    className="border-b border-yellow-900/25 transition hover:bg-yellow-400/5"
                  >
                    <td className="px-3 py-4">
                      <span
                        className={
                          row.kind === "team"
                            ? "inline-flex rounded-full border border-red-400/40 bg-red-500/15 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-300"
                            : "inline-flex rounded-full border border-yellow-400/40 bg-yellow-500/15 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-yellow-300"
                        }
                      >
                        {row.kind === "team" ? "Team" : "Joueur"}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      <p className="truncate font-black text-yellow-100">
                        {participantName}
                      </p>

                      <p className="mt-1 truncate text-xs text-yellow-100/45">
                        {row.kind === "team"
                          ? `Manager : ${row.team?.manager || "À définir"}`
                          : `EA : ${row.player?.ea_name || participantName}`}
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      {row.kind === "team" ? (
                        <>
                          <p className="truncate font-black text-yellow-100">
                            {row.team?.name || "Team esport"}
                          </p>
                          <p className="mt-1 truncate text-xs text-yellow-100/45">
                            Format club
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="truncate font-black text-yellow-100">
                            {row.registration?.ea_team_name || "Sans équipe"}
                          </p>
                          <p className="mt-1 truncate text-xs text-yellow-100/45">
                            {row.player?.platform || "PC"} ·{" "}
                            {row.profile?.pays || "France"}
                          </p>
                        </>
                      )}
                    </td>

                    <td className="px-3 py-4">
                      <p className="truncate font-black text-yellow-100">
                        {competitionLabel}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-yellow-100/45">
                          {getCompetitionTypeLabel(row.competition)}
                        </span>

                        {row.competition && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${getStatusClass(
                              row.competition.status
                            )}`}
                          >
                            {getStatusLabel(row.competition.status)}
                          </span>
                        )}
                      </div>
                    </td>

                    <StatCell value={row.stats.mj} />
                    <StatCell value={row.stats.v} tone="green" />
                    <StatCell value={row.stats.n} tone="yellow" />
                    <StatCell value={row.stats.p} tone="red" />
                    <StatCell value={row.stats.bp} tone="green" />
                    <StatCell value={row.stats.bc} tone="red" />
                    <StatCell value={row.stats.ga} />
                    <StatCell value={row.stats.pts} strong />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StatCell({
  value,
  tone = "gold",
  strong = false,
}: {
  value: number;
  tone?: "gold" | "green" | "red" | "yellow";
  strong?: boolean;
}) {
  const color =
    tone === "green"
      ? "text-green-300"
      : tone === "red"
      ? "text-red-300"
      : tone === "yellow"
      ? "text-orange-300"
      : "text-yellow-200";

  return (
    <td className="px-2 py-4 text-center">
      <span
        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-yellow-700/25 bg-black/35 px-2 font-black ${color} ${
          strong ? "shadow-inner shadow-yellow-950/40" : ""
        }`}
      >
        {value}
      </span>
    </td>
  );
}

