"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ParticipantType = "teams" | "players";

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: ParticipantType;
};

type Player = {
  id: string;
  name: string;
  ea_name: string | null;
  platform: string | null;
};

type Team = {
  id: string;
  name: string;
  manager: string | null;
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
  ea_team_id: string | null;
  ea_team_name: string | null;
};

type CompetitionTeam = {
  id: string;
  competition_id: string;
  team_id: string;
};

type Match = {
  id: string;
  competition_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_competition_player_id: string | null;
  away_competition_player_id: string | null;
  match_date: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  mvp: string | null;
};

type StandingRow = {
  id: string;
  name: string;
  subLabel: string;
  mj: number;
  v: number;
  n: number;
  p: number;
  bp: number;
  bc: number;
  ga: number;
  pts: number;
};

function getCompetitionTypeLabel(type: string) {
  if (type === "league") return "Championnat";
  if (type === "cup") return "Coupe";
  if (type === "tournament") return "Tournoi";

  return type;
}

function getParticipantTypeLabel(type: ParticipantType) {
  if (type === "teams") return "Teams esport";
  return "Joueurs EA FC";
}

function getStatusLabel(status: string) {
  if (status === "draft") return "Brouillon";
  if (status === "planned") return "Planifiée";
  if (status === "active") return "Active";
  if (status === "completed") return "Terminée";
  if (status === "archived") return "Archivée";
  if (status === "scheduled") return "Programmée";

  return status;
}

function getStatusClass(status: string) {
  if (status === "active") {
    return "border-green-400/40 bg-green-500/15 text-green-300";
  }

  if (status === "planned" || status === "scheduled") {
    return "border-yellow-400/40 bg-yellow-500/15 text-yellow-300";
  }

  if (status === "draft") {
    return "border-orange-400/40 bg-orange-500/15 text-orange-300";
  }

  if (status === "completed") {
    return "border-blue-400/40 bg-blue-500/15 text-blue-300";
  }

  if (status === "archived") {
    return "border-slate-400/30 bg-slate-500/10 text-slate-300";
  }

  return "border-yellow-500/30 bg-black/30 text-yellow-200";
}

