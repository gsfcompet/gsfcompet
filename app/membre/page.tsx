"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FutMemberCard from "@/components/FutMemberCard";

type Profile = {
  id: string;
  email?: string | null;
  username?: string | null;
  role?: "member" | "admin" | string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  pays?: string | null;
  country?: string | null;
  plateforme?: string | null;
  platform?: string | null;
};

type Player = {
  id: string;
  user_id: string | null;
  name: string;
  ea_name: string | null;
  platform: string | null;
};

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: "teams" | "players";
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
  submitted_home_score: number | null;
  submitted_away_score: number | null;
  score_status: string | null;
  score_submitted_by: string | null;
  score_submitted_at: string | null;
};

type MemberStats = {
  mj: number;
  v: number;
  n: number;
  p: number;
  bp: number;
  bc: number;
  ga: number;
  pts: number;
};

type MatchCardData = {
  match: Match;
  competition: Competition | null;
  currentRegistration: CompetitionPlayer | null;
  opponentRegistration: CompetitionPlayer | null;
  opponentPlayer: Player | null;
};

type MemberCompetitionCardData = {
  registration: CompetitionPlayer;
  competition: Competition | null;
  matchesTotal: number;
  matchesUpcoming: number;
  matchesCompleted: number;
  pendingScores: number;
};

const emptyStats: MemberStats = {
  mj: 0,
  v: 0,
  n: 0,
  p: 0,
  bp: 0,
  bc: 0,
  ga: 0,
  pts: 0,
};

