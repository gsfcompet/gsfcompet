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
  participantType?: ParticipantType;
  participant_type?: ParticipantType;
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
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
  ea_team_id: string | null;
  ea_team_name: string;
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

export default function CompetitionClassementPage() {
  const params = useParams<{ id: string }>();
  const competitionId = params.id;

  const supabase = createClient();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitionPlayers, setCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
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
      .single();

    if (competitionResult.error || !competitionResult.data) {
      console.error("Competition debug:", {
        competitionId,
        error: competitionResult.error,
        data: competitionResult.data,
      });

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
      .order("created_at", { ascending: false });

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

    const teamIds = Array.from(
      new Set(
        loadedMatches
          .flatMap((match) => [match.home_team_id, match.away_team_id])
          .filter(Boolean) as string[]
      )
    );

    let loadedTeams: Team[] = [];

    if (teamIds.length > 0) {
      const teamsResult = await supabase
        .from("teams")
        .select("*")
        .in("id", teamIds);

      if (!teamsResult.error) {
        loadedTeams = (teamsResult.data ?? []) as Team[];
      }
    }

    setCompetition(loadedCompetition);
    setMatches(loadedMatches);
    setCompetitionPlayers(loadedCompetitionPlayers);
    setPlayers(loadedPlayers);
    setTeams(loadedTeams);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [competitionId]);

  function getParticipantType(currentCompetition: Competition): ParticipantType {
    return (
      currentCompetition.participantType ||
      currentCompetition.participant_type ||
      "players"
    );
  }

  function getPlayer(playerId: string | null) {
    if (!playerId) return null;

    return players.find((player) => player.id === playerId) ?? null;
  }

  function getTeam(teamId: string | null) {
    if (!teamId) return null;

    return teams.find((team) => team.id === teamId) ?? null;
  }

  function createEmptyRow(id: string, name: string, subLabel: string) {
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

    const participantType = getParticipantType(competition);

    if (participantType === "players") {
      for (const registration of competitionPlayers) {
        const player = getPlayer(registration.player_id);

        rows.set(
          registration.id,
          createEmptyRow(
            registration.id,
            player?.name || "Joueur inconnu",
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
      const teamIds = Array.from(
        new Set(
          matches
            .flatMap((match) => [match.home_team_id, match.away_team_id])
            .filter(Boolean) as string[]
        )
      );

      for (const teamId of teamIds) {
        const team = getTeam(teamId);

        rows.set(
          teamId,
          createEmptyRow(teamId, team?.name || "Équipe inconnue", "Club")
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
  }, [competition, competitionPlayers, players, teams, matches]);

  const completedMatchesCount = useMemo(() => {
    return matches.filter(
      (match) =>
        match.status === "completed" &&
        match.home_score !== null &&
        match.away_score !== null
    ).length;
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

  const participantType = getParticipantType(competition);

  const competitionLabel = competition.season
    ? `${competition.name} · ${competition.season}`
    : competition.name;

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <Link
            href="/competitions"
            className="mb-6 inline-flex rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
          >
            ← Retour aux compétitions
          </Link>

          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Classement de la compétition
          </p>

          <h1 className="text-4xl font-black md:text-5xl">
            {competitionLabel}
          </h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Classement calculé uniquement avec les matchs terminés.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-red-400/30 bg-[#160A12] p-4 text-sm text-red-300">
              {message}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/competitions/${competition.id}/matchs`}
              className="rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
            >
              Matchs
            </Link>

            <Link
              href={`/competitions/${competition.id}/inscription`}
              className="rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
            >
              Inscription
            </Link>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="Participants" value={classement.length} />
          <StatCard label="Matchs joués" value={completedMatchesCount} />
          <StatCard
            label="Type"
            value={participantType === "players" ? "Joueurs" : "Équipes"}
          />
          <StatCard label="Statut" value={competition.status} />
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 shadow-lg shadow-black/30">
          <div className="border-b border-[#D9A441]/15 p-6">
            <h2 className="text-2xl font-black text-[#F7E9C5]">
              Classement
            </h2>

            <p className="mt-2 text-sm text-[#8F7B5C]">
              Tri : points, goal average, buts pour, buts contre.
            </p>
          </div>

          {classement.length === 0 ? (
            <div className="p-6">
              <p className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
                Aucun participant dans le classement pour le moment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr className="border-b border-[#D9A441]/15 bg-[#0B0610]/70 text-left text-xs uppercase tracking-widest text-[#8F7B5C]">
                    <th className="px-5 py-4">#</th>
                    <th className="px-5 py-4">Participant</th>
                    <th className="px-5 py-4 text-center">MJ</th>
                    <th className="px-5 py-4 text-center text-green-300">V</th>
                    <th className="px-5 py-4 text-center text-orange-300">N</th>
                    <th className="px-5 py-4 text-center text-red-300">P</th>
                    <th className="px-5 py-4 text-center text-green-300">
                      BP
                    </th>
                    <th className="px-5 py-4 text-center text-red-300">BC</th>
                    <th className="px-5 py-4 text-center">GA</th>
                    <th className="px-5 py-4 text-center">Pts</th>
                  </tr>
                </thead>

                <tbody>
                  {classement.map((row, index) => (
                    <tr
                      key={row.id}
                      className="border-b border-[#D9A441]/10 transition hover:bg-[#0B0610]/50"
                    >
                      <td className="px-5 py-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D9A441]/25 bg-[#0B0610] text-sm font-black text-[#F2D27A]">
                          {index + 1}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-[#F7E9C5]">{row.name}</p>
                        <p className="mt-1 text-sm text-[#8F7B5C]">
                          {row.subLabel}
                        </p>
                      </td>

                      <TableStat value={row.mj} />
                      <TableStat value={row.v} tone="green" />
                      <TableStat value={row.n} tone="orange" />
                      <TableStat value={row.p} tone="red" />
                      <TableStat value={row.bp} tone="green" />
                      <TableStat value={row.bc} tone="red" />
                      <TableStat
                        value={row.ga > 0 ? `+${row.ga}` : row.ga}
                      />
                      <TableStat value={row.pts} strong />
                    </tr>
                  ))}
                </tbody>
              </table>
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-5 shadow-lg shadow-black/30">
      <p className="text-sm text-[#8F7B5C]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#F2D27A]">{value}</p>
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
      className={`px-5 py-4 text-center ${
        strong ? "text-lg font-black" : "font-semibold"
      } ${colorClass}`}
    >
      {value}
    </td>
  );
}