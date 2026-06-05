"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canManageScores, type AppRole } from "@/lib/roles";

type Profile = {
  id: string;
  role: AppRole;
};

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
  user_id: string | null;
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
  created_at?: string | null;

  submitted_home_score: number | null;
  submitted_away_score: number | null;
  score_submitted_by: string | null;
  score_submitted_at: string | null;
  score_status: "none" | "pending" | "validated" | "refused" | "rejected" | string | null;
};

type ScoreForm = {
  home: string;
  away: string;
};

type MatchFilter = "all" | "upcoming" | "completed" | "pending";

export default function CompetitionMatchesPage() {
  const params = useParams<{ id: string }>();
  const competitionId = params.id;

  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitionPlayers, setCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [adminScoreForms, setAdminScoreForms] = useState<
    Record<string, ScoreForm>
  >({});
  const [memberScoreForms, setMemberScoreForms] = useState<
    Record<string, ScoreForm>
  >({});

  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);

  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(
    null
  );
  const [reviewingMatchId, setReviewingMatchId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const isAdmin = canManageScores(profile?.role);

  async function getAccessToken() {
    const sessionResult = await supabase.auth.getSession();
    return sessionResult.data.session?.access_token ?? null;
  }

  async function loadData() {
    if (!competitionId) return;

    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let loadedProfile: Profile | null = null;
    let loadedCurrentPlayer: Player | null = null;

    if (user) {
      const profileResult = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileResult.error && profileResult.data) {
        loadedProfile = profileResult.data as Profile;
      }

      const currentPlayerResult = await supabase
        .from("players")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!currentPlayerResult.error && currentPlayerResult.data) {
        loadedCurrentPlayer = currentPlayerResult.data as Player;
      }
    }

    const competitionResult = await supabase
      .from("competitions")
      .select("*")
      .eq("id", competitionId)
      .maybeSingle();

    if (competitionResult.error) {
      setMessage(`Erreur compétition : ${competitionResult.error.message}`);
      setLoading(false);
      return;
    }

    if (!competitionResult.data) {
      setMessage(`Compétition introuvable. ID reçu : ${competitionId}`);
      setLoading(false);
      return;
    }

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
        .select("id, name")
        .in("id", teamIds);

      if (!teamsResult.error) {
        loadedTeams = (teamsResult.data ?? []) as Team[];
      }
    }

    const nextAdminScoreForms: Record<string, ScoreForm> = {};
    const nextMemberScoreForms: Record<string, ScoreForm> = {};

    for (const match of loadedMatches) {
      nextAdminScoreForms[match.id] = {
        home: match.home_score !== null ? String(match.home_score) : "",
        away: match.away_score !== null ? String(match.away_score) : "",
      };

      nextMemberScoreForms[match.id] = {
        home:
          match.submitted_home_score !== null
            ? String(match.submitted_home_score)
            : "",
        away:
          match.submitted_away_score !== null
            ? String(match.submitted_away_score)
            : "",
      };
    }

    setProfile(loadedProfile);
    setCurrentPlayer(loadedCurrentPlayer);
    setCompetition(competitionResult.data as Competition);
    setMatches(loadedMatches);
    setCompetitionPlayers(loadedCompetitionPlayers);
    setPlayers(loadedPlayers);
    setTeams(loadedTeams);
    setAdminScoreForms(nextAdminScoreForms);
    setMemberScoreForms(nextMemberScoreForms);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  const upcomingMatches = useMemo(() => {
    return matches.filter((match) => match.status !== "completed");
  }, [matches]);

  const completedMatches = useMemo(() => {
    return matches.filter((match) => match.status === "completed");
  }, [matches]);

  const pendingScoreMatches = useMemo(() => {
    return matches.filter((match) => match.score_status === "pending");
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (matchFilter === "upcoming") return upcomingMatches;
    if (matchFilter === "completed") return completedMatches;
    if (matchFilter === "pending") return pendingScoreMatches;

    return matches;
  }, [matchFilter, matches, upcomingMatches, completedMatches, pendingScoreMatches]);

  const openMatch = useMemo(() => {
    return matches.find((match) => match.id === openMatchId) ?? null;
  }, [matches, openMatchId]);

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

      const playerName = player?.name || player?.ea_name || "Joueur";
      const eaTeamName = registration.ea_team_name || "Équipe EA FC";

      return {
        title: playerName,
        subtitle: eaTeamName,
      };
    }

    const team = getTeam(teamId);

    if (team) {
      return {
        title: team.name,
        subtitle: "Team esport",
      };
    }

    return {
      title: "À définir",
      subtitle: "Participant inconnu",
    };
  }

  function getHomeLabel(match: Match) {
    return getParticipantLabel({
      competitionPlayerId: match.home_competition_player_id,
      teamId: match.home_team_id,
    });
  }

  function getAwayLabel(match: Match) {
    return getParticipantLabel({
      competitionPlayerId: match.away_competition_player_id,
      teamId: match.away_team_id,
    });
  }

  function isCurrentUserParticipant(match: Match) {
    if (!currentPlayer) return false;

    const homeRegistration = getCompetitionPlayer(
      match.home_competition_player_id
    );
    const awayRegistration = getCompetitionPlayer(
      match.away_competition_player_id
    );

    return (
      homeRegistration?.player_id === currentPlayer.id ||
      awayRegistration?.player_id === currentPlayer.id
    );
  }

  function formatDate(value: string | null) {
    if (!value) return "À planifier";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Date invalide";

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatSubmittedAt(value: string | null) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
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
      return "border-green-400/40 bg-green-500/15 text-green-300";
    }

    if (status === "in_progress") {
      return "border-orange-400/40 bg-orange-500/15 text-orange-300";
    }

    if (status === "scheduled") {
      return "border-blue-400/40 bg-blue-500/15 text-blue-300";
    }

    return "border-[#D9A441]/30 bg-black/25 text-[#F2D27A]";
  }

  function getScoreStatusLabel(status: Match["score_status"]) {
    if (status === "pending") return "À valider";
    if (status === "validated") return "Validé";
    if (status === "refused" || status === "rejected") return "Refusé";

    return "Aucun";
  }

  function getScoreStatusClass(status: Match["score_status"]) {
    if (status === "pending") {
      return "border-orange-400/40 bg-orange-500/15 text-orange-300";
    }

    if (status === "validated") {
      return "border-green-400/40 bg-green-500/15 text-green-300";
    }

    if (status === "refused" || status === "rejected") {
      return "border-red-400/40 bg-red-500/15 text-red-300";
    }

    return "border-slate-400/30 bg-slate-500/10 text-slate-300";
  }

  function getScoreLabel(match: Match) {
    if (match.home_score !== null && match.away_score !== null) {
      return `${match.home_score} - ${match.away_score}`;
    }

    return "VS";
  }

  function updateAdminScoreForm(
    matchId: string,
    field: "home" | "away",
    value: string
  ) {
    const cleanValue = value.replace(/[^\d]/g, "");

    setAdminScoreForms((current) => ({
      ...current,
      [matchId]: {
        home: current[matchId]?.home ?? "",
        away: current[matchId]?.away ?? "",
        [field]: cleanValue,
      },
    }));
  }

  function updateMemberScoreForm(
    matchId: string,
    field: "home" | "away",
    value: string
  ) {
    const cleanValue = value.replace(/[^\d]/g, "");

    setMemberScoreForms((current) => ({
      ...current,
      [matchId]: {
        home: current[matchId]?.home ?? "",
        away: current[matchId]?.away ?? "",
        [field]: cleanValue,
      },
    }));
  }

  async function saveScore(match: Match) {
    if (!isAdmin) {
      setMessage("Action réservée aux admins.");
      return;
    }

    const form = adminScoreForms[match.id];

    if (!form || form.home === "" || form.away === "") {
      setMessage("Merci de renseigner les deux scores.");
      return;
    }

    const homeScore = Number(form.home);
    const awayScore = Number(form.away);

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      setMessage("Les scores doivent être des nombres entiers positifs.");
      return;
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return;
    }

    setSavingMatchId(match.id);
    setMessage("");

    const response = await fetch(`/api/admin/matches/${match.id}/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: "save",
        home_score: homeScore,
        away_score: awayScore,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setSavingMatchId(null);
      setMessage(result.error || "Erreur enregistrement score.");
      return;
    }

    setSavingMatchId(null);
    setMessage(result.message || "Score enregistré ✅");
    setOpenMatchId(null);

    await loadData();
  }

  async function resetScore(match: Match) {
    if (!isAdmin) {
      setMessage("Action réservée aux admins.");
      return;
    }

    const confirmed = window.confirm("Réinitialiser le score de ce match ?");

    if (!confirmed) return;

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return;
    }

    setSavingMatchId(match.id);
    setMessage("");

    const response = await fetch(`/api/admin/matches/${match.id}/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: "reset",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setSavingMatchId(null);
      setMessage(result.error || "Erreur réinitialisation score.");
      return;
    }

    setSavingMatchId(null);
    setMessage(result.message || "Score réinitialisé ✅");
    setOpenMatchId(null);

    await loadData();
  }

  async function submitMemberScore(match: Match) {
    if (!currentPlayer) {
      setMessage("Tu dois avoir une fiche joueur pour proposer un score.");
      return;
    }

    if (!isCurrentUserParticipant(match)) {
      setMessage("Tu ne participes pas à ce match.");
      return;
    }

    if (match.status === "completed") {
      setMessage("Ce match est déjà terminé.");
      return;
    }

    const form = memberScoreForms[match.id];

    if (!form || form.home === "" || form.away === "") {
      setMessage("Merci de renseigner les deux scores.");
      return;
    }

    const homeScore = Number(form.home);
    const awayScore = Number(form.away);

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      setMessage("Les scores doivent être des nombres entiers positifs.");
      return;
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session introuvable. Reconnecte-toi.");
      return;
    }

    setSubmittingMatchId(match.id);
    setMessage("");

    const response = await fetch(`/api/matches/${match.id}/submit-score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        homeScore,
        awayScore,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setSubmittingMatchId(null);
      setMessage(result.error || "Erreur proposition score.");
      return;
    }

    setSubmittingMatchId(null);
    setMessage(result.message || "Score proposé ✅");
    setOpenMatchId(null);

    await loadData();
  }

  async function reviewSubmittedScore(
    match: Match,
    action: "validate" | "reject"
  ) {
    if (!isAdmin) {
      setMessage("Action réservée aux admins.");
      return;
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return;
    }

    setReviewingMatchId(match.id);
    setMessage("");

    const response = await fetch(`/api/matches/${match.id}/review-score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setReviewingMatchId(null);
      setMessage(result.error || "Erreur validation score.");
      return;
    }

    setReviewingMatchId(null);
    setMessage(result.message || "Score traité ✅");
    setOpenMatchId(null);

    await loadData();
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
                  href={`/competitions/${competition.id}/classement`}
                  className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
                >
                  Classement
                </Link>
              </div>

              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#F2D27A]">
                Matchs de la compétition
              </p>

              <h1 className="mt-3 text-4xl font-black text-[#F7E9C5] md:text-5xl">
                {competitionLabel}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#D8C7A0]">
                Vue tableur des rencontres, résultats et actions de score.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <SummaryTile label="Matchs" value={matches.length} />
              <SummaryTile label="À venir" value={upcomingMatches.length} />
              <SummaryTile label="Terminés" value={completedMatches.length} />
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-6 rounded-2xl border border-[#D9A441]/30 bg-[#160A12] px-4 py-3 text-sm font-black text-[#F2D27A]">
            {message}
          </div>
        )}

        {isAdmin && (
          <div className="mt-6 rounded-2xl border border-green-400/25 bg-green-950/20 px-4 py-3 text-sm font-semibold text-green-300">
            Mode admin actif : utilise le bouton “Gérer” pour saisir, reset ou
            valider un score.
          </div>
        )}

        <section className="mt-8 rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#F7E9C5]">
                Liste des matchs
              </h2>

              <p className="mt-2 text-sm text-[#D8C7A0]">
                Affichage compact des matchs, scores et statuts.
              </p>
            </div>

            <div className="flex rounded-xl border border-[#D9A441]/25 bg-black p-1">
              <FilterButton
                active={matchFilter === "all"}
                onClick={() => setMatchFilter("all")}
              >
                Tous ({matches.length})
              </FilterButton>

              <FilterButton
                active={matchFilter === "upcoming"}
                onClick={() => setMatchFilter("upcoming")}
              >
                À venir ({upcomingMatches.length})
              </FilterButton>

              <FilterButton
                active={matchFilter === "completed"}
                onClick={() => setMatchFilter("completed")}
              >
                Terminés ({completedMatches.length})
              </FilterButton>

              <FilterButton
                active={matchFilter === "pending"}
                onClick={() => setMatchFilter("pending")}
              >
                À valider ({pendingScoreMatches.length})
              </FilterButton>
            </div>
          </div>

          {filteredMatches.length === 0 ? (
            <EmptyState text="Aucun match pour ce filtre." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#D9A441]/20 bg-black/20">
              <div className="max-h-[680px] overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[15%]" />
                    <col className="w-[22%]" />
                    <col className="w-[10%]" />
                    <col className="w-[22%]" />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                    <col className="w-[9%]" />
                  </colgroup>

                  <thead className="sticky top-0 z-10 bg-[#26070b] text-[10px] uppercase tracking-[0.18em] text-[#F2D27A]">
                    <tr>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Date
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Domicile
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center">
                        Score
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Extérieur
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Statut
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Proposition
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredMatches.map((match) => {
                      const home = getHomeLabel(match);
                      const away = getAwayLabel(match);
                      const canSubmit =
                        match.status !== "completed" &&
                        isCurrentUserParticipant(match);

                      return (
                        <tr
                          key={match.id}
                          className="border-b border-[#D9A441]/10 transition hover:bg-[#D9A441]/5"
                        >
                          <td className="px-4 py-4 text-[#D8C7A0]">
                            {formatDate(match.match_date)}
                          </td>

                          <td className="px-4 py-4">
                            <p className="truncate font-black text-[#F7E9C5]">
                              {home.title}
                            </p>
                            <p className="mt-1 truncate text-xs text-[#8F7B5C]">
                              {home.subtitle}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex min-w-14 items-center justify-center rounded-xl border border-[#D9A441]/30 bg-[#0B0610] px-3 py-2 text-sm font-black text-[#F2D27A]">
                              {getScoreLabel(match)}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <p className="truncate font-black text-[#F7E9C5]">
                              {away.title}
                            </p>
                            <p className="mt-1 truncate text-xs text-[#8F7B5C]">
                              {away.subtitle}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                                match.status
                              )}`}
                            >
                              {getStatusLabel(match.status)}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getScoreStatusClass(
                                match.score_status
                              )}`}
                            >
                              {getScoreStatusLabel(match.score_status)}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setOpenMatchId(match.id)}
                              className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
                            >
                              {isAdmin ? "Gérer" : canSubmit ? "Proposer" : "Voir"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </section>

      {openMatch && (
        <MatchModal
          match={openMatch}
          homeLabel={getHomeLabel(openMatch)}
          awayLabel={getAwayLabel(openMatch)}
          dateLabel={formatDate(openMatch.match_date)}
          scoreLabel={getScoreLabel(openMatch)}
          statusLabel={getStatusLabel(openMatch.status)}
          statusClass={getStatusClass(openMatch.status)}
          scoreStatusLabel={getScoreStatusLabel(openMatch.score_status)}
          scoreStatusClass={getScoreStatusClass(openMatch.score_status)}
          submittedAtLabel={formatSubmittedAt(openMatch.score_submitted_at)}
          isAdmin={isAdmin}
          canSubmitScore={
            openMatch.status !== "completed" &&
            isCurrentUserParticipant(openMatch)
          }
          canSeeSubmittedScore={
            isAdmin || isCurrentUserParticipant(openMatch)
          }
          adminScoreForm={
            adminScoreForms[openMatch.id] ?? { home: "", away: "" }
          }
          memberScoreForm={
            memberScoreForms[openMatch.id] ?? { home: "", away: "" }
          }
          saving={savingMatchId === openMatch.id}
          submitting={submittingMatchId === openMatch.id}
          reviewing={reviewingMatchId === openMatch.id}
          onClose={() => setOpenMatchId(null)}
          onAdminScoreChange={(field, value) =>
            updateAdminScoreForm(openMatch.id, field, value)
          }
          onMemberScoreChange={(field, value) =>
            updateMemberScoreForm(openMatch.id, field, value)
          }
          onSaveScore={() => saveScore(openMatch)}
          onResetScore={() => resetScore(openMatch)}
          onSubmitMemberScore={() => submitMemberScore(openMatch)}
          onValidateSubmittedScore={() =>
            reviewSubmittedScore(openMatch, "validate")
          }
          onRejectSubmittedScore={() =>
            reviewSubmittedScore(openMatch, "reject")
          }
        />
      )}
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/25 bg-black/30 px-5 py-4">
      <p className="text-2xl font-black text-[#F2D27A]">{value}</p>
      <p className="text-xs uppercase tracking-widest text-[#8F7B5C]">
        {label}
      </p>
    </div>
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
          ? "rounded-lg bg-[#F2C300] px-4 py-2 text-xs font-black text-black"
          : "rounded-lg px-4 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#160A12]"
      }
    >
      {children}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[#D9A441]/20 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
      {text}
    </p>
  );
}

function MatchModal({
  match,
  homeLabel,
  awayLabel,
  dateLabel,
  scoreLabel,
  statusLabel,
  statusClass,
  scoreStatusLabel,
  scoreStatusClass,
  submittedAtLabel,
  isAdmin,
  canSubmitScore,
  canSeeSubmittedScore,
  adminScoreForm,
  memberScoreForm,
  saving,
  submitting,
  reviewing,
  onClose,
  onAdminScoreChange,
  onMemberScoreChange,
  onSaveScore,
  onResetScore,
  onSubmitMemberScore,
  onValidateSubmittedScore,
  onRejectSubmittedScore,
}: {
  match: Match;
  homeLabel: { title: string; subtitle: string };
  awayLabel: { title: string; subtitle: string };
  dateLabel: string;
  scoreLabel: string;
  statusLabel: string;
  statusClass: string;
  scoreStatusLabel: string;
  scoreStatusClass: string;
  submittedAtLabel: string;
  isAdmin: boolean;
  canSubmitScore: boolean;
  canSeeSubmittedScore: boolean;
  adminScoreForm: ScoreForm;
  memberScoreForm: ScoreForm;
  saving: boolean;
  submitting: boolean;
  reviewing: boolean;
  onClose: () => void;
  onAdminScoreChange: (field: "home" | "away", value: string) => void;
  onMemberScoreChange: (field: "home" | "away", value: string) => void;
  onSaveScore: () => void;
  onResetScore: () => void;
  onSubmitMemberScore: () => void;
  onValidateSubmittedScore: () => void;
  onRejectSubmittedScore: () => void;
}) {
  const hasSubmittedScore =
    match.submitted_home_score !== null &&
    match.submitted_away_score !== null &&
    match.score_status !== "validated";

  const isPending = match.score_status === "pending";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-[#D9A441]/40 bg-[#140711] shadow-2xl shadow-black/70">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D9A441]/20 p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F2D27A]">
              Gestion du match
            </p>

            <h2 className="mt-3 text-3xl font-black text-[#F7E9C5]">
              {homeLabel.title} vs {awayLabel.title}
            </h2>

            <p className="mt-2 text-sm text-[#D8C7A0]">{dateLabel}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#D9A441]/35 px-4 py-2 text-sm font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
          >
            Fermer
          </button>
        </div>

        <div className="max-h-[calc(92vh-120px)] overflow-y-auto p-6">
          <div className="grid gap-5">
            <section className="rounded-2xl border border-[#D9A441]/20 bg-black/25 p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-green-300">
                    Domicile
                  </p>
                  <p className="mt-2 text-xl font-black text-[#F7E9C5]">
                    {homeLabel.title}
                  </p>
                  <p className="mt-1 text-sm text-[#8F7B5C]">
                    {homeLabel.subtitle}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#D9A441]/30 bg-[#0B0610] px-8 py-5 text-center">
                  <p className="text-3xl font-black text-[#F2D27A]">
                    {scoreLabel}
                  </p>
                </div>

                <div className="md:text-right">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                    Extérieur
                  </p>
                  <p className="mt-2 text-xl font-black text-[#F7E9C5]">
                    {awayLabel.title}
                  </p>
                  <p className="mt-1 text-sm text-[#8F7B5C]">
                    {awayLabel.subtitle}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${statusClass}`}
                >
                  {statusLabel}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${scoreStatusClass}`}
                >
                  Score : {scoreStatusLabel}
                </span>
              </div>
            </section>

            {isAdmin && (
              <section className="rounded-2xl border border-[#D9A441]/20 bg-black/25 p-5">
                <h3 className="text-lg font-black text-[#F7E9C5]">
                  Saisie score admin
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto_auto]">
                  <label>
                    <span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#F2D27A]">
                      Score domicile
                    </span>
                    <input
                      inputMode="numeric"
                      value={adminScoreForm.home}
                      onChange={(event) =>
                        onAdminScoreChange("home", event.target.value)
                      }
                      className="w-full rounded-xl border border-[#D9A441]/25 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none focus:border-[#D9A441]/70"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#F2D27A]">
                      Score extérieur
                    </span>
                    <input
                      inputMode="numeric"
                      value={adminScoreForm.away}
                      onChange={(event) =>
                        onAdminScoreChange("away", event.target.value)
                      }
                      className="w-full rounded-xl border border-[#D9A441]/25 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none focus:border-[#D9A441]/70"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={onSaveScore}
                    className="self-end rounded-xl bg-[#A61E22] px-5 py-3 text-sm font-black text-white transition hover:bg-[#8E171C] disabled:opacity-50"
                  >
                    {saving ? "..." : "Enregistrer"}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={onResetScore}
                    className="self-end rounded-xl border border-[#D9A441]/30 px-5 py-3 text-sm font-black text-[#F2D27A] transition hover:bg-[#0B0610] disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>
              </section>
            )}

            {canSubmitScore && (
              <section className="rounded-2xl border border-[#D9A441]/20 bg-black/25 p-5">
                <h3 className="text-lg font-black text-[#F7E9C5]">
                  Proposer un score
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                  <label>
                    <span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#F2D27A]">
                      Score domicile
                    </span>
                    <input
                      inputMode="numeric"
                      value={memberScoreForm.home}
                      onChange={(event) =>
                        onMemberScoreChange("home", event.target.value)
                      }
                      className="w-full rounded-xl border border-[#D9A441]/25 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none focus:border-[#D9A441]/70"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#F2D27A]">
                      Score extérieur
                    </span>
                    <input
                      inputMode="numeric"
                      value={memberScoreForm.away}
                      onChange={(event) =>
                        onMemberScoreChange("away", event.target.value)
                      }
                      className="w-full rounded-xl border border-[#D9A441]/25 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none focus:border-[#D9A441]/70"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={onSubmitMemberScore}
                    className="self-end rounded-xl bg-[#A61E22] px-5 py-3 text-sm font-black text-white transition hover:bg-[#8E171C] disabled:opacity-50"
                  >
                    {submitting ? "..." : "Proposer"}
                  </button>
                </div>
              </section>
            )}

            {hasSubmittedScore && canSeeSubmittedScore && (
              <section className="rounded-2xl border border-orange-400/25 bg-orange-950/10 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-orange-300">
                      Score proposé
                    </h3>

                    <p className="mt-2 text-2xl font-black text-[#F7E9C5]">
                      {match.submitted_home_score} -{" "}
                      {match.submitted_away_score}
                    </p>

                    {submittedAtLabel && (
                      <p className="mt-1 text-sm text-[#D8C7A0]">
                        Proposé le {submittedAtLabel}
                      </p>
                    )}
                  </div>

                  {isAdmin && isPending && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={reviewing}
                        onClick={onValidateSubmittedScore}
                        className="rounded-xl bg-green-700 px-5 py-3 text-sm font-black text-white transition hover:bg-green-600 disabled:opacity-50"
                      >
                        Valider
                      </button>

                      <button
                        type="button"
                        disabled={reviewing}
                        onClick={onRejectSubmittedScore}
                        className="rounded-xl border border-red-400/40 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        Refuser
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