export default function CompetitionClassementPage() {
  const params = useParams<{ id: string }>();
  const competitionId = params.id;

  const supabase = createClient();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitionPlayers, setCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>(
    []
  );
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadData() {
    if (!competitionId) return;

    setLoading(true);
    setMessage("");

    const competitionResult = await supabase
      .from("competitions")
      .select("*")
      .eq("id", competitionId)
      .maybeSingle();

    if (competitionResult.error || !competitionResult.data) {
      setMessage(
        `Compétition introuvable. ID reçu : ${competitionId}. Erreur Supabase : ${
          competitionResult.error?.message || "aucune donnée retournée"
        }`
      );
      setLoading(false);
      return;
    }

    const loadedCompetition = competitionResult.data as Competition;

    const matchesResult = await supabase
      .from("matches")
      .select("*")
      .eq("competition_id", competitionId)
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (matchesResult.error) {
      setMessage(`Erreur matchs : ${matchesResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedMatches = (matchesResult.data ?? []) as Match[];

    const competitionPlayersResult = await supabase
      .from("competition_players")
      .select("*")
      .eq("competition_id", competitionId);

    if (competitionPlayersResult.error) {
      setMessage(
        `Erreur inscriptions joueurs : ${competitionPlayersResult.error.message}`
      );
      setLoading(false);
      return;
    }

    const loadedCompetitionPlayers =
      (competitionPlayersResult.data ?? []) as CompetitionPlayer[];

    const competitionTeamsResult = await supabase
      .from("competition_teams")
      .select("*")
      .eq("competition_id", competitionId);

    if (competitionTeamsResult.error) {
      setMessage(
        `Erreur inscriptions teams : ${competitionTeamsResult.error.message}`
      );
      setLoading(false);
      return;
    }

    const loadedCompetitionTeams =
      (competitionTeamsResult.data ?? []) as CompetitionTeam[];

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
        setMessage(`Erreur joueurs : ${playersResult.error.message}`);
        setLoading(false);
        return;
      }

      loadedPlayers = (playersResult.data ?? []) as Player[];
    }

    const teamIdsFromRegistrations = loadedCompetitionTeams.map(
      (registration) => registration.team_id
    );

    const teamIdsFromMatches = loadedMatches.flatMap((match) => [
      match.home_team_id,
      match.away_team_id,
    ]);

    const teamIds = Array.from(
      new Set(
        [...teamIdsFromRegistrations, ...teamIdsFromMatches].filter(
          Boolean
        ) as string[]
      )
    );

    let loadedTeams: Team[] = [];

    if (teamIds.length > 0) {
      const teamsResult = await supabase
        .from("teams")
        .select("id, name, manager")
        .in("id", teamIds);

      if (teamsResult.error) {
        setMessage(`Erreur teams : ${teamsResult.error.message}`);
        setLoading(false);
        return;
      }

      loadedTeams = (teamsResult.data ?? []) as Team[];
    }

    setCompetition(loadedCompetition);
    setMatches(loadedMatches);
    setCompetitionPlayers(loadedCompetitionPlayers);
    setCompetitionTeams(loadedCompetitionTeams);
    setPlayers(loadedPlayers);
    setTeams(loadedTeams);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  function getPlayer(playerId: string | null) {
    if (!playerId) return null;

    return players.find((player) => player.id === playerId) ?? null;
  }

  function getTeam(teamId: string | null) {
    if (!teamId) return null;

    return teams.find((team) => team.id === teamId) ?? null;
  }

  function createEmptyRow(id: string, name: string, subLabel: string): StandingRow {
    return {
      id,
      name,
      subLabel,
      mj: 0,
      v: 0,
      n: 0,
      p: 0,
      bp: 0,
      bc: 0,
      ga: 0,
      pts: 0,
    };
  }

  const classement = useMemo(() => {
    const rows = new Map<string, StandingRow>();

    if (!competition) return [];

    if (competition.participant_type === "players") {
      for (const registration of competitionPlayers) {
        const player = getPlayer(registration.player_id);

        rows.set(
          registration.id,
          createEmptyRow(
            registration.id,
            player?.name || player?.ea_name || "Joueur inconnu",
            registration.ea_team_name || "Équipe EA FC inconnue"
          )
        );
      }

      for (const match of matches) {
        if (match.status !== "completed") continue;
        if (match.home_score === null || match.away_score === null) continue;

        if (
          !match.home_competition_player_id ||
          !match.away_competition_player_id
        ) {
          continue;
        }

        const homeRow = rows.get(match.home_competition_player_id);
        const awayRow = rows.get(match.away_competition_player_id);

        if (!homeRow || !awayRow) continue;

        applyResult(homeRow, match.home_score, match.away_score);
        applyResult(awayRow, match.away_score, match.home_score);
      }
    } else {
      const registeredTeamIds = competitionTeams.map(
        (registration) => registration.team_id
      );

      const matchTeamIds = matches.flatMap((match) => [
        match.home_team_id,
        match.away_team_id,
      ]);

      const teamIds = Array.from(
        new Set([...registeredTeamIds, ...matchTeamIds].filter(Boolean) as string[])
      );

      for (const teamId of teamIds) {
        const team = getTeam(teamId);

        rows.set(
          teamId,
          createEmptyRow(
            teamId,
            team?.name || "Team inconnue",
            team?.manager ? `Manager : ${team.manager}` : "Team esport"
          )
        );
      }

      for (const match of matches) {
        if (match.status !== "completed") continue;
        if (match.home_score === null || match.away_score === null) continue;
        if (!match.home_team_id || !match.away_team_id) continue;

        const homeRow = rows.get(match.home_team_id);
        const awayRow = rows.get(match.away_team_id);

        if (!homeRow || !awayRow) continue;

        applyResult(homeRow, match.home_score, match.away_score);
        applyResult(awayRow, match.away_score, match.home_score);
      }
    }

    return Array.from(rows.values()).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.ga !== a.ga) return b.ga - a.ga;
      if (b.bp !== a.bp) return b.bp - a.bp;
      if (a.bc !== b.bc) return a.bc - b.bc;

      return a.name.localeCompare(b.name);
    });
  }, [competition, competitionPlayers, competitionTeams, players, teams, matches]);

  const completedMatchesCount = useMemo(() => {
    return matches.filter(
      (match) =>
        match.status === "completed" &&
        match.home_score !== null &&
        match.away_score !== null
    ).length;
  }, [matches]);

  const totalGoals = useMemo(() => {
    return matches
      .filter(
        (match) =>
          match.status === "completed" &&
          match.home_score !== null &&
          match.away_score !== null
      )
      .reduce((total, match) => {
        return total + Number(match.home_score ?? 0) + Number(match.away_score ?? 0);
      }, 0);
  }, [matches]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="text-[#D8C7A0]">Chargement du classement...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!competition) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <h1 className="text-3xl font-black">Compétition introuvable</h1>

            {message && <p className="mt-3 text-[#D8C7A0]">{message}</p>}

            <Link
              href="/competitions"
              className="mt-6 inline-flex rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
            >
              Retour aux compétitions
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const competitionLabel = competition.season
    ? `${competition.name} · ${competition.season}`
    : competition.name;

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <section className="rounded-[28px] border border-[#D9A441]/25 bg-gradient-to-br from-[#21070b] via-[#12040d] to-black p-6 shadow-2xl shadow-black/50">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-5 flex flex-wrap gap-3">
                <Link
                  href="/competitions"
                  className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
                >
                  ← Retour aux compétitions
                </Link>

                <Link
                  href={`/competitions/${competition.id}/matchs`}
                  className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
                >
                  Matchs
                </Link>

                <Link
                  href={`/competitions/${competition.id}/inscription`}
                  className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
                >
                  Inscription
                </Link>
              </div>

              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#F2D27A]">
                Classement de la compétition
              </p>

              <h1 className="mt-3 text-4xl font-black text-[#F7E9C5] md:text-5xl">
                {competitionLabel}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#D8C7A0]">
                Classement calculé uniquement avec les matchs terminés.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <SummaryTile label="Participants" value={classement.length} />
              <SummaryTile label="Matchs joués" value={completedMatchesCount} />
              <SummaryTile
                label="Format"
                value={
                  competition.participant_type === "players"
                    ? "Joueurs"
                    : "Teams"
                }
              />
              <SummaryTile label="Buts" value={totalGoals} />
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-[#160A12] px-4 py-3 text-sm font-black text-red-300">
            {message}
          </div>
        )}

        <section className="mt-8 rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#F7E9C5]">
                Classement
              </h2>

              <p className="mt-2 text-sm text-[#D8C7A0]">
                Tri : points, goal average, buts pour, buts contre.
              </p>
            </div>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${getStatusClass(
                competition.status
              )}`}
            >
              {getStatusLabel(competition.status)}
            </span>
          </div>

          {classement.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#D9A441]/20 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
              Aucun participant dans le classement pour le moment.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#D9A441]/20 bg-black/20">
              <div className="max-h-[680px] overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[7%]" />
                    <col className="w-[31%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[10%]" />
                  </colgroup>

                  <thead className="sticky top-0 z-10 bg-[#26070b] text-[10px] uppercase tracking-[0.18em] text-[#F2D27A]">
                    <tr>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        #
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Participant
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center">
                        MJ
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center text-green-300">
                        V
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center text-orange-300">
                        N
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center text-red-300">
                        P
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center text-green-300">
                        BP
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center text-red-300">
                        BC
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center">
                        GA
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center">
                        PTS
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {classement.map((row, index) => (
                      <tr
                        key={row.id}
                        className="border-b border-[#D9A441]/10 transition hover:bg-[#D9A441]/5"
                      >
                        <td className="px-4 py-4">
                          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[#D9A441]/35 bg-black/40 px-2 text-sm font-black text-[#F2D27A]">
                            {index + 1}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="truncate font-black text-[#F7E9C5]">
                            {row.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-[#8F7B5C]">
                            {row.subLabel}
                          </p>
                        </td>

                        <TableStat value={row.mj} />
                        <TableStat value={row.v} tone="green" />
                        <TableStat value={row.n} tone="orange" />
                        <TableStat value={row.p} tone="red" />
                        <TableStat value={row.bp} tone="green" />
                        <TableStat value={row.bc} tone="red" />
                        <TableStat value={row.ga > 0 ? `+${row.ga}` : row.ga} />
                        <TableStat value={row.pts} strong />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function applyResult(row: StandingRow, goalsFor: number, goalsAgainst: number) {
  row.mj += 1;
  row.bp += goalsFor;
  row.bc += goalsAgainst;
  row.ga += goalsFor - goalsAgainst;

  if (goalsFor > goalsAgainst) {
    row.v += 1;
    row.pts += 3;
  } else if (goalsFor === goalsAgainst) {
    row.n += 1;
    row.pts += 1;
  } else {
    row.p += 1;
  }
}

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/25 bg-black/30 px-5 py-4">
      <p className="text-2xl font-black text-[#F2D27A]">{value}</p>
      <p className="text-xs uppercase tracking-widest text-[#8F7B5C]">
        {label}
      </p>
    </div>
  );
}

function TableStat({
  value,
  tone = "gold",
  strong = false,
}: {
  value: string | number;
  tone?: "gold" | "green" | "orange" | "red";
  strong?: boolean;
}) {
  const colorClass =
    tone === "green"
      ? "text-green-300"
      : tone === "orange"
        ? "text-orange-300"
        : tone === "red"
          ? "text-red-300"
          : "text-[#F2D27A]";

  return (
    <td
      className={`px-4 py-4 text-center ${
        strong ? "text-lg font-black" : "font-semibold"
      } ${colorClass}`}
    >
      {value}
    </td>
  );
}
