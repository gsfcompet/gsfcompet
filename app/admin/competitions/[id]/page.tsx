"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminCompetitionParticipantsManager from "@/components/AdminCompetitionParticipantsManager";
import AdminCompetitionTeamsManager from "@/components/AdminCompetitionTeamsManager";
import AdminMatchesScheduler from "@/components/AdminMatchesScheduler";
import AdminCompetitionMatchesTable, {
  type AdminCompetitionMatchTableRow,
} from "@/components/AdminCompetitionMatchesTable";
import {
  canManageCompetitions,
  canManageScores,
  canManageTeams,
  type AppRole,
} from "@/lib/roles";

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

type Team = {
  id: string;
  name: string;
  manager: string | null;
};

type CompetitionTeam = {
  id: string;
  competition_id: string;
  team_id: string;
};

type Player = {
  id: string;
  user_id: string | null;
  name: string;
  ea_name: string | null;
  platform: string | null;
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
  score_submitted_by: string | null;
  score_submitted_at: string | null;
  score_status: string | null;
};

type ParticipantLabel = {
  title: string;
  subtitle: string;
};

type ScoreForm = {
  home: string;
  away: string;
};

type AdminMatchFilter =
  | "all"
  | "planned"
  | "scheduled"
  | "completed"
  | "pending";

