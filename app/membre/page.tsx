"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import FutMemberCard from "@/components/FutMemberCard";
import ScoreStatusBadge from "@/components/ScoreStatusBadge";

type ScoreStatus = "pending" | "validated" | "refused" | null;

type Profile = {
  id?: string;
  user_id?: string;
  username?: string | null;
  pseudo?: string | null;
  role?: string | null;
  note?: number | null;
  numero_maillot?: number | null;
  plateforme?: string | null;
  pays?: string | null;
  equipe_ea?: string | null;
  ea_team?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  mj?: number | null;
  v?: number | null;
  n?: number | null;
  p?: number | null;
  bp?: number | null;
  bc?: number | null;
  ga?: number | null;
  pts?: number | null;
};

type Player = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  ea_name?: string | null;
  platform?: string | null;
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
  ea_team_id?: string | null;
  ea_team_name?: string | null;
};

type EaTeam = {
  id: string;
  country?: string | null;
  league?: string | null;
  name?: string | null;
};

type Team = {
  id: string;
  name?: string | null;
};

type Competition = {
  id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  type?: string | null;
  season?: string | null;
  status?: string | null;
  format?: string | null;
};

type Match = {
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
  date?: string | null;
  match_date?: string | null;
  created_at?: string | null;
  status?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  score_home?: number | null;
  score_away?: number | null;
  submitted_home_score?: number | null;
  submitted_away_score?: number | null;
  score_submitted_by?: string | null;
  score_submitted_at?: string | null;
  score_status?: ScoreStatus;
  score_admin_note?: string | null;
  admin_note?: string | null;
  refusal_reason?: string | null;
  [key: string]: unknown;
};

