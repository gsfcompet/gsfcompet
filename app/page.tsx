"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  role: "member" | "admin";
  username: string | null;
};

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: "players" | "teams";
  created_at?: string | null;
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
  created_at?: string | null;
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
  ea_team_name: string | null;
};

type Player = {
  id: string;
  name: string | null;
  ea_name: string | null;
};

type Team = {
  id: string;
  name: string;
};

const homeHeroImage = "/banniere-gsf-v2.png";

function getCompetitionTypeLabel(type: string) {
  if (type === "league") return "Championnat";
  if (type === "cup") return "Coupe";
  if (type === "tournament") return "Tournoi";

  return type;
}

function getStatusLabel(status: string) {
  if (status === "draft") return "Brouillon";
  if (status === "planned") return "Planifiée";
  if (status === "active") return "Active";
  if (status === "completed") return "Terminée";
  if (status === "archived") return "Archivée";
  if (status === "scheduled") return "Programmée";
  if (status === "in_progress") return "En cours";

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

function formatDate(value: string | null) {
  if (!value) return "À planifier";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date invalide";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFullDate(value: string | null | undefined) {
  if (!value) return "Date inconnue";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date inconnue";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitionPlayers, setCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const profileResult = await supabase
        .from("profiles")
        .select("id, role, username")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileResult.error && profileResult.data) {
        setProfile(profileResult.data as Profile);
      }
    }

    const competitionsResult = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (competitionsResult.error) {
      setMessage(`Erreur compétitions : ${competitionsResult.error.message}`);
      setLoading(false);
      return;
    }

    const matchesResult = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (matchesResult.error) {
      setMessage(`Erreur matchs : ${matchesResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedCompetitions = (competitionsResult.data ?? []) as Competition[];
    const loadedMatches = (matchesResult.data ?? []) as Match[];

    const competitionPlayerIds = Array.from(
      new Set(
        loadedMatches
          .flatMap((match) => [
            match.home_competition_player_id,
            match.away_competition_player_id,
          ])
          .filter(Boolean) as string[]
      )
    );

    let loadedCompetitionPlayers: CompetitionPlayer[] = [];

    if (competitionPlayerIds.length > 0) {
      const competitionPlayersResult = await supabase
        .from("competition_players")
        .select("id, competition_id, player_id, ea_team_name")
        .in("id", competitionPlayerIds);

      if (!competitionPlayersResult.error) {
        loadedCompetitionPlayers =
          (competitionPlayersResult.data ?? []) as CompetitionPlayer[];
      }
    }

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
        .select("id, name, ea_name")
        .in("id", playerIds);

      if (!playersResult.error) {
        loadedPlayers = (playersResult.data ?? []) as Player[];
      }
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
        .select("id, name")
        .in("id", teamIds);

      if (!teamsResult.error) {
        loadedTeams = (teamsResult.data ?? []) as Team[];
      }
    }

    setCompetitions(loadedCompetitions);
    setMatches(loadedMatches);
    setCompetitionPlayers(loadedCompetitionPlayers);
    setPlayers(loadedPlayers);
    setTeams(loadedTeams);
    setLoading(false);
  }

  const competitionById = useMemo(() => {
    return new Map(competitions.map((competition) => [competition.id, competition]));
  }, [competitions]);

  const registrationById = useMemo(() => {
    return new Map(
      competitionPlayers.map((registration) => [registration.id, registration])
    );
  }, [competitionPlayers]);

  const playerById = useMemo(() => {
    return new Map(players.map((player) => [player.id, player]));
  }, [players]);

  const teamById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  const upcomingMatches = useMemo(() => {
    return matches
      .filter((match) => match.status !== "completed")
      .slice(0, 6);
  }, [matches]);

  const latestResults = useMemo(() => {
    return matches
      .filter(
        (match) =>
          match.status === "completed" &&
          match.home_score !== null &&
          match.away_score !== null
      )
      .slice(0, 6);
  }, [matches]);

  const latestCompetitions = useMemo(() => {
    return competitions.slice(0, 6);
  }, [competitions]);

  const activeCompetitionsCount = competitions.filter(
    (competition) =>
      competition.status === "active" || competition.status === "planned"
  ).length;

  const teamsCompetitionsCount = competitions.filter(
    (competition) => competition.participant_type === "teams"
  ).length;

  const completedMatchesCount = matches.filter(
    (match) => match.status === "completed"
  ).length;

  function getCompetitionLabel(competitionId: string) {
    const competition = competitionById.get(competitionId);

    if (!competition) return "Compétition";

    return competition.season
      ? `${competition.name} · ${competition.season}`
      : competition.name;
  }

  function getParticipantName({
    competitionPlayerId,
    teamId,
  }: {
    competitionPlayerId: string | null;
    teamId: string | null;
  }) {
    if (teamId) {
      return teamById.get(teamId)?.name || "Team inconnue";
    }

    if (competitionPlayerId) {
      const registration = registrationById.get(competitionPlayerId);

      if (!registration) return "Joueur inconnu";

      const player = playerById.get(registration.player_id);
      const playerName = player?.ea_name || player?.name || "Joueur";
      const eaTeamName = registration.ea_team_name || "Équipe EA FC";

      return `${playerName} · ${eaTeamName}`;
    }

    return "À définir";
  }

  function getHomeName(match: Match) {
    return getParticipantName({
      competitionPlayerId: match.home_competition_player_id,
      teamId: match.home_team_id,
    });
  }

  function getAwayName(match: Match) {
    return getParticipantName({
      competitionPlayerId: match.away_competition_player_id,
      teamId: match.away_team_id,
    });
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <section className="relative overflow-hidden rounded-[32px] border border-[#D9A441]/25 bg-black shadow-2xl shadow-black/60">
          <img
            src={homeHeroImage}
            alt="Guardian's Family"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#07000d]/95 via-[#12040d]/80 to-black/35" />
          <div className="absolute inset-0 bg-black/10" />

          <div className="relative z-10 grid min-h-[420px] gap-8 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8 xl:min-h-[480px]">
            <div className="flex flex-col justify-center">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#F2D27A]">
                Guardian&apos;s Family
              </p>

              <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight text-[#F7E9C5] drop-shadow md:text-6xl">
                GSF Compet
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-[#D8C7A0] md:text-base">
                Suis les compétitions EA FC, les prochaines rencontres, les
                derniers résultats et accède rapidement à ton espace membre ou à
                l’administration.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/competitions"
                  className="rounded-xl bg-[#F2C300] px-5 py-3 text-sm font-black text-black shadow-lg shadow-yellow-950/30 transition hover:bg-yellow-300"
                >
                  Voir les compétitions
                </Link>

                <Link
                  href="/membre"
                  className="rounded-xl border border-[#D9A441]/35 bg-black/35 px-5 py-3 text-sm font-black text-[#F2D27A] backdrop-blur transition hover:bg-[#160A12]"
                >
                  Espace membre
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="rounded-xl bg-[#A61E22] px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-[#8E171C]"
                  >
                    Administration
                  </Link>
                )}
              </div>
            </div>

            <div className="grid content-center gap-3 sm:grid-cols-2">
              <SummaryTile label="Compétitions" value={competitions.length} />
              <SummaryTile label="Actives" value={activeCompetitionsCount} />
              <SummaryTile label="Teams esport" value={teamsCompetitionsCount} />
              <SummaryTile label="Matchs terminés" value={completedMatchesCount} />
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-6 rounded-2xl border border-[#D9A441]/30 bg-[#160A12] px-4 py-3 text-sm font-black text-[#F2D27A]">
            {message}
          </div>
        )}

        {loading ? (
          <section className="mt-8 rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 text-[#D8C7A0] shadow-2xl shadow-black/40">
            Chargement du dashboard...
          </section>
        ) : (
          <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-8">
              <DashboardTable
                title="Prochaines rencontres"
                description="Les matchs à venir ou à planifier."
                count={upcomingMatches.length}
                emptyText="Aucune rencontre à venir."
              >
                <thead className="sticky top-0 z-10 bg-[#26070b] text-[10px] uppercase tracking-[0.18em] text-[#F2D27A]">
                  <tr>
                    <th className="border-b border-[#D9A441]/20 px-4 py-3">
                      Date
                    </th>
                    <th className="border-b border-[#D9A441]/20 px-4 py-3">
                      Match
                    </th>
                    <th className="border-b border-[#D9A441]/20 px-4 py-3">
                      Compétition
                    </th>
                    <th className="border-b border-[#D9A441]/20 px-4 py-3 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {upcomingMatches.map((match) => (
                    <tr
                      key={match.id}
                      className="border-b border-[#D9A441]/10 transition hover:bg-[#D9A441]/5"
                    >
                      <td className="px-4 py-4 text-[#D8C7A0]">
                        {formatDate(match.match_date)}
                      </td>

                      <td className="px-4 py-4">
                        <p className="truncate font-black text-[#F7E9C5]">
                          {getHomeName(match)}
                        </p>
                        <p className="my-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F2D27A]">
                          vs
                        </p>
                        <p className="truncate font-black text-[#F7E9C5]">
                          {getAwayName(match)}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-[#D8C7A0]">
                        <p className="truncate">
                          {getCompetitionLabel(match.competition_id)}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/competitions/${match.competition_id}/matchs`}
                          className="rounded-lg border border-[#D9A441]/30 px-3 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DashboardTable>

              <DashboardTable
                title="Derniers résultats"
                description="Les matchs terminés récemment."
                count={latestResults.length}
                emptyText="Aucun résultat pour le moment."
              >
                <thead className="sticky top-0 z-10 bg-[#26070b] text-[10px] uppercase tracking-[0.18em] text-[#F2D27A]">
                  <tr>
                    <th className="border-b border-[#D9A441]/20 px-4 py-3">
                      Match
                    </th>
                    <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center">
                      Score
                    </th>
                    <th className="border-b border-[#D9A441]/20 px-4 py-3">
                      Compétition
                    </th>
                    <th className="border-b border-[#D9A441]/20 px-4 py-3 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {latestResults.map((match) => (
                    <tr
                      key={match.id}
                      className="border-b border-[#D9A441]/10 transition hover:bg-[#D9A441]/5"
                    >
                      <td className="px-4 py-4">
                        <p className="truncate font-black text-[#F7E9C5]">
                          {getHomeName(match)}
                        </p>
                        <p className="my-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F2D27A]">
                          vs
                        </p>
                        <p className="truncate font-black text-[#F7E9C5]">
                          {getAwayName(match)}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex min-w-16 justify-center rounded-xl border border-[#D9A441]/30 bg-black/35 px-3 py-2 text-sm font-black text-[#F2D27A]">
                          {match.home_score} - {match.away_score}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-[#D8C7A0]">
                        <p className="truncate">
                          {getCompetitionLabel(match.competition_id)}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/competitions/${match.competition_id}/classement`}
                          className="rounded-lg border border-[#D9A441]/30 px-3 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
                        >
                          Classement
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DashboardTable>
            </div>

            <div className="grid gap-8">
              <section className="rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
                <h2 className="text-2xl font-black text-[#F7E9C5]">
                  Accès rapide
                </h2>

                <div className="mt-5 grid gap-3">
                  <QuickLink
                    href="/competitions"
                    title="Compétitions"
                    text="Voir toutes les compétitions joueurs et teams esport."
                  />

                  <QuickLink
                    href="/membre"
                    title="Espace membre"
                    text="Voir tes compétitions, tes matchs et proposer un score."
                  />

                  <QuickLink
                    href="/equipes"
                    title="Équipes & participants"
                    text="Consulter les joueurs et teams inscrits."
                  />

                  {isAdmin && (
                    <>
                      <QuickLink
                        href="/admin"
                        title="Administration"
                        text="Créer et gérer les compétitions."
                      />

                      <QuickLink
                        href="/admin/teams"
                        title="Teams esport"
                        text="Créer les teams et les inscrire aux compétitions."
                      />

                      <QuickLink
                        href="/admin/membres"
                        title="Gestion membres"
                        text="Modifier les rôles et gérer les comptes."
                      />
                    </>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-[#F7E9C5]">
                      Dernières compétitions
                    </h2>

                    <p className="mt-2 text-sm text-[#D8C7A0]">
                      Les compétitions les plus récentes.
                    </p>
                  </div>

                  <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[#D9A441]/35 bg-black/30 px-3 text-sm font-black text-[#F2D27A]">
                    {latestCompetitions.length}
                  </span>
                </div>

                <div className="grid gap-3">
                  {latestCompetitions.length === 0 ? (
                    <EmptyState text="Aucune compétition créée." />
                  ) : (
                    latestCompetitions.map((competition) => (
                      <article
                        key={competition.id}
                        className="rounded-2xl border border-[#D9A441]/20 bg-black/25 p-4 transition hover:bg-[#D9A441]/5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-black text-[#F7E9C5]">
                              {competition.name}
                            </h3>

                            <p className="mt-1 text-sm text-[#D8C7A0]">
                              {getCompetitionTypeLabel(competition.type)}
                              {competition.season
                                ? ` · ${competition.season}`
                                : ""}
                            </p>

                            <p className="mt-1 text-xs text-[#8F7B5C]">
                              Créée le {formatFullDate(competition.created_at)}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                              competition.status
                            )}`}
                          >
                            {getStatusLabel(competition.status)}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={`/competitions/${competition.id}/matchs`}
                            className="rounded-lg border border-[#D9A441]/30 px-3 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
                          >
                            Matchs
                          </Link>

                          <Link
                            href={`/competitions/${competition.id}/classement`}
                            className="rounded-lg border border-[#D9A441]/30 px-3 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
                          >
                            Classement
                          </Link>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/25 bg-black/30 px-5 py-4 text-center">
      <p className="text-2xl font-black text-[#F2D27A]">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-widest text-[#8F7B5C]">
        {label}
      </p>
    </div>
  );
}

function DashboardTable({
  title,
  description,
  count,
  emptyText,
  children,
}: {
  title: string;
  description: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#F7E9C5]">{title}</h2>
          <p className="mt-2 text-sm text-[#D8C7A0]">{description}</p>
        </div>

        <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[#D9A441]/35 bg-black/30 px-3 text-sm font-black text-[#F2D27A]">
          {count}
        </span>
      </div>

      {count === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#D9A441]/20 bg-black/20">
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              {children}
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D9A441]/25 bg-black/25 p-5 text-sm text-[#D8C7A0]">
      {text}
    </div>
  );
}

function QuickLink({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-[#D9A441]/20 bg-black/25 p-4 transition hover:border-[#D9A441]/45 hover:bg-[#D9A441]/5"
    >
      <p className="font-black text-[#F7E9C5]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#D8C7A0]">{text}</p>
    </Link>
  );
}
