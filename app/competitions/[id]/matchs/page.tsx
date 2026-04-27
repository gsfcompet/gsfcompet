"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: "teams" | "players";
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

export default function CompetitionMatchesPage() {
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

    const loadedMatches = (matchesResult.data ?? []) as Match[];

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

    setCompetition(competitionResult.data as Competition);
    setMatches(loadedMatches);
    setCompetitionPlayers(loadedCompetitionPlayers);
    setPlayers(loadedPlayers);
    setTeams(loadedTeams);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [competitionId]);

  const upcomingMatches = useMemo(() => {
    return matches.filter((match) => match.status !== "completed");
  }, [matches]);

  const completedMatches = useMemo(() => {
    return matches.filter((match) => match.status === "completed");
  }, [matches]);

  function getCompetitionPlayer(registrationId: string | null) {
    if (!registrationId) return null;

    return (
      competitionPlayers.find(
        (registration) => registration.id === registrationId
      ) ?? null
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

  function getParticipantLabel({
    competitionPlayerId,
    teamId,
  }: {
    competitionPlayerId: string | null;
    teamId: string | null;
  }) {
    const registration = getCompetitionPlayer(competitionPlayerId);

    if (registration) {
      const player = getPlayer(registration.player_id);

      const playerName = player?.name || "Joueur";
      const eaTeamName = registration.ea_team_name || "Équipe EA FC";

      return `${playerName} · ${eaTeamName}`;
    }

    const team = getTeam(teamId);

    if (team) {
      return team.name;
    }

    return "À définir";
  }

  function formatDate(value: string | null) {
    if (!value) return "À planifier";

    const date = new Date(value);

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function getStatusLabel(status: string) {
    if (status === "completed") return "Terminé";
    if (status === "scheduled") return "À venir";
    if (status === "planned") return "À planifier";
    if (status === "in_progress") return "En cours";

    return status;
  }

  function getStatusClass(status: string) {
    if (status === "completed") {
      return "border-green-400/30 text-green-300";
    }

    if (status === "in_progress") {
      return "border-orange-400/30 text-orange-300";
    }

    return "border-[#D9A441]/30 text-[#F2D27A]";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="text-[#D8C7A0]">Chargement des matchs...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!competition) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
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
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <Link
            href="/competitions"
            className="mb-6 inline-flex rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
          >
            ← Retour aux compétitions
          </Link>

          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Matchs de la compétition
          </p>

          <h1 className="text-4xl font-black md:text-5xl">
            {competitionLabel}
          </h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Consulte les rencontres, les scores et les résultats de cette
            compétition.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-red-400/30 bg-[#160A12] p-4 text-sm text-red-300">
              {message}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/competitions/${competition.id}/inscription`}
              className="rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
            >
              Inscription
            </Link>

            <Link
              href={`/competitions/${competition.id}/classement`}
              className="rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
            >
              Classement
            </Link>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <StatCard label="Matchs" value={matches.length} />
          <StatCard label="À venir" value={upcomingMatches.length} />
          <StatCard label="Terminés" value={completedMatches.length} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
            <h2 className="text-2xl font-black">Matchs à venir</h2>

            <div className="mt-5 space-y-4">
              {upcomingMatches.length === 0 && (
                <EmptyState text="Aucun match à venir pour cette compétition." />
              )}

              {upcomingMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  homeLabel={getParticipantLabel({
                    competitionPlayerId: match.home_competition_player_id,
                    teamId: match.home_team_id,
                  })}
                  awayLabel={getParticipantLabel({
                    competitionPlayerId: match.away_competition_player_id,
                    teamId: match.away_team_id,
                  })}
                  dateLabel={formatDate(match.match_date)}
                  statusLabel={getStatusLabel(match.status)}
                  statusClass={getStatusClass(match.status)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
            <h2 className="text-2xl font-black">Résultats</h2>

            <div className="mt-5 space-y-4">
              {completedMatches.length === 0 && (
                <EmptyState text="Aucun résultat pour cette compétition." />
              )}

              {completedMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  homeLabel={getParticipantLabel({
                    competitionPlayerId: match.home_competition_player_id,
                    teamId: match.home_team_id,
                  })}
                  awayLabel={getParticipantLabel({
                    competitionPlayerId: match.away_competition_player_id,
                    teamId: match.away_team_id,
                  })}
                  dateLabel={formatDate(match.match_date)}
                  statusLabel={getStatusLabel(match.status)}
                  statusClass={getStatusClass(match.status)}
                />
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-5 shadow-lg shadow-black/30">
      <p className="text-sm text-[#8F7B5C]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#F2D27A]">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
      {text}
    </p>
  );
}

function MatchCard({
  match,
  homeLabel,
  awayLabel,
  dateLabel,
  statusLabel,
  statusClass,
}: {
  match: Match;
  homeLabel: string;
  awayLabel: string;
  dateLabel: string;
  statusLabel: string;
  statusClass: string;
}) {
  const hasScore = match.home_score !== null && match.away_score !== null;

  return (
    <article className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#8F7B5C]">{dateLabel}</p>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <p className="font-semibold text-[#F7E9C5]">{homeLabel}</p>

        <div className="rounded-xl border border-[#D9A441]/25 bg-[#160A12] px-4 py-3 text-center">
          {hasScore ? (
            <p className="text-2xl font-black text-[#F2D27A]">
              {match.home_score} - {match.away_score}
            </p>
          ) : (
            <p className="text-sm font-black uppercase tracking-widest text-[#F2D27A]">
              VS
            </p>
          )}
        </div>

        <p className="font-semibold text-[#F7E9C5] md:text-right">
          {awayLabel}
        </p>
      </div>
    </article>
  );
}