export default function MembrePage() {
  const router = useRouter();
  const FutCard = FutMemberCard as ComponentType<any>;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [registrations, setRegistrations] = useState<CompetitionPlayer[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [eaTeams, setEaTeams] = useState<EaTeam[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [openScoreMatchId, setOpenScoreMatchId] = useState<string | null>(null);
  const [scoreHome, setScoreHome] = useState("");
  const [scoreAway, setScoreAway] = useState("");
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      setLoading(true);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(error);
        setMessage("Erreur lors de la récupération de la session.");
        setLoading(false);
        return;
      }

      if (!session?.user) {
        setLoading(false);
        router.push("/login");
        return;
      }

      await loadMemberData();
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function loadMemberData() {
    setLoading(true);
    setMessage(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(userError);
      setMessage("Erreur lors de la récupération de l'utilisateur.");
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const currentUserId = user.id;
    setUserId(currentUserId);

    const profileResult = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUserId)
      .maybeSingle();

    if (profileResult.error) {
      console.warn("Profil introuvable par id :", profileResult.error);
    }

    const loadedProfile = (profileResult.data as Profile | null) ?? null;
    setProfile(loadedProfile);

    const playerResult = await supabase
      .from("players")
      .select("*")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (playerResult.error) {
      console.error(playerResult.error);
      setMessage(`Erreur joueur : ${playerResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedPlayer = (playerResult.data as Player | null) ?? null;
    setPlayer(loadedPlayer);

    if (!loadedPlayer) {
      setRegistrations([]);
      setCompetitions([]);
      setMatches([]);
      setEaTeams([]);
      setPlayers([]);
      setTeams([]);
      setLoading(false);
      return;
    }

    const registrationsResult = await supabase
      .from("competition_players")
      .select("*")
      .eq("player_id", loadedPlayer.id);

    if (registrationsResult.error) {
      console.error(registrationsResult.error);
      setMessage(`Erreur inscriptions : ${registrationsResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedRegistrations =
      (registrationsResult.data ?? []) as CompetitionPlayer[];

    setRegistrations(loadedRegistrations);

    const competitionIds = Array.from(
      new Set(
        loadedRegistrations
          .map((registration) => registration.competition_id)
          .filter(Boolean)
      )
    );

    if (competitionIds.length === 0) {
      setCompetitions([]);
      setMatches([]);
      setEaTeams([]);
      setPlayers([loadedPlayer]);
      setTeams([]);
      setLoading(false);
      return;
    }

    const competitionsResult = await supabase
      .from("competitions")
      .select("*")
      .in("id", competitionIds);

    if (competitionsResult.error) {
      console.error(competitionsResult.error);
      setMessage(`Erreur compétitions : ${competitionsResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedCompetitions = (competitionsResult.data ?? []) as Competition[];
    setCompetitions(loadedCompetitions);

    const eaTeamIds = Array.from(
      new Set(
        loadedRegistrations
          .map((registration) => registration.ea_team_id)
          .filter(Boolean) as string[]
      )
    );

    if (eaTeamIds.length > 0) {
      const eaTeamsResult = await supabase
        .from("ea_teams")
        .select("*")
        .in("id", eaTeamIds);

      if (eaTeamsResult.error) {
        console.warn("Chargement équipes EA FC impossible :", eaTeamsResult.error);
        setEaTeams([]);
      } else {
        setEaTeams((eaTeamsResult.data ?? []) as EaTeam[]);
      }
    } else {
      setEaTeams([]);
    }

    const matchesResult = await supabase
      .from("matches")
      .select("*")
      .in("competition_id", competitionIds)
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (matchesResult.error) {
      console.error(matchesResult.error);
      setMessage(`Erreur matchs : ${matchesResult.error.message}`);
      setMatches([]);
    } else {
      const loadedMatches = ((matchesResult.data ?? []) as Match[]).sort(
        (a, b) => {
          const dateA = new Date(
            a.match_date || a.date || a.created_at || "2099-01-01"
          ).getTime();

          const dateB = new Date(
            b.match_date || b.date || b.created_at || "2099-01-01"
          ).getTime();

          return dateA - dateB;
        }
      );

      setMatches(loadedMatches);

      await loadRelatedData(loadedMatches, loadedRegistrations, loadedPlayer);
    }

    setLoading(false);
  }

  async function loadRelatedData(
    loadedMatches: Match[],
    loadedRegistrations: CompetitionPlayer[],
    currentPlayer: Player
  ) {
    const teamIds = Array.from(
      new Set(
        loadedMatches
          .flatMap((match) => [match.home_team_id, match.away_team_id])
          .filter(Boolean) as string[]
      )
    );

    if (teamIds.length > 0) {
      const teamsResult = await supabase
        .from("teams")
        .select("*")
        .in("id", teamIds);

      if (!teamsResult.error) {
        setTeams((teamsResult.data ?? []) as Team[]);
      } else {
        console.warn("Chargement équipes impossible :", teamsResult.error);
        setTeams([]);
      }
    } else {
      setTeams([]);
    }

    const playerIds = new Set<string>();

    playerIds.add(currentPlayer.id);

    loadedRegistrations.forEach((registration) => {
      if (registration.player_id) {
        playerIds.add(registration.player_id);
      }
    });

    loadedMatches.forEach((match) => {
      [
        match.home_player_id,
        match.away_player_id,
        match.player1_id,
        match.player2_id,
      ].forEach((id) => {
        if (typeof id === "string" && id) {
          playerIds.add(id);
        }
      });
    });

    if (playerIds.size > 0) {
      const playersResult = await supabase
        .from("players")
        .select("*")
        .in("id", Array.from(playerIds));

      if (!playersResult.error) {
        setPlayers((playersResult.data ?? []) as Player[]);
      } else {
        console.warn("Chargement joueurs impossible :", playersResult.error);
        setPlayers([currentPlayer]);
      }
    } else {
      setPlayers([currentPlayer]);
    }
  }

  const safeProfile = useMemo(() => {
    const mainRegistration = registrations[0] ?? null;

    const mainEaTeam = mainRegistration?.ea_team_id
      ? eaTeams.find((team) => team.id === mainRegistration.ea_team_id)
      : null;

    const cardPseudo =
      profile?.pseudo ||
      profile?.username ||
      player?.ea_name ||
      player?.name ||
      "Membre";

    const cardPlatform =
      player?.platform ||
      profile?.plateforme ||
      "PC";

    const cardMemberCountry =
      profile?.pays ||
      "FR";

    const cardTeamCountry =
      mainEaTeam?.country ||
      "Pays équipe";

    const cardEaTeam =
      mainRegistration?.ea_team_name ||
      mainEaTeam?.name ||
      profile?.equipe_ea ||
      profile?.ea_team ||
      "Sans équipe";

    return {
      pseudo: cardPseudo,
      role:
        profile?.role?.toLowerCase() === "admin"
          ? "ADMIN"
          : profile?.role?.toUpperCase() || "MEMBRE",
      note: profile?.numero_maillot ?? 0,
      numero_maillot: profile?.numero_maillot ?? 0,
      numeroMaillot: profile?.numero_maillot ?? 0,
      jerseyNumber: profile?.numero_maillot ?? 0,
      shirtNumber: profile?.numero_maillot ?? 0,
      plateforme: cardPlatform,
      pays: cardTeamCountry,
      paysEquipe: cardTeamCountry,
      paysMembre: cardMemberCountry,
      memberCountry: cardMemberCountry,
      countryMember: cardMemberCountry,
      equipe: cardEaTeam,
      equipeEAFC: cardEaTeam,
      equipe_ea: cardEaTeam,
      ea_team: cardEaTeam,
      eaTeam: cardEaTeam,
      team: cardEaTeam,
      club: cardEaTeam,
      avatar_url: profile?.avatar_url || profile?.avatarUrl || null,
      avatarUrl: profile?.avatarUrl || profile?.avatar_url || null,
      mj: profile?.mj ?? 0,
      v: profile?.v ?? 0,
      n: profile?.n ?? 0,
      p: profile?.p ?? 0,
      bp: profile?.bp ?? 0,
      bc: profile?.bc ?? 0,
      ga: profile?.ga ?? 0,
      pts: profile?.pts ?? 0,
    };
  }, [profile, player, registrations, eaTeams]);

  const teamById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  const playerById = useMemo(() => {
    return new Map(players.map((loadedPlayer) => [loadedPlayer.id, loadedPlayer]));
  }, [players]);

  const registrationById = useMemo(() => {
    return new Map(
      registrations.map((registration) => [registration.id, registration])
    );
  }, [registrations]);

  const registrationByPlayerId = useMemo(() => {
    return new Map(
      registrations.map((registration) => [
        registration.player_id,
        registration,
      ])
    );
  }, [registrations]);

  const memberMatches = useMemo(() => {
    return matches.filter((match) => isMatchForCurrentPlayer(match));
  }, [matches, player, registrations]);

  const matchesToPlay = useMemo(() => {
    return memberMatches.filter((match) => !hasFinalScore(match));
  }, [memberMatches]);

  const finishedMatches = useMemo(() => {
    return memberMatches.filter((match) => hasFinalScore(match));
  }, [memberMatches]);

  function normalizeScore(value: unknown) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
      return null;
    }

    return numberValue;
  }

  function getFinalHomeScore(match: Match) {
    return normalizeScore(match.home_score ?? match.score_home);
  }

  function getFinalAwayScore(match: Match) {
    return normalizeScore(match.away_score ?? match.score_away);
  }

  function hasFinalScore(match: Match) {
    return getFinalHomeScore(match) !== null && getFinalAwayScore(match) !== null;
  }

  function isMatchForCurrentPlayer(match: Match) {
    if (!player?.id) {
      return false;
    }

    const explicitPlayerIds = [
      match.home_player_id,
      match.away_player_id,
      match.player1_id,
      match.player2_id,
    ].filter(Boolean);

    if (explicitPlayerIds.length > 0) {
      return explicitPlayerIds.includes(player.id);
    }

    const currentRegistrationIds = registrations
      .filter((registration) => registration.player_id === player.id)
      .map((registration) => registration.id);

    const explicitRegistrationIds = [
      match.home_competition_player_id,
      match.away_competition_player_id,
    ].filter(Boolean);

    if (explicitRegistrationIds.length > 0) {
      return explicitRegistrationIds.some((registrationId) =>
        currentRegistrationIds.includes(String(registrationId))
      );
    }

    return true;
  }

  function getCompetitionName(match: Match) {
    const competition = competitions.find(
      (item) => item.id === match.competition_id
    );

    return competition?.title || competition?.name || "Compétition";
  }

  function getMatchDate(match: Match) {
    const rawDate = match.match_date || match.date;

    if (!rawDate) {
      return "Date non définie";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(rawDate));
  }

  function getScoreStatus(match: Match): ScoreStatus {
    if (
      match.score_status === "pending" ||
      match.score_status === "validated" ||
      match.score_status === "refused"
    ) {
      return match.score_status;
    }

    return null;
  }

  function getAdminNote(match: Match) {
    return match.score_admin_note || match.admin_note || match.refusal_reason || null;
  }

  function getPlayerDisplayName(id?: string | null) {
    if (!id) {
      return null;
    }

    const loadedPlayer = playerById.get(id);

    return loadedPlayer?.ea_name || loadedPlayer?.name || null;
  }

  function getRegistrationDisplayName(id?: string | null) {
    if (!id) {
      return null;
    }

    const registration = registrationById.get(id);

    if (!registration) {
      return null;
    }

    const registrationPlayer = playerById.get(registration.player_id);

    return (
      registrationPlayer?.ea_name ||
      registrationPlayer?.name ||
      registration.ea_team_name ||
      null
    );
  }

  function getSideName(match: Match, side: "home" | "away") {
    if (side === "home") {
      return (
        teamById.get(match.home_team_id || "")?.name ||
        getPlayerDisplayName(match.home_player_id) ||
        getPlayerDisplayName(match.player1_id) ||
        getRegistrationDisplayName(match.home_competition_player_id) ||
        String(match.home_team_name || match.home_name || match.home_player_name || "") ||
        "Domicile"
      );
    }

    return (
      teamById.get(match.away_team_id || "")?.name ||
      getPlayerDisplayName(match.away_player_id) ||
      getPlayerDisplayName(match.player2_id) ||
      getRegistrationDisplayName(match.away_competition_player_id) ||
      String(match.away_team_name || match.away_name || match.away_player_name || "") ||
      "Extérieur"
    );
  }

  function resetScoreForm() {
    setOpenScoreMatchId(null);
    setScoreHome("");
    setScoreAway("");
    setSubmittingMatchId(null);
  }

  function openScoreForm(match: Match) {
    setOpenScoreMatchId(match.id);
    setScoreHome(
      match.submitted_home_score !== null &&
        match.submitted_home_score !== undefined
        ? String(match.submitted_home_score)
        : ""
    );
    setScoreAway(
      match.submitted_away_score !== null &&
        match.submitted_away_score !== undefined
        ? String(match.submitted_away_score)
        : ""
    );
    setMessage(null);
  }

  async function submitScore(matchId: string) {
    if (!userId) {
      setMessage("Session introuvable. Merci de te reconnecter.");
      return;
    }

    const parsedHome = Number(scoreHome);
    const parsedAway = Number(scoreAway);

    if (
      scoreHome.trim() === "" ||
      scoreAway.trim() === "" ||
      Number.isNaN(parsedHome) ||
      Number.isNaN(parsedAway) ||
      parsedHome < 0 ||
      parsedAway < 0
    ) {
      setMessage("Merci de renseigner un score valide.");
      return;
    }

    setSubmittingMatchId(matchId);
    setMessage(null);

    const payload = {
      submitted_home_score: parsedHome,
      submitted_away_score: parsedAway,
      score_submitted_by: userId,
      score_submitted_at: new Date().toISOString(),
      score_status: "pending" as ScoreStatus,
      score_admin_note: null,
    };

    const { error } = await supabase.from("matches").update(payload).eq("id", matchId);

    if (error) {
      console.error(error);
      setMessage("Erreur lors de l'envoi du score.");
      setSubmittingMatchId(null);
      return;
    }

    setMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.id === matchId
          ? {
              ...match,
              ...payload,
            }
          : match
      )
    );

    setMessage("Score proposé. Il est maintenant en attente de validation.");
    resetScoreForm();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07000d] px-4 py-10 text-[#fff2c6]">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-yellow-700/30 bg-[#140711] p-8 text-center shadow-2xl shadow-black/40">
            <p className="text-lg font-black text-yellow-100">
              Chargement de ton espace membre...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07000d] px-4 py-8 text-[#fff2c6]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-yellow-700/35 bg-gradient-to-br from-[#21070b] via-[#12040d] to-black p-6 shadow-2xl shadow-black/50">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-yellow-400">
                Guardian&apos;s Family
              </p>

              <h1 className="mt-2 text-3xl font-black text-yellow-100 drop-shadow md:text-5xl">
                Espace membre
              </h1>

              <p className="mt-3 max-w-2xl text-sm text-yellow-100/75 md:text-base">
                Retrouve tes compétitions, tes matchs à jouer et le statut de
                validation des scores proposés.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/membre/profil"
                className="rounded-xl border border-yellow-400/50 bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-lg shadow-yellow-950/30 transition hover:bg-yellow-300"
              >
                Modifier mon profil
              </Link>

              <Link
                href="/classement"
                className="rounded-xl border border-red-500/40 bg-red-700 px-4 py-2 text-sm font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-red-600"
              >
                Voir le classement
              </Link>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm font-black text-yellow-200 shadow-lg shadow-black/30">
            {message}
          </div>
        )}

        <section className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <div className="rounded-3xl border border-yellow-700/30 bg-[#140711] p-4 shadow-2xl shadow-black/50">
            <FutCard profile={safeProfile} {...safeProfile} />
          </div>

          <div className="flex flex-col gap-8">
            <section className="rounded-3xl border border-yellow-700/30 bg-[#140711] p-5 shadow-2xl shadow-black/40">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-yellow-100">
                    Mes compétitions
                  </h2>
                  <p className="mt-1 text-sm text-yellow-100/60">
                    Les compétitions où ton inscription est enregistrée.
                  </p>
                </div>

                <span className="rounded-full border border-yellow-500/30 bg-black/40 px-3 py-1 text-sm font-black text-yellow-200">
                  {competitions.length}
                </span>
              </div>

              {competitions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-yellow-700/30 bg-black/25 p-5 text-sm text-yellow-100/55">
                  Aucune compétition trouvée pour le moment.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {competitions.map((competition) => {
                    const registration = registrations.find(
                      (item) => item.competition_id === competition.id
                    );

                    return (
                      <div
                        key={competition.id}
                        className="rounded-2xl border border-yellow-700/25 bg-black/30 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-black text-yellow-100">
                              {competition.title || competition.name || "Compétition"}
                            </h3>

                            <div className="mt-2 space-y-1 text-sm text-yellow-100/65">
                              {competition.season && (
                                <p>
                                  Saison :{" "}
                                  <span className="font-black text-yellow-200">
                                    {competition.season}
                                  </span>
                                </p>
                              )}

                              {registration?.ea_team_name && (
                                <p>
                                  Équipe EA FC :{" "}
                                  <span className="font-black text-yellow-200">
                                    {registration.ea_team_name}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>

                          {competition.status && (
                            <span className="rounded-full border border-red-500/35 bg-red-500/15 px-2 py-1 text-[11px] font-black uppercase text-red-200">
                              {competition.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-yellow-700/30 bg-[#140711] p-5 shadow-2xl shadow-black/40">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-yellow-100">
                    Mes matchs à jouer
                  </h2>
                  <p className="mt-1 text-sm text-yellow-100/60">
                    Propose ton score après ton match. Il passera ensuite en
                    validation admin.
                  </p>
                </div>

                <span className="rounded-full border border-yellow-500/30 bg-black/40 px-3 py-1 text-sm font-black text-yellow-200">
                  {matchesToPlay.length}
                </span>
              </div>

              {matchesToPlay.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-yellow-700/30 bg-black/25 p-5 text-sm text-yellow-100/55">
                  Aucun match à jouer pour le moment.
                </div>
              ) : (
                <div className="grid gap-4">
                  {matchesToPlay.map((match) => {
                    const scoreStatus = getScoreStatus(match);
                    const adminNote = getAdminNote(match);
                    const isFormOpen = openScoreMatchId === match.id;
                    const isSubmitting = submittingMatchId === match.id;

                    return (
                      <article
                        key={match.id}
                        className="rounded-3xl border border-yellow-700/25 bg-black/30 p-5 shadow-xl shadow-black/30"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">
                              {getCompetitionName(match)}
                            </p>

                            <h3 className="mt-2 text-xl font-black text-yellow-100">
                              {getSideName(match, "home")}{" "}
                              <span className="text-red-300/70">vs</span>{" "}
                              {getSideName(match, "away")}
                            </h3>

                            <p className="mt-2 text-sm text-yellow-100/55">
                              {getMatchDate(match)}
                            </p>
                          </div>

                          <ScoreStatusBadge status={scoreStatus} />
                        </div>

                        {match.submitted_home_score !== null &&
                          match.submitted_home_score !== undefined &&
                          match.submitted_away_score !== null &&
                          match.submitted_away_score !== undefined && (
                            <div className="mt-4 rounded-2xl border border-yellow-700/25 bg-[#21070b]/60 p-4">
                              <p className="text-sm text-yellow-100/60">
                                Score proposé
                              </p>

                              <p className="mt-1 text-3xl font-black text-yellow-100">
                                {match.submitted_home_score} -{" "}
                                {match.submitted_away_score}
                              </p>

                              {match.score_submitted_at && (
                                <p className="mt-2 text-xs text-yellow-100/45">
                                  Envoyé le{" "}
                                  {new Intl.DateTimeFormat("fr-FR", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }).format(new Date(match.score_submitted_at))}
                                </p>
                              )}
                            </div>
                          )}

                        {scoreStatus === "refused" && adminNote && (
                          <div className="mt-4 rounded-2xl border border-red-500/35 bg-red-500/10 p-4 text-sm text-red-200">
                            <span className="font-black">Motif du refus : </span>
                            {adminNote}
                          </div>
                        )}

                        {scoreStatus !== "validated" && (
                          <div className="mt-5">
                            {!isFormOpen ? (
                              <button
                                type="button"
                                onClick={() => openScoreForm(match)}
                                className="rounded-xl border border-yellow-400/50 bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-lg shadow-yellow-950/30 transition hover:bg-yellow-300"
                              >
                                {scoreStatus === "pending"
                                  ? "Modifier le score proposé"
                                  : scoreStatus === "refused"
                                  ? "Proposer un nouveau score"
                                  : "Proposer le score"}
                              </button>
                            ) : (
                              <div className="rounded-2xl border border-yellow-700/25 bg-black/35 p-4">
                                <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
                                  <label className="block">
                                    <span className="mb-2 block text-sm font-black text-yellow-100/80">
                                      {getSideName(match, "home")}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={scoreHome}
                                      onChange={(event) =>
                                        setScoreHome(event.target.value)
                                      }
                                      className="w-full rounded-xl border border-yellow-700/35 bg-[#07000d] px-4 py-3 text-center text-2xl font-black text-yellow-100 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                                    />
                                  </label>

                                  <div className="hidden pb-3 text-2xl font-black text-red-300/80 md:block">
                                    -
                                  </div>

                                  <label className="block">
                                    <span className="mb-2 block text-sm font-black text-yellow-100/80">
                                      {getSideName(match, "away")}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={scoreAway}
                                      onChange={(event) =>
                                        setScoreAway(event.target.value)
                                      }
                                      className="w-full rounded-xl border border-yellow-700/35 bg-[#07000d] px-4 py-3 text-center text-2xl font-black text-yellow-100 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                                    />
                                  </label>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-3">
                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => submitScore(match.id)}
                                    className="rounded-xl border border-green-400/40 bg-green-500 px-4 py-2 text-sm font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isSubmitting
                                      ? "Envoi en cours..."
                                      : "Envoyer le score"}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={resetScoreForm}
                                    className="rounded-xl border border-red-500/40 bg-red-700 px-4 py-2 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-yellow-700/30 bg-[#140711] p-5 shadow-2xl shadow-black/40">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-yellow-100">
                    Matchs terminés
                  </h2>
                  <p className="mt-1 text-sm text-yellow-100/60">
                    Les scores validés ou déjà renseignés.
                  </p>
                </div>

                <span className="rounded-full border border-yellow-500/30 bg-black/40 px-3 py-1 text-sm font-black text-yellow-200">
                  {finishedMatches.length}
                </span>
              </div>

              {finishedMatches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-yellow-700/30 bg-black/25 p-5 text-sm text-yellow-100/55">
                  Aucun match terminé pour le moment.
                </div>
              ) : (
                <div className="grid gap-4">
                  {finishedMatches.map((match) => {
                    const scoreStatus = getScoreStatus(match);
                    const finalHomeScore = getFinalHomeScore(match);
                    const finalAwayScore = getFinalAwayScore(match);

                    return (
                      <article
                        key={match.id}
                        className="rounded-3xl border border-yellow-700/25 bg-black/30 p-5 shadow-xl shadow-black/30"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">
                              {getCompetitionName(match)}
                            </p>

                            <h3 className="mt-2 text-xl font-black text-yellow-100">
                              {getSideName(match, "home")}{" "}
                              <span className="text-red-300/70">vs</span>{" "}
                              {getSideName(match, "away")}
                            </h3>

                            <p className="mt-2 text-sm text-yellow-100/55">
                              {getMatchDate(match)}
                            </p>
                          </div>

                          <ScoreStatusBadge status={scoreStatus || "validated"} />
                        </div>

                        <div className="mt-4 rounded-2xl border border-yellow-700/25 bg-[#21070b]/60 p-4">
                          <p className="text-sm text-yellow-100/60">
                            Score final
                          </p>

                          <p className="mt-1 text-3xl font-black text-yellow-100">
                            {finalHomeScore} - {finalAwayScore}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