export default function MemberPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);

  const [registrations, setRegistrations] = useState<CompetitionPlayer[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<CompetitionPlayer[]>(
    []
  );
  const [players, setPlayers] = useState<Player[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const profileResult = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error || !profileResult.data) {
      setMessage("Profil introuvable. Reconnecte-toi ou contacte un admin.");
      setLoading(false);
      return;
    }

    const playerResult = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (playerResult.error) {
      setMessage(`Erreur joueur : ${playerResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedProfile = profileResult.data as Profile;
    const loadedPlayer = playerResult.data as Player | null;

    setProfile(loadedProfile);
    setPlayer(loadedPlayer);

    if (!loadedPlayer) {
      setRegistrations([]);
      setAllRegistrations([]);
      setPlayers([]);
      setCompetitions([]);
      setMatches([]);
      setLoading(false);
      return;
    }

    const registrationsResult = await supabase
      .from("competition_players")
      .select("*")
      .eq("player_id", loadedPlayer.id);

    if (registrationsResult.error) {
      setMessage(`Erreur inscriptions : ${registrationsResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedRegistrations =
      (registrationsResult.data ?? []) as CompetitionPlayer[];

    const registrationIds = loadedRegistrations.map(
      (registration) => registration.id
    );

    if (registrationIds.length === 0) {
      setRegistrations([]);
      setAllRegistrations([]);
      setPlayers([loadedPlayer]);
      setCompetitions([]);
      setMatches([]);
      setLoading(false);
      return;
    }

    const matchesResult = await supabase
      .from("matches")
      .select("*")
      .or(
        `home_competition_player_id.in.(${registrationIds.join(
          ","
        )}),away_competition_player_id.in.(${registrationIds.join(",")})`
      )
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (matchesResult.error) {
      setMessage(`Erreur matchs : ${matchesResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedMatches = (matchesResult.data ?? []) as Match[];

    const competitionIds = Array.from(
      new Set(
        [
          ...loadedRegistrations.map(
            (registration) => registration.competition_id
          ),
          ...loadedMatches.map((match) => match.competition_id),
        ].filter(Boolean)
      )
    );

    let loadedCompetitions: Competition[] = [];

    if (competitionIds.length > 0) {
      const competitionsResult = await supabase
        .from("competitions")
        .select("*")
        .in("id", competitionIds);

      if (competitionsResult.error) {
        setMessage(
          `Erreur compétitions : ${competitionsResult.error.message}`
        );
        setLoading(false);
        return;
      }

      loadedCompetitions = (competitionsResult.data ?? []) as Competition[];
    }

    const relatedRegistrationIds = Array.from(
      new Set(
        loadedMatches
          .flatMap((match) => [
            match.home_competition_player_id,
            match.away_competition_player_id,
          ])
          .filter(Boolean) as string[]
      )
    );

    let loadedAllRegistrations: CompetitionPlayer[] = [];

    if (relatedRegistrationIds.length > 0) {
      const allRegistrationsResult = await supabase
        .from("competition_players")
        .select("*")
        .in("id", relatedRegistrationIds);

      if (allRegistrationsResult.error) {
        setMessage(
          `Erreur participants matchs : ${allRegistrationsResult.error.message}`
        );
        setLoading(false);
        return;
      }

      loadedAllRegistrations =
        (allRegistrationsResult.data ?? []) as CompetitionPlayer[];
    }

    const playerIds = Array.from(
      new Set(
        loadedAllRegistrations
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
        setMessage(`Erreur joueurs matchs : ${playersResult.error.message}`);
        setLoading(false);
        return;
      }

      loadedPlayers = (playersResult.data ?? []) as Player[];
    }

    setRegistrations(loadedRegistrations);
    setAllRegistrations(loadedAllRegistrations);
    setPlayers(loadedPlayers);
    setCompetitions(loadedCompetitions);
    setMatches(loadedMatches);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memberStats = useMemo(() => {
    if (!player) return emptyStats;

    const currentRegistrationIds = registrations.map(
      (registration) => registration.id
    );

    const stats: MemberStats = { ...emptyStats };

    for (const match of matches) {
      if (match.status !== "completed") continue;
      if (match.home_score === null || match.away_score === null) continue;

      const isHome = currentRegistrationIds.includes(
        match.home_competition_player_id || ""
      );
      const isAway = currentRegistrationIds.includes(
        match.away_competition_player_id || ""
      );

      if (!isHome && !isAway) continue;

      const goalsFor = isHome ? match.home_score : match.away_score;
      const goalsAgainst = isHome ? match.away_score : match.home_score;

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
    }

    stats.ga = stats.bp - stats.bc;

    return stats;
  }, [matches, player, registrations]);

  const memberCompetitionCards = useMemo(() => {
    return registrations.map((registration): MemberCompetitionCardData => {
      const competition =
        competitions.find(
          (currentCompetition) =>
            currentCompetition.id === registration.competition_id
        ) ?? null;

      const competitionMatches = matches.filter((match) => {
        const sameCompetition =
          match.competition_id === registration.competition_id;

        const memberMatch =
          match.home_competition_player_id === registration.id ||
          match.away_competition_player_id === registration.id;

        return sameCompetition && memberMatch;
      });

      return {
        registration,
        competition,
        matchesTotal: competitionMatches.length,
        matchesUpcoming: competitionMatches.filter(
          (match) => match.status !== "completed"
        ).length,
        matchesCompleted: competitionMatches.filter(
          (match) => match.status === "completed"
        ).length,
        pendingScores: competitionMatches.filter(
          (match) => match.score_status === "pending"
        ).length,
      };
    });
  }, [competitions, matches, registrations]);

  const upcomingMatchCards = useMemo(() => {
    if (!player) return [];

    const currentRegistrationIds = registrations.map(
      (registration) => registration.id
    );

    return matches
      .filter((match) => match.status !== "completed")
      .map((match): MatchCardData => {
        const isHome = currentRegistrationIds.includes(
          match.home_competition_player_id || ""
        );

        const currentRegistrationId = isHome
          ? match.home_competition_player_id
          : match.away_competition_player_id;

        const opponentRegistrationId = isHome
          ? match.away_competition_player_id
          : match.home_competition_player_id;

        const currentRegistration =
          allRegistrations.find(
            (registration) => registration.id === currentRegistrationId
          ) ?? null;

        const opponentRegistration =
          allRegistrations.find(
            (registration) => registration.id === opponentRegistrationId
          ) ?? null;

        const opponentPlayer =
          players.find(
            (currentPlayer) =>
              currentPlayer.id === opponentRegistration?.player_id
          ) ?? null;

        const competition =
          competitions.find(
            (currentCompetition) =>
              currentCompetition.id === match.competition_id
          ) ?? null;

        return {
          match,
          competition,
          currentRegistration,
          opponentRegistration,
          opponentPlayer,
        };
      });
  }, [allRegistrations, competitions, matches, player, players, registrations]);

  const completedMatchCards = useMemo(() => {
    if (!player) return [];

    const currentRegistrationIds = registrations.map(
      (registration) => registration.id
    );

    return matches
      .filter((match) => match.status === "completed")
      .slice(0, 5)
      .map((match): MatchCardData => {
        const isHome = currentRegistrationIds.includes(
          match.home_competition_player_id || ""
        );

        const currentRegistrationId = isHome
          ? match.home_competition_player_id
          : match.away_competition_player_id;

        const opponentRegistrationId = isHome
          ? match.away_competition_player_id
          : match.home_competition_player_id;

        const currentRegistration =
          allRegistrations.find(
            (registration) => registration.id === currentRegistrationId
          ) ?? null;

        const opponentRegistration =
          allRegistrations.find(
            (registration) => registration.id === opponentRegistrationId
          ) ?? null;

        const opponentPlayer =
          players.find(
            (currentPlayer) =>
              currentPlayer.id === opponentRegistration?.player_id
          ) ?? null;

        const competition =
          competitions.find(
            (currentCompetition) =>
              currentCompetition.id === match.competition_id
          ) ?? null;

        return {
          match,
          competition,
          currentRegistration,
          opponentRegistration,
          opponentPlayer,
        };
      });
  }, [allRegistrations, competitions, matches, player, players, registrations]);

  const favoriteRegistration = registrations[0] ?? null;

  const pseudo =
    player?.name ||
    profile?.username ||
    profile?.email?.split("@")[0] ||
    "Membre";

  const plateforme =
    player?.platform || profile?.plateforme || profile?.platform || "PC";

  const pays = profile?.pays || profile?.country || "France";

  const avatarUrl = profile?.avatar_url || profile?.avatarUrl || null;

  const equipeEAFC = favoriteRegistration?.ea_team_name || "Sans équipe";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="text-[#D8C7A0]">Chargement de l’espace membre...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#0B0610] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
              Espace membre
            </p>

            <h1 className="text-3xl font-black">Connexion requise</h1>

            <p className="mt-3 text-[#D8C7A0]">
              Connecte-toi pour accéder à ta carte membre, tes matchs et tes
              compétitions.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white transition hover:bg-[#8E171C]"
              >
                Se connecter
              </Link>

              <Link
                href="/register"
                className="rounded-xl border border-[#D9A441]/30 px-6 py-3 font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Espace membre
          </p>

          <h1 className="text-4xl font-black md:text-5xl">
            Bienvenue {pseudo}
          </h1>

          <p className="mt-3 max-w-3xl text-[#D8C7A0]">
            Retrouve ta carte membre, tes statistiques et tes matchs à jouer.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-[#D9A441]/30 bg-[#160A12] p-4 text-sm text-[#F2D27A]">
              {message}
            </div>
          )}
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
          <aside className="space-y-6">
            <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <FutMemberCard
                pseudo={pseudo}
                role={profile.role || "member"}
                note={99}
                plateforme={plateforme}
                pays={pays}
                equipeEAFC={equipeEAFC}
                avatarUrl={avatarUrl}
                mj={memberStats.mj}
                v={memberStats.v}
                n={memberStats.n}
                p={memberStats.p}
                bp={memberStats.bp}
                bc={memberStats.bc}
                ga={memberStats.ga}
                pts={memberStats.pts}
              />

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/membre/profil"
                  className="rounded-xl bg-[#A61E22] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8E171C]"
                >
                  Modifier mon profil
                </Link>

                <Link
                  href="/competitions"
                  className="rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
                >
                  Voir les compétitions
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <h2 className="text-2xl font-black text-[#F7E9C5]">
                Mes statistiques
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <StatBox label="MJ" value={memberStats.mj} />
                <StatBox label="PTS" value={memberStats.pts} />
                <StatBox label="V" value={memberStats.v} />
                <StatBox label="N" value={memberStats.n} />
                <StatBox label="P" value={memberStats.p} />
                <StatBox label="GA" value={memberStats.ga} />
              </div>
            </section>
          </aside>

          <div className="space-y-8">
            <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-[#F7E9C5]">
                    Mes compétitions
                  </h2>

                  <p className="mt-2 text-sm text-[#D8C7A0]">
                    Toutes les compétitions auxquelles tu es inscrit.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#D9A441]/30 bg-[#0B0610]/70 px-5 py-3 text-center">
                  <p className="text-2xl font-black text-[#F2D27A]">
                    {memberCompetitionCards.length}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-[#8F7B5C]">
                    inscriptions
                  </p>
                </div>
              </div>

              {!player ? (
                <EmptyState
                  title="Aucune fiche joueur"
                  text="Complète ton profil ou inscris-toi à une compétition pour générer ta fiche joueur."
                  linkHref="/competitions"
                  linkText="Voir les compétitions"
                />
              ) : memberCompetitionCards.length === 0 ? (
                <EmptyState
                  title="Aucune compétition"
                  text="Tu n’es inscrit à aucune compétition pour le moment."
                  linkHref="/competitions"
                  linkText="Voir les compétitions"
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {memberCompetitionCards.map((card) => (
                    <MemberCompetitionCard
                      key={card.registration.id}
                      data={card}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-[#F7E9C5]">
                    Mes matchs à jouer
                  </h2>

                  <p className="mt-2 text-sm text-[#D8C7A0]">
                    Tes prochains matchs et les scores à proposer.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#D9A441]/30 bg-[#0B0610]/70 px-5 py-3 text-center">
                  <p className="text-2xl font-black text-[#F2D27A]">
                    {upcomingMatchCards.length}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-[#8F7B5C]">
                    à jouer
                  </p>
                </div>
              </div>

              {!player ? (
                <EmptyState
                  title="Aucune fiche joueur"
                  text="Complète ton profil ou inscris-toi à une compétition pour générer ta fiche joueur."
                  linkHref="/competitions"
                  linkText="Voir les compétitions"
                />
              ) : upcomingMatchCards.length === 0 ? (
                <EmptyState
                  title="Aucun match à jouer"
                  text="Tu n’as pas encore de match à jouer. Inscris-toi à une compétition ou attends la génération des matchs."
                  linkHref="/competitions"
                  linkText="Voir les compétitions"
                />
              ) : (
                <div className="space-y-4">
                  {upcomingMatchCards.map((card) => (
                    <MemberMatchCard key={card.match.id} data={card} />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-green-400/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <h2 className="text-2xl font-black text-green-300">
                Derniers résultats
              </h2>

              <div className="mt-5 space-y-4">
                {completedMatchCards.length === 0 ? (
                  <p className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
                    Aucun résultat terminé pour le moment.
                  </p>
                ) : (
                  completedMatchCards.map((card) => (
                    <MemberResultCard key={card.match.id} data={card} />
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8F7B5C]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[#F2D27A]">{value}</p>
    </div>
  );
}

function EmptyState({
  title,
  text,
  linkHref,
  linkText,
}: {
  title: string;
  text: string;
  linkHref: string;
  linkText: string;
}) {
  return (
    <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-5">
      <h3 className="font-black text-[#F7E9C5]">{title}</h3>

      <p className="mt-2 text-sm text-[#D8C7A0]">{text}</p>

      <Link
        href={linkHref}
        className="mt-4 inline-flex rounded-lg border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
      >
        {linkText}
      </Link>
    </div>
  );
}

function MemberCompetitionCard({ data }: { data: MemberCompetitionCardData }) {
  const {
    registration,
    competition,
    matchesTotal,
    matchesUpcoming,
    matchesCompleted,
    pendingScores,
  } = data;

  return (
    <article className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-black text-[#F7E9C5]">
            {competition?.name || "Compétition inconnue"}
          </h3>

          <p className="mt-2 text-sm text-[#D8C7A0]">
            {competition?.season || "Saison non définie"} ·{" "}
            {getCompetitionTypeLabel(competition?.type)}
          </p>

          <p className="mt-1 text-sm font-semibold text-[#F2D27A]">
            {registration.ea_team_name || "Équipe EA FC non définie"}
          </p>
        </div>

        <span className="rounded-full border border-[#D9A441]/30 px-3 py-1 text-xs font-semibold text-[#F2D27A]">
          {competition?.status || "statut inconnu"}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <MiniStat label="Matchs" value={matchesTotal} />
        <MiniStat label="À jouer" value={matchesUpcoming} />
        <MiniStat label="Terminés" value={matchesCompleted} />
        <MiniStat label="Attente" value={pendingScores} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/competitions/${registration.competition_id}/matchs`}
          className="rounded-lg bg-[#A61E22] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8E171C]"
        >
          Matchs
        </Link>

        <Link
          href={`/competitions/${registration.competition_id}/classement`}
          className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
        >
          Classement
        </Link>

        <Link
          href={`/competitions/${registration.competition_id}/inscription`}
          className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
        >
          Modifier inscription
        </Link>
      </div>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#D9A441]/15 bg-[#160A12]/80 p-3 text-center">
      <p className="text-lg font-black text-[#F2D27A]">{value}</p>
      <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-[#8F7B5C]">
        {label}
      </p>
    </div>
  );
}

function MemberMatchCard({ data }: { data: MatchCardData }) {
  const {
    match,
    competition,
    currentRegistration,
    opponentRegistration,
    opponentPlayer,
  } = data;

  const hasSubmittedScore =
    match.submitted_home_score !== null && match.submitted_away_score !== null;

  return (
    <article className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-black text-[#F7E9C5]">
            {competition?.name || "Compétition inconnue"}
          </p>
          <p className="mt-1 text-xs uppercase tracking-widest text-[#8F7B5C]">
            {competition?.season || "Saison non définie"}
          </p>
        </div>

        <span className="rounded-full border border-[#D9A441]/30 px-3 py-1 text-xs font-semibold text-[#F2D27A]">
          {formatMatchDate(match.match_date)}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div>
          <p className="text-sm text-[#8F7B5C]">Ton équipe</p>
          <p className="mt-1 font-black text-[#F7E9C5]">
            {currentRegistration?.ea_team_name || "Équipe non définie"}
          </p>
        </div>

        <div className="rounded-xl border border-[#D9A441]/25 bg-[#160A12] px-5 py-3 text-center">
          <p className="text-sm font-black uppercase tracking-widest text-[#F2D27A]">
            VS
          </p>
        </div>

        <div className="md:text-right">
          <p className="text-sm text-[#8F7B5C]">Adversaire</p>
          <p className="mt-1 font-black text-[#F7E9C5]">
            {opponentPlayer?.name || "Joueur inconnu"}
          </p>
          <p className="mt-1 text-sm text-[#D8C7A0]">
            {opponentRegistration?.ea_team_name || "Équipe non définie"}
          </p>
        </div>
      </div>

      {hasSubmittedScore && (
        <div className="mt-4 rounded-xl border border-orange-400/20 bg-orange-950/20 p-4">
          <p className="text-sm font-semibold text-orange-300">
            Score proposé : {match.submitted_home_score} -{" "}
            {match.submitted_away_score}
          </p>

          <p className="mt-1 text-xs text-[#D8C7A0]">
            Statut : {getScoreStatusLabel(match.score_status)}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/competitions/${match.competition_id}/matchs`}
          className="rounded-lg bg-[#A61E22] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8E171C]"
        >
          Voir / proposer le score
        </Link>

        <Link
          href={`/competitions/${match.competition_id}/classement`}
          className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
        >
          Classement
        </Link>
      </div>
    </article>
  );
}

function MemberResultCard({ data }: { data: MatchCardData }) {
  const { match, competition, opponentRegistration, opponentPlayer } = data;

  return (
    <article className="rounded-xl border border-green-400/20 bg-[#0B0610]/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-black text-[#F7E9C5]">
            {competition?.name || "Compétition inconnue"}
          </p>
          <p className="mt-1 text-xs uppercase tracking-widest text-[#8F7B5C]">
            {competition?.season || "Saison non définie"}
          </p>
        </div>

        <p className="text-2xl font-black text-green-300">
          {match.home_score} - {match.away_score}
        </p>
      </div>

      <p className="text-sm text-[#D8C7A0]">
        Adversaire :{" "}
        <span className="font-semibold text-[#F2D27A]">
          {opponentPlayer?.name || "Joueur inconnu"}
        </span>{" "}
        · {opponentRegistration?.ea_team_name || "Équipe non définie"}
      </p>
    </article>
  );
}

function getCompetitionTypeLabel(type?: string | null) {
  if (type === "league") return "Championnat";
  if (type === "cup") return "Coupe";
  if (type === "tournament") return "Tournoi";

  return type || "Type inconnu";
}

function formatMatchDate(value: string | null) {
  if (!value) return "À planifier";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getScoreStatusLabel(status: string | null) {
  if (status === "pending") return "En attente de validation";
  if (status === "validated") return "Validé";
  if (status === "rejected") return "Refusé";

  return "Aucun statut";
}