export default function AdminCompetitionPage() {
  const params = useParams<{ id: string }>();
  const competitionId = params.id;

  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);

  const [competitionPlayers, setCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>(
    []
  );

  const [scoreForms, setScoreForms] = useState<Record<string, ScoreForm>>({});
  const [dateForms, setDateForms] = useState<Record<string, string>>({});
  const [matchFilter, setMatchFilter] = useState<AdminMatchFilter>("all");
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reviewingMatchId, setReviewingMatchId] = useState<string | null>(null);
  const [savingScoreMatchId, setSavingScoreMatchId] = useState<string | null>(
    null
  );
  const [resettingMatchId, setResettingMatchId] = useState<string | null>(null);
  const [savingDateMatchId, setSavingDateMatchId] = useState<string | null>(
    null
  );

  const isAdmin = canManageCompetitions(profile?.role);

  const pendingScoreMatches = useMemo(() => {
    return matches.filter((match) => match.score_status === "pending");
  }, [matches]);

  const plannedMatches = useMemo(() => {
    return matches.filter((match) => match.status !== "completed");
  }, [matches]);

  const onlyPlannedMatches = useMemo(() => {
    return matches.filter((match) => match.status === "planned");
  }, [matches]);

  const scheduledMatches = useMemo(() => {
    return matches.filter((match) => match.status === "scheduled");
  }, [matches]);

  const completedMatches = useMemo(() => {
    return matches.filter((match) => match.status === "completed");
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (matchFilter === "planned") return onlyPlannedMatches;
    if (matchFilter === "scheduled") return scheduledMatches;
    if (matchFilter === "completed") return completedMatches;
    if (matchFilter === "pending") return pendingScoreMatches;
    return matches;
  }, [
    matchFilter,
    matches,
    onlyPlannedMatches,
    scheduledMatches,
    completedMatches,
    pendingScoreMatches,
  ]);

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
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const profileResult = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error || !profileResult.data) {
      setMessage("Profil introuvable.");
      setLoading(false);
      return;
    }

    const loadedProfile = profileResult.data as Profile;
    setProfile(loadedProfile);

    if (
      !canManageCompetitions(loadedProfile.role) &&
      !canManageScores(loadedProfile.role) &&
      !canManageTeams(loadedProfile.role)
    ) {
      setLoading(false);
      return;
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
      setMessage("Compétition introuvable.");
      setLoading(false);
      return;
    }

    const competitionPlayersResult = await supabase
      .from("competition_players")
      .select("*")
      .eq("competition_id", competitionId)
      .order("created_at", { ascending: true });

    if (competitionPlayersResult.error) {
      setMessage(
        `Erreur participants : ${competitionPlayersResult.error.message}`
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

    const teamsResult = await supabase
      .from("teams")
      .select("id, name, manager")
      .order("name", { ascending: true });

    if (teamsResult.error) {
      setMessage(`Erreur teams : ${teamsResult.error.message}`);
      setLoading(false);
      return;
    }

    const competitionTeamsResult = await supabase
      .from("competition_teams")
      .select("id, competition_id, team_id")
      .eq("competition_id", competitionId)
      .order("created_at", { ascending: true });

    if (competitionTeamsResult.error) {
      setMessage(
        `Erreur teams compétition : ${competitionTeamsResult.error.message}`
      );
      setLoading(false);
      return;
    }

    const loadedMatches = (matchesResult.data ?? []) as Match[];

    const nextScoreForms: Record<string, ScoreForm> = {};
    const nextDateForms: Record<string, string> = {};

    for (const match of loadedMatches) {
      nextScoreForms[match.id] = {
        home: match.home_score !== null ? String(match.home_score) : "",
        away: match.away_score !== null ? String(match.away_score) : "",
      };

      nextDateForms[match.id] = toDateTimeLocalValue(match.match_date);
    }

    setCompetition(competitionResult.data as Competition);
    setCompetitionPlayers(loadedCompetitionPlayers);
    setPlayers(loadedPlayers);
    setMatches(loadedMatches);
    setTeams((teamsResult.data ?? []) as Team[]);
    setCompetitionTeams(
      (competitionTeamsResult.data ?? []) as CompetitionTeam[]
    );
    setScoreForms(nextScoreForms);
    setDateForms(nextDateForms);

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

  function getCompetitionPlayer(registrationId: string | null) {
    if (!registrationId) return null;

    return (
      competitionPlayers.find(
        (registration) => registration.id === registrationId
      ) ?? null
    );
  }

  function getTeamLabel(teamId: string | null): ParticipantLabel {
    if (!teamId) {
      return {
        title: "Team inconnue",
        subtitle: "Aucune team trouvée",
      };
    }

    const team = teams.find((item) => item.id === teamId);

    if (!team) {
      return {
        title: "Team introuvable",
        subtitle: "Team esport",
      };
    }

    return {
      title: team.name,
      subtitle: team.manager ? `Manager : ${team.manager}` : "Team esport",
    };
  }

  function getMatchParticipantLabel(match: Match, side: "home" | "away") {
    if (competition?.participant_type === "teams") {
      return getTeamLabel(
        side === "home" ? match.home_team_id : match.away_team_id
      );
    }

    return getParticipantLabel(
      side === "home"
        ? match.home_competition_player_id
        : match.away_competition_player_id
    );
  }

  function getParticipantLabel(registrationId: string | null): ParticipantLabel {
    const registration = getCompetitionPlayer(registrationId);

    if (!registration) {
      return {
        title: "Participant inconnu",
        subtitle: "Aucune inscription trouvée",
      };
    }

    const player = getPlayer(registration.player_id);

    return {
      title: player?.name || "Joueur inconnu",
      subtitle: registration.ea_team_name || "Équipe non définie",
    };
  }

  function getCompetitionTypeLabel(type: string) {
    if (type === "league") return "Championnat";
    if (type === "cup") return "Coupe";
    if (type === "tournament") return "Tournoi";

    return type;
  }

  function getParticipantTypeLabel(type: "teams" | "players") {
    if (type === "players") return "Joueurs";
    return "Équipes";
  }

  function getStatusLabel(status: string) {
    if (status === "completed") return "Terminé";
    if (status === "scheduled") return "Programmé";
    if (status === "in_progress") return "En cours";
    if (status === "planned") return "À planifier";

    return status;
  }

  function getStatusClass(status: string) {
    if (status === "completed") {
      return "border-[#2EC4B6]/35 text-[#2EC4B6]";
    }

    if (status === "in_progress") {
      return "border-[#C39B55]/40 text-[#DBC399]";
    }

    if (status === "scheduled") {
      return "border-[#6F91C2]/40 text-[#AFC5E5]";
    }

    return "border-[#C39B55]/30 text-[#DBC399]";
  }

  function formatDate(value: string | null) {
    if (!value) return "À planifier";

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatSubmittedAt(value: string | null) {
    if (!value) return "Date inconnue";

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function toDateTimeLocalValue(value: string | null) {
    if (!value) return "";

    const date = new Date(value);
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 16);
  }

  function updateScoreForm(
    matchId: string,
    field: "home" | "away",
    value: string
  ) {
    const cleanValue = value.replace(/[^\d]/g, "");

    setScoreForms((current) => ({
      ...current,
      [matchId]: {
        home: current[matchId]?.home ?? "",
        away: current[matchId]?.away ?? "",
        [field]: cleanValue,
      },
    }));
  }

  function updateDateForm(matchId: string, value: string) {
    setDateForms((current) => ({
      ...current,
      [matchId]: value,
    }));
  }

  async function generateMatches() {
    if (!competition) {
      setMessage("Compétition introuvable.");
      return;
    }

    if (!isAdmin) {
      setMessage("Action réservée aux admins.");
      return;
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return;
    }

    setGenerating(true);
    setMessage("");

    const response = await fetch(
      `/api/admin/competitions/${competition.id}/generate-matches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const result: { error?: string; message?: string } =
      await response.json();

    if (!response.ok) {
      setGenerating(false);
      setMessage(result.error || "Erreur génération des matchs.");
      return;
    }

    setGenerating(false);
    setMessage(result.message || "Matchs générés ✅");

    await loadData();
  }

  async function saveAdminScore(match: Match) {
    const form = scoreForms[match.id];

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

    setSavingScoreMatchId(match.id);
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

    const result: { error?: string; message?: string } =
      await response.json();

    if (!response.ok) {
      setSavingScoreMatchId(null);
      setMessage(result.error || "Erreur enregistrement score.");
      return;
    }

    setSavingScoreMatchId(null);
    setMessage(result.message || "Score enregistré ✅");

    await loadData();
  }

  async function resetAdminScore(match: Match) {
    const confirmed = window.confirm("Réinitialiser le score de ce match ?");

    if (!confirmed) return;

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return;
    }

    setResettingMatchId(match.id);
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

    const result: { error?: string; message?: string } =
      await response.json();

    if (!response.ok) {
      setResettingMatchId(null);
      setMessage(result.error || "Erreur reset score.");
      return;
    }

    setResettingMatchId(null);
    setMessage(result.message || "Score réinitialisé ✅");

    await loadData();
  }

  async function saveMatchDate(match: Match) {
    const value = dateForms[match.id] ?? "";

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return;
    }

    setSavingDateMatchId(match.id);
    setMessage("");

    const nextDate = value ? new Date(value).toISOString() : null;

    const response = await fetch(`/api/admin/matches/${match.id}/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        match_date: nextDate,
      }),
    });

    const result: { error?: string; message?: string } =
      await response.json();

    if (!response.ok) {
      setSavingDateMatchId(null);
      setMessage(result.error || "Erreur programmation match.");
      return;
    }

    setSavingDateMatchId(null);
    setMessage(result.message || "Date / heure du match enregistrée ✅");

    await loadData();
  }

  async function reviewScore(match: Match, action: "validate" | "reject") {
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
      body: JSON.stringify({ action }),
    });

    const result: { error?: string; message?: string } =
      await response.json();

    if (!response.ok) {
      setReviewingMatchId(null);
      setMessage(result.error || "Erreur traitement du score.");
      return;
    }

    setReviewingMatchId(null);
    setMessage(result.message || "Score traité.");

    await loadData();
  }

  function getScoreStatusLabel(status: string | null) {
    if (status === "pending") return "Attente";
    if (status === "validated") return "Validé";
    if (status === "refused") return "Refusé";
    return "Aucun";
  }

  function getScoreStatusClass(status: string | null) {
    if (status === "pending") {
      return "border-[#C39B55]/40 bg-[#C39B55]/10 text-[#DBC399]";
    }

    if (status === "validated") {
      return "border-[#2EC4B6]/35 bg-[#2EC4B6]/10 text-[#2EC4B6]";
    }

    if (status === "refused") {
      return "border-red-400/35 bg-red-500/10 text-red-300";
    }

    return "border-[#CFC6AB]/20 bg-[#0B1B33]/60 text-[#CFC6AB]";
  }

  const matchTableRows = useMemo<AdminCompetitionMatchTableRow[]>(() => {
    return filteredMatches.map((match) => {
      const home = getMatchParticipantLabel(match, "home");
      const away = getMatchParticipantLabel(match, "away");

      const hasScore =
        match.home_score !== null && match.away_score !== null;

      const hasSubmittedScore =
        match.submitted_home_score !== null &&
        match.submitted_away_score !== null &&
        match.score_status !== "validated";

      const isPending = match.score_status === "pending";
      const isOpen = openMatchId === match.id;
      const isSavingScore = savingScoreMatchId === match.id;
      const isResetting = resettingMatchId === match.id;
      const isReviewing = reviewingMatchId === match.id;

      return {
        id: match.id,
        dateLabel: formatDate(match.match_date),
        homeTitle: home.title,
        homeSubtitle: home.subtitle,
        awayTitle: away.title,
        awaySubtitle: away.subtitle,
        scoreLabel: hasScore
          ? `${match.home_score} - ${match.away_score}`
          : "VS",
        matchStatusLabel: getStatusLabel(match.status),
        matchStatusClassName: getStatusClass(match.status),
        scoreStatusLabel: getScoreStatusLabel(match.score_status),
        scoreStatusClassName: getScoreStatusClass(match.score_status),
        submittedScoreLabel: hasSubmittedScore
          ? `${match.submitted_home_score} - ${match.submitted_away_score}`
          : "-",
        actionNode: (
          <button
            type="button"
            onClick={() => setOpenMatchId(isOpen ? null : match.id)}
            className="rounded-lg border border-[#C39B55]/30 px-4 py-2 text-xs font-black text-[#DBC399] transition hover:bg-[#12274A]"
          >
            {isOpen ? "Fermer" : "Gérer"}
          </button>
        ),
        expandedNode: isOpen ? (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-[#C39B55]/15 bg-[#12274A]/80 p-4">
              <p className="mb-3 text-sm font-black text-[#DBC399]">
                Saisie score admin
              </p>

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#9F967F]">
                    {home.title}
                  </label>

                  <input
                    value={scoreForms[match.id]?.home ?? ""}
                    onChange={(event) =>
                      updateScoreForm(match.id, "home", event.target.value)
                    }
                    inputMode="numeric"
                    className="w-full rounded-lg border border-[#C39B55]/20 bg-[#0B1B33] px-3 py-2 text-center font-black text-[#CFC6AB] outline-none transition focus:border-[#C39B55]/60"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#9F967F]">
                    {away.title}
                  </label>

                  <input
                    value={scoreForms[match.id]?.away ?? ""}
                    onChange={(event) =>
                      updateScoreForm(match.id, "away", event.target.value)
                    }
                    inputMode="numeric"
                    className="w-full rounded-lg border border-[#C39B55]/20 bg-[#0B1B33] px-3 py-2 text-center font-black text-[#CFC6AB] outline-none transition focus:border-[#C39B55]/60"
                    placeholder="0"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSavingScore}
                  onClick={() => saveAdminScore(match)}
                  className="rounded-lg bg-[#C39B55] px-4 py-2 text-sm font-semibold text-[#0B1B33] transition hover:bg-[#DBC399] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingScore ? "..." : "Enregistrer"}
                </button>

                <button
                  type="button"
                  disabled={isResetting || !hasScore}
                  onClick={() => resetAdminScore(match)}
                  className="rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isResetting ? "..." : "Reset"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#C39B55]/20 bg-[#C39B55]/5 p-4">
              <p className="mb-3 text-sm font-black text-[#DBC399]">
                Score proposé membre
              </p>

              {hasSubmittedScore ? (
                <>
                  <p className="text-2xl font-black text-[#DBC399]">
                    {match.submitted_home_score} - {match.submitted_away_score}
                  </p>

                  {match.score_submitted_at && (
                    <p className="mt-2 text-xs text-[#CFC6AB]">
                      Envoyé le {formatSubmittedAt(match.score_submitted_at)}
                    </p>
                  )}

                  {isPending && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isReviewing}
                        onClick={() => reviewScore(match, "validate")}
                        className="rounded-lg bg-[#2EC4B6] px-4 py-2 text-sm font-semibold text-[#0B1B33] transition hover:bg-[#55D4C8] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isReviewing ? "..." : "Valider"}
                      </button>

                      <button
                        type="button"
                        disabled={isReviewing}
                        onClick={() => reviewScore(match, "reject")}
                        className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isReviewing ? "..." : "Refuser"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-[#CFC6AB]">
                  Aucun score proposé pour ce match.
                </p>
              )}
            </div>
          </div>
        ) : null,
      };
    });
  }, [
    filteredMatches,
    openMatchId,
    scoreForms,
    savingScoreMatchId,
    resettingMatchId,
    reviewingMatchId,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B1B33] text-[#CFC6AB]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#C39B55]/20 bg-[#12274A]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="text-[#CFC6AB]">Chargement admin compétition...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <AccessCard
        title="Connexion requise"
        text="Connecte-toi avec un compte admin pour accéder à cette page."
        linkHref="/login"
        linkText="Se connecter"
      />
    );
  }

  if (!isAdmin) {
    return (
      <AccessCard
        title="Accès refusé"
        text="Cette page est réservée aux administrateurs."
        linkHref="/"
        linkText="Retour à l’accueil"
      />
    );
  }

  if (!competition) {
    return (
      <AccessCard
        title="Compétition introuvable"
        text={message || "Impossible de charger cette compétition."}
        linkHref="/admin"
        linkText="Retour admin"
      />
    );
  }

  const competitionLabel = competition.season
    ? `${competition.name} · ${competition.season}`
    : competition.name;

  return (
    <main className="min-h-screen bg-[#0B1B33] text-[#CFC6AB]">
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <div className="mb-6 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-[#C39B55]/30 px-4 py-2 text-sm font-semibold text-[#DBC399] transition hover:bg-[#12274A]"
            >
              ← Retour admin
            </Link>

            <Link
              href="/competitions"
              className="rounded-xl border border-[#C39B55]/30 px-4 py-2 text-sm font-semibold text-[#DBC399] transition hover:bg-[#12274A]"
            >
              Compétitions
            </Link>

            <Link
              href={`/competitions/${competition.id}/matchs`}
              className="rounded-xl border border-[#C39B55]/30 px-4 py-2 text-sm font-semibold text-[#DBC399] transition hover:bg-[#12274A]"
            >
              Page matchs
            </Link>

            <Link
              href={`/competitions/${competition.id}/classement`}
              className="rounded-xl border border-[#C39B55]/30 px-4 py-2 text-sm font-semibold text-[#DBC399] transition hover:bg-[#12274A]"
            >
              Classement
            </Link>
          </div>

          <p className="mb-3 inline-flex rounded-full border border-[#C39B55]/30 bg-[#12274A] px-4 py-2 text-sm font-semibold text-[#DBC399]">
            Administration compétition
          </p>

          <h1 className="text-4xl font-black md:text-5xl">
            {competitionLabel}
          </h1>

          <p className="mt-3 max-w-3xl text-[#CFC6AB]">
            Tableau de bord de gestion de la compétition.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-[#C39B55]/30 bg-[#12274A] p-4 text-sm text-[#DBC399]">
              {message}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <StatCard
            label="Type"
            value={getCompetitionTypeLabel(competition.type)}
          />

          <StatCard label="Statut" value={competition.status} />

          <StatCard
            label="Format"
            value={getParticipantTypeLabel(competition.participant_type)}
          />

          <StatCard
            label="Participants"
            value={
              competition.participant_type === "teams"
                ? competitionTeams.length
                : competitionPlayers.length
            }
          />

          <StatCard label="Matchs" value={matches.length} />
        </div>

        <section className="mt-8 rounded-2xl border border-[#C39B55]/20 bg-[#12274A]/90 p-6 shadow-lg shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#CFC6AB]">
                Actions rapides
              </h2>

              <p className="mt-2 text-sm text-[#CFC6AB]">
                Génère automatiquement les matchs manquants entre les
                participants inscrits.
              </p>
            </div>

            <button
              type="button"
              disabled={generating}
              onClick={generateMatches}
              className="rounded-xl bg-[#C39B55] px-5 py-3 text-sm font-semibold text-[#0B1B33] shadow-lg shadow-black/20 transition hover:bg-[#DBC399] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? "Génération..." : "Générer les matchs"}
            </button>
          </div>
        </section>

        {competition.participant_type === "teams" ? (
          <AdminCompetitionTeamsManager
            competitionId={competition.id}
            onChanged={loadData}
          />
        ) : (
          <AdminCompetitionParticipantsManager
            competitionId={competition.id}
            onChanged={loadData}
          />
        )}

        <AdminMatchesScheduler
          competitionId={competition.id}
          onChanged={loadData}
        />

        <AdminCompetitionMatchesTable
          title="Matchs de la compétition"
          description="Vue synthétique des matchs avec filtres et actions rapides."
          filters={[
            { key: "all", label: "Tous", count: matches.length },
            {
              key: "planned",
              label: "À planifier",
              count: onlyPlannedMatches.length,
            },
            {
              key: "scheduled",
              label: "Programmés",
              count: scheduledMatches.length,
            },
            {
              key: "completed",
              label: "Terminés",
              count: completedMatches.length,
            },
            {
              key: "pending",
              label: "Scores à valider",
              count: pendingScoreMatches.length,
            },
          ]}
          activeFilter={matchFilter}
          onFilterChange={(nextFilter) =>
            setMatchFilter(nextFilter as AdminMatchFilter)
          }
          rows={matchTableRows}
          emptyText="Aucun match pour ce filtre."
        />

        <section className="mt-8 rounded-2xl border border-[#C39B55]/20 bg-[#12274A]/90 p-6 shadow-lg shadow-black/30">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#DBC399]">
                Scores à valider
              </h2>

              <p className="mt-2 text-sm text-[#CFC6AB]">
                Scores proposés par les membres en attente de validation admin.
              </p>
            </div>

            <div className="rounded-2xl border border-[#C39B55]/30 bg-[#C39B55]/5 px-6 py-4 text-center">
              <p className="text-3xl font-black text-[#DBC399]">
                {pendingScoreMatches.length}
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest text-[#CFC6AB]">
                en attente
              </p>
            </div>
          </div>

          {pendingScoreMatches.length === 0 ? (
            <EmptyState text="Aucun score en attente de validation." />
          ) : (
            <div className="space-y-4">
              {pendingScoreMatches.map((match) => {
                const home = getMatchParticipantLabel(match, "home");
                const away = getMatchParticipantLabel(match, "away");

                return (
                  <article
                    key={match.id}
                    className="rounded-xl border border-[#C39B55]/20 bg-[#0B1B33]/70 p-4"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-[#9F967F]">
                        Proposé le {formatSubmittedAt(match.score_submitted_at)}
                      </p>

                      <span className="rounded-full border border-[#C39B55]/30 px-3 py-1 text-xs font-semibold text-[#DBC399]">
                        En attente
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <div>
                        <p className="font-black text-[#CFC6AB]">
                          {home.title}
                        </p>
                        <p className="mt-1 text-sm text-[#9F967F]">
                          {home.subtitle}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#C39B55]/30 bg-[#C39B55]/5 px-6 py-4 text-center">
                        <p className="text-3xl font-black text-[#DBC399]">
                          {match.submitted_home_score} -{" "}
                          {match.submitted_away_score}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-widest text-[#CFC6AB]">
                          score proposé
                        </p>
                      </div>

                      <div className="md:text-right">
                        <p className="font-black text-[#CFC6AB]">
                          {away.title}
                        </p>
                        <p className="mt-1 text-sm text-[#9F967F]">
                          {away.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={reviewingMatchId === match.id}
                        onClick={() => reviewScore(match, "validate")}
                        className="rounded-lg bg-[#2EC4B6] px-4 py-2 text-sm font-semibold text-[#0B1B33] transition hover:bg-[#55D4C8] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewingMatchId === match.id ? "..." : "Valider"}
                      </button>

                      <button
                        type="button"
                        disabled={reviewingMatchId === match.id}
                        onClick={() => reviewScore(match, "reject")}
                        className="rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Refuser
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function AccessCard({
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
    <main className="min-h-screen bg-[#0B1B33] text-[#CFC6AB]">
      <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-[#C39B55]/20 bg-[#12274A]/90 p-6 text-center shadow-lg shadow-black/30">
          <h1 className="text-3xl font-black">{title}</h1>

          <p className="mt-3 text-[#CFC6AB]">{text}</p>

          <Link
            href={linkHref}
            className="mt-6 inline-flex rounded-xl border border-[#C39B55]/30 px-5 py-2.5 text-sm font-semibold text-[#DBC399] transition hover:bg-[#0B1B33]"
          >
            {linkText}
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-[#C39B55]/20 bg-[#12274A]/90 p-5 shadow-lg shadow-black/30">
      <p className="text-sm text-[#9F967F]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#DBC399]">{value}</p>
    </div>
  );
}

function MiniCounter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#C39B55]/25 bg-[#0B1B33]/70 px-5 py-3 text-center">
      <p className="text-2xl font-black text-[#DBC399]">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-widest text-[#9F967F]">
        {label}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-[#C39B55]/15 bg-[#0B1B33]/70 p-4 text-sm text-[#CFC6AB]">
      {text}
    </p>
  );
}