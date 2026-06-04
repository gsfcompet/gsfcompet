"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import FutMemberCard from "@/components/FutMemberCard";
import ScoreStatusBadge from "@/components/ScoreStatusBadge";
import MemberMatchesTable, {
  type MemberMatchTableRow,
} from "@/components/MemberMatchesTable";

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
  participant_type?: "teams" | "players" | null;
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
  const [allCompetitionPlayers, setAllCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
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
      setAllCompetitionPlayers([]);
      setAllCompetitionPlayers([]);
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

    const allCompetitionPlayersResult = await supabase
      .from("competition_players")
      .select("*")
      .in("competition_id", competitionIds);

    if (allCompetitionPlayersResult.error) {
      console.error(allCompetitionPlayersResult.error);
      setMessage(
        `Erreur participants compétitions : ${allCompetitionPlayersResult.error.message}`
      );
      setLoading(false);
      return;
    }

    const loadedAllCompetitionPlayers =
      (allCompetitionPlayersResult.data ?? []) as CompetitionPlayer[];

    setAllCompetitionPlayers(loadedAllCompetitionPlayers);

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

    const myRegistrationIds = loadedRegistrations
      .map((registration) => registration.id)
      .filter(Boolean);

    let loadedMatches: Match[] = [];

    if (myRegistrationIds.length > 0) {
      const registrationFilter = myRegistrationIds.join(",");

      const matchesResult = await supabase
        .from("matches")
        .select("*")
        .in("competition_id", competitionIds)
        .or(
          `home_competition_player_id.in.(${registrationFilter}),away_competition_player_id.in.(${registrationFilter})`
        )
        .order("match_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (matchesResult.error) {
        console.error(matchesResult.error);
        setMessage(`Erreur matchs : ${matchesResult.error.message}`);
        setMatches([]);
      } else {
        loadedMatches = ((matchesResult.data ?? []) as Match[]).sort((a, b) => {
          const dateA = new Date(
            a.match_date || a.date || a.created_at || "2099-01-01"
          ).getTime();

          const dateB = new Date(
            b.match_date || b.date || b.created_at || "2099-01-01"
          ).getTime();

          return dateA - dateB;
        });

        setMatches(loadedMatches);

        const matchRegistrationIds = Array.from(
          new Set(
            loadedMatches
              .flatMap((match) => [
                match.home_competition_player_id,
                match.away_competition_player_id,
              ])
              .filter(Boolean) as string[]
          )
        );

        let loadedMatchRegistrations: CompetitionPlayer[] = [];

        if (matchRegistrationIds.length > 0) {
          const matchRegistrationsResult = await supabase
            .from("competition_players")
            .select("*")
            .in("id", matchRegistrationIds);

          if (matchRegistrationsResult.error) {
            console.warn(
              "Chargement participants des matchs impossible :",
              matchRegistrationsResult.error
            );
          } else {
            loadedMatchRegistrations =
              (matchRegistrationsResult.data ?? []) as CompetitionPlayer[];
          }
        }

        setAllCompetitionPlayers(loadedMatchRegistrations);

        await loadRelatedData(
          loadedMatches,
          loadedMatchRegistrations,
          loadedPlayer
        );
      }
    } else {
      setMatches([]);
      setAllCompetitionPlayers([]);
      setPlayers([loadedPlayer]);
      setTeams([]);
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

  const memberStats = useMemo(() => {
    const stats = {
      mj: 0,
      v: 0,
      n: 0,
      p: 0,
      bp: 0,
      bc: 0,
      ga: 0,
      pts: 0,
    };

    if (!player?.id) {
      return stats;
    }

    const myRegistrationIds = registrations
      .filter((registration) => registration.player_id === player.id)
      .map((registration) => registration.id);

    if (myRegistrationIds.length === 0) {
      return stats;
    }

    matches.forEach((match) => {
      const homeScoreRaw = match.home_score ?? match.score_home;
      const awayScoreRaw = match.away_score ?? match.score_away;

      if (
        homeScoreRaw === null ||
        homeScoreRaw === undefined ||
        awayScoreRaw === null ||
        awayScoreRaw === undefined
      ) {
        return;
      }

      const homeScore = Number(homeScoreRaw);
      const awayScore = Number(awayScoreRaw);

      if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
        return;
      }

      const isHome =
        typeof match.home_competition_player_id === "string" &&
        myRegistrationIds.includes(match.home_competition_player_id);

      const isAway =
        typeof match.away_competition_player_id === "string" &&
        myRegistrationIds.includes(match.away_competition_player_id);

      if (!isHome && !isAway) {
        return;
      }

      const goalsFor = isHome ? homeScore : awayScore;
      const goalsAgainst = isHome ? awayScore : homeScore;

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
  }, [matches, player, registrations]);

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
      mj: memberStats.mj,
      v: memberStats.v,
      n: memberStats.n,
      p: memberStats.p,
      bp: memberStats.bp,
      bc: memberStats.bc,
      ga: memberStats.ga,
      pts: memberStats.pts,
    };
  }, [profile, player, registrations, eaTeams, memberStats]);

  const personalCompetitions = useMemo(() => {
    return competitions.filter((competition) => {
      return (competition.participant_type || "players") === "players";
    });
  }, [competitions]);

  const teamById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  const playerById = useMemo(() => {
    return new Map(players.map((loadedPlayer) => [loadedPlayer.id, loadedPlayer]));
  }, [players]);

  const registrationById = useMemo(() => {
    return new Map(
      allCompetitionPlayers.map((registration) => [
        registration.id,
        registration,
      ])
    );
  }, [allCompetitionPlayers]);

  const registrationByPlayerId = useMemo(() => {
    return new Map(
      allCompetitionPlayers.map((registration) => [
        registration.player_id,
        registration,
      ])
    );
  }, [allCompetitionPlayers]);

  const memberMatches = useMemo(() => {
    return matches.filter((match) => isMatchForCurrentPlayer(match));
  }, [matches, player, registrations]);

  const matchesToPlay = useMemo(() => {
    return memberMatches.filter((match) => !hasFinalScore(match));
  }, [memberMatches]);

  const finishedMatches = useMemo(() => {
    return memberMatches.filter((match) => hasFinalScore(match));
  }, [memberMatches]);

  const matchesToPlayRows = useMemo<MemberMatchTableRow[]>(() => {
    return matchesToPlay.map((match) => {
      const scoreStatus = getScoreStatus(match);
      const isFormOpen = openScoreMatchId === match.id;
      const isSubmitting = submittingMatchId === match.id;

      const actionLabel =
        scoreStatus === "pending"
          ? "Modifier"
          : scoreStatus === "refused"
          ? "Reproposer"
          : "Proposer";

      return {
        id: match.id,
        competition: getCompetitionName(match),
        date: getMatchDate(match),
        homeName: getSideName(match, "home"),
        awayName: getSideName(match, "away"),
        scoreLabel:
          match.submitted_home_score !== null &&
          match.submitted_home_score !== undefined &&
          match.submitted_away_score !== null &&
          match.submitted_away_score !== undefined
            ? `${match.submitted_home_score} - ${match.submitted_away_score}`
            : "VS",
        scoreStatus,
        actionNode: (
          <button
            type="button"
            onClick={() => openScoreForm(match)}
            className="rounded-lg border border-yellow-400/50 bg-yellow-400 px-3 py-2 text-xs font-black text-black shadow-lg shadow-yellow-950/30 transition hover:bg-yellow-300"
          >
            {actionLabel}
          </button>
        ),
        expandedNode: isFormOpen ? (
          <div className="rounded-2xl border border-yellow-700/25 bg-[#07000d] p-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-yellow-100/70">
                  {getSideName(match, "home")}
                </span>

                <input
                  type="number"
                  min="0"
                  value={scoreHome}
                  onChange={(event) => setScoreHome(event.target.value)}
                  className="w-full rounded-xl border border-yellow-700/35 bg-black px-4 py-3 text-center text-xl font-black text-yellow-100 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                  placeholder="0"
                />
              </label>

              <div className="hidden pb-3 text-2xl font-black text-red-300/80 md:block">
                -
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-yellow-100/70">
                  {getSideName(match, "away")}
                </span>

                <input
                  type="number"
                  min="0"
                  value={scoreAway}
                  onChange={(event) => setScoreAway(event.target.value)}
                  className="w-full rounded-xl border border-yellow-700/35 bg-black px-4 py-3 text-center text-xl font-black text-yellow-100 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                  placeholder="0"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => submitScore(match.id)}
                  className="rounded-xl border border-green-400/40 bg-green-500 px-4 py-3 text-xs font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Envoi..." : "Envoyer"}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={resetScoreForm}
                  className="rounded-xl border border-red-500/40 bg-red-700 px-4 py-3 text-xs font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        ) : null,
      };
    });
  }, [
    matchesToPlay,
    competitions,
    teams,
    players,
    allCompetitionPlayers,
    openScoreMatchId,
    scoreHome,
    scoreAway,
    submittingMatchId,
  ]);

  const finishedMatchRows = useMemo<MemberMatchTableRow[]>(() => {
    return finishedMatches.map((match) => {
      const finalHomeScore = getFinalHomeScore(match);
      const finalAwayScore = getFinalAwayScore(match);

      return {
        id: match.id,
        competition: getCompetitionName(match),
        date: getMatchDate(match),
        homeName: getSideName(match, "home"),
        awayName: getSideName(match, "away"),
        scoreLabel: `${finalHomeScore ?? "-"} - ${finalAwayScore ?? "-"}`,
        scoreStatus: getScoreStatus(match) || "validated",
      };
    });
  }, [finishedMatches, competitions, teams, players, allCompetitionPlayers]);

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

  function isTeamOnlyMatch(match: Match) {
    const hasTeamIds = Boolean(match.home_team_id || match.away_team_id);

    const hasCompetitionPlayerIds = Boolean(
      match.home_competition_player_id || match.away_competition_player_id
    );

    const hasDirectPlayerIds = Boolean(
      match.home_player_id ||
        match.away_player_id ||
        match.player1_id ||
        match.player2_id
    );

    return hasTeamIds && !hasCompetitionPlayerIds && !hasDirectPlayerIds;
  }

  function isMatchForCurrentPlayer(match: Match) {
    if (!player?.id) {
      return false;
    }

    if (isTeamOnlyMatch(match)) {
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

    return false;
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

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;

    if (!accessToken) {
      setMessage("Session introuvable. Merci de te reconnecter.");
      return;
    }

    setSubmittingMatchId(matchId);
    setMessage(null);

    const response = await fetch(`/api/matches/${matchId}/submit-score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        homeScore: parsedHome,
        awayScore: parsedAway,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Erreur lors de l'envoi du score.");
      setSubmittingMatchId(null);
      return;
    }

    setMessage(result.message || "Score proposé. Il est maintenant en attente de validation.");
    resetScoreForm();

    await loadMemberData();
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
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8">
        <section className="w-full rounded-[28px] border border-yellow-700/30 bg-gradient-to-br from-[#21070b] via-[#12040d] to-black p-6 shadow-2xl shadow-black/50">
          <div className="flex min-h-[92px] flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
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
                className="rounded-xl border border-yellow-400/50 bg-yellow-400 px-5 py-3 text-sm font-black text-black shadow-lg shadow-yellow-950/30 transition hover:bg-yellow-300"
              >
                Modifier mon profil
              </Link>

              <Link
                href="/classement"
                className="rounded-xl border border-red-500/40 bg-red-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-red-600"
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

        <section className="grid w-full items-start gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="w-full self-start rounded-[28px] border border-yellow-700/30 bg-[#140711]/95 p-4 shadow-2xl shadow-black/50">
            <FutCard profile={safeProfile} {...safeProfile} />
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <section className="rounded-[28px] border border-yellow-700/30 bg-[#140711]/95 p-5 shadow-2xl shadow-black/40">
              <div className="mb-5 flex min-h-[58px] items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-yellow-100">
                    Mes compétitions
                  </h2>
                  <p className="mt-1 text-sm text-yellow-100/60">
                    Les compétitions où ton inscription est enregistrée.
                  </p>
                </div>

                <span className="flex h-9 min-w-9 items-center justify-center rounded-full border border-yellow-500/40 bg-black/40 px-3 text-sm font-black text-yellow-200 shadow-inner shadow-yellow-950/30">
                  {personalCompetitions.length}
                </span>
              </div>

              {personalCompetitions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-yellow-700/30 bg-black/25 p-5 text-sm text-yellow-100/55">
                  Aucune compétition trouvée pour le moment.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {personalCompetitions.map((competition) => {
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

            <MemberMatchesTable
              title="Mes matchs à jouer"
              description="Tes prochains matchs dans un affichage compact."
              count={matchesToPlay.length}
              rows={matchesToPlayRows}
              emptyText="Aucun match à jouer pour le moment."
            />

            <MemberMatchesTable
              title="Matchs terminés"
              description="Tes résultats validés ou déjà renseignés."
              count={finishedMatches.length}
              rows={finishedMatchRows}
              emptyText="Aucun match terminé pour le moment."
            />
          </div>
        </section>
      </div>
    </main>
  );
}
