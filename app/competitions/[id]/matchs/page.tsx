"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  role: "member" | "admin";
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

  submitted_home_score: number | null;
  submitted_away_score: number | null;
  score_submitted_by: string | null;
  score_submitted_at: string | null;
  score_status: "none" | "pending" | "validated" | "rejected" | string | null;
};

type ScoreForm = {
  home: string;
  away: string;
};

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

  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(
    null
  );
  const [reviewingMatchId, setReviewingMatchId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const isAdmin = profile?.role === "admin";

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

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatSubmittedAt(value: string | null) {
    if (!value) return "";

    const date = new Date(value);

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
      return "border-green-400/30 text-green-300";
    }

    if (status === "in_progress") {
      return "border-orange-400/30 text-orange-300";
    }

    return "border-[#D9A441]/30 text-[#F2D27A]";
  }

  function getScoreStatusLabel(status: Match["score_status"]) {
    if (status === "pending") return "En attente de validation";
    if (status === "validated") return "Validé";
    if (status === "rejected") return "Refusé";

    return "Aucun score proposé";
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

    setSavingMatchId(match.id);
    setMessage("");

    const updateResult = await supabase
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: "completed",
        submitted_home_score: null,
        submitted_away_score: null,
        score_submitted_by: null,
        score_submitted_at: null,
        score_status: "validated",
      })
      .eq("id", match.id);

    if (updateResult.error) {
      setSavingMatchId(null);
      setMessage(`Erreur enregistrement score : ${updateResult.error.message}`);
      return;
    }

    setSavingMatchId(null);
    setMessage("Score enregistré ✅");

    await loadData();
  }

  async function resetScore(match: Match) {
    if (!isAdmin) {
      setMessage("Action réservée aux admins.");
      return;
    }

    const confirmed = window.confirm("Réinitialiser le score de ce match ?");

    if (!confirmed) return;

    setSavingMatchId(match.id);
    setMessage("");

    const updateResult = await supabase
      .from("matches")
      .update({
        home_score: null,
        away_score: null,
        status: "planned",
        submitted_home_score: null,
        submitted_away_score: null,
        score_submitted_by: null,
        score_submitted_at: null,
        score_status: "none",
      })
      .eq("id", match.id);

    if (updateResult.error) {
      setSavingMatchId(null);
      setMessage(
        `Erreur réinitialisation score : ${updateResult.error.message}`
      );
      return;
    }

    setSavingMatchId(null);
    setMessage("Score réinitialisé ✅");

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
            Consulte les rencontres, propose un score si tu participes au match,
            et suis les résultats validés.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-[#D9A441]/30 bg-[#160A12] p-4 text-sm text-[#F2D27A]">
              {message}
            </div>
          )}

          {isAdmin && (
            <div className="mt-4 rounded-xl border border-green-400/20 bg-green-950/20 p-4 text-sm text-green-300">
              Mode admin actif : tu peux saisir directement les scores ou
              valider les scores proposés par les membres.
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
                  scoreStatusLabel={getScoreStatusLabel(match.score_status)}
                  submittedAtLabel={formatSubmittedAt(
                    match.score_submitted_at
                  )}
                  isAdmin={isAdmin}
                  canSubmitScore={
                    match.status !== "completed" &&
                    isCurrentUserParticipant(match)
                  }
                  canSeeSubmittedScore={
                    isAdmin || isCurrentUserParticipant(match)
                  }
                  adminScoreForm={
                    adminScoreForms[match.id] ?? { home: "", away: "" }
                  }
                  memberScoreForm={
                    memberScoreForms[match.id] ?? { home: "", away: "" }
                  }
                  saving={savingMatchId === match.id}
                  submitting={submittingMatchId === match.id}
                  reviewing={reviewingMatchId === match.id}
                  onAdminScoreChange={(field, value) =>
                    updateAdminScoreForm(match.id, field, value)
                  }
                  onMemberScoreChange={(field, value) =>
                    updateMemberScoreForm(match.id, field, value)
                  }
                  onSaveScore={() => saveScore(match)}
                  onResetScore={() => resetScore(match)}
                  onSubmitMemberScore={() => submitMemberScore(match)}
                  onValidateSubmittedScore={() =>
                    reviewSubmittedScore(match, "validate")
                  }
                  onRejectSubmittedScore={() =>
                    reviewSubmittedScore(match, "reject")
                  }
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
                  scoreStatusLabel={getScoreStatusLabel(match.score_status)}
                  submittedAtLabel={formatSubmittedAt(
                    match.score_submitted_at
                  )}
                  isAdmin={isAdmin}
                  canSubmitScore={false}
                  canSeeSubmittedScore={
                    isAdmin || isCurrentUserParticipant(match)
                  }
                  adminScoreForm={
                    adminScoreForms[match.id] ?? { home: "", away: "" }
                  }
                  memberScoreForm={
                    memberScoreForms[match.id] ?? { home: "", away: "" }
                  }
                  saving={savingMatchId === match.id}
                  submitting={submittingMatchId === match.id}
                  reviewing={reviewingMatchId === match.id}
                  onAdminScoreChange={(field, value) =>
                    updateAdminScoreForm(match.id, field, value)
                  }
                  onMemberScoreChange={(field, value) =>
                    updateMemberScoreForm(match.id, field, value)
                  }
                  onSaveScore={() => saveScore(match)}
                  onResetScore={() => resetScore(match)}
                  onSubmitMemberScore={() => submitMemberScore(match)}
                  onValidateSubmittedScore={() =>
                    reviewSubmittedScore(match, "validate")
                  }
                  onRejectSubmittedScore={() =>
                    reviewSubmittedScore(match, "reject")
                  }
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
  scoreStatusLabel,
  submittedAtLabel,
  isAdmin,
  canSubmitScore,
  canSeeSubmittedScore,
  adminScoreForm,
  memberScoreForm,
  saving,
  submitting,
  reviewing,
  onAdminScoreChange,
  onMemberScoreChange,
  onSaveScore,
  onResetScore,
  onSubmitMemberScore,
  onValidateSubmittedScore,
  onRejectSubmittedScore,
}: {
  match: Match;
  homeLabel: string;
  awayLabel: string;
  dateLabel: string;
  statusLabel: string;
  statusClass: string;
  scoreStatusLabel: string;
  submittedAtLabel: string;
  isAdmin: boolean;
  canSubmitScore: boolean;
  canSeeSubmittedScore: boolean;
  adminScoreForm: ScoreForm;
  memberScoreForm: ScoreForm;
  saving: boolean;
  submitting: boolean;
  reviewing: boolean;
  onAdminScoreChange: (field: "home" | "away", value: string) => void;
  onMemberScoreChange: (field: "home" | "away", value: string) => void;
  onSaveScore: () => void;
  onResetScore: () => void;
  onSubmitMemberScore: () => void;
  onValidateSubmittedScore: () => void;
  onRejectSubmittedScore: () => void;
}) {
  const hasScore = match.home_score !== null && match.away_score !== null;

  const hasSubmittedScore =
    match.submitted_home_score !== null && match.submitted_away_score !== null;

  const isPending = match.score_status === "pending";

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

      {canSeeSubmittedScore && hasSubmittedScore && (
        <div className="mt-5 rounded-xl border border-orange-400/20 bg-orange-950/20 p-4">
          <p className="text-sm font-semibold text-orange-300">
            Score proposé : {match.submitted_home_score} -{" "}
            {match.submitted_away_score}
          </p>

          <p className="mt-1 text-xs text-[#D8C7A0]">
            Statut : {scoreStatusLabel}
            {submittedAtLabel ? ` · proposé le ${submittedAtLabel}` : ""}
          </p>

          {isAdmin && isPending && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={reviewing}
                onClick={onValidateSubmittedScore}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reviewing ? "..." : "Valider"}
              </button>

              <button
                type="button"
                disabled={reviewing}
                onClick={onRejectSubmittedScore}
                className="rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refuser
              </button>
            </div>
          )}
        </div>
      )}

      {canSubmitScore && (
        <div className="mt-5 rounded-xl border border-[#D9A441]/15 bg-[#160A12]/80 p-4">
          <p className="mb-3 text-sm font-semibold text-[#F2D27A]">
            Proposer le score
          </p>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#8F7B5C]">
                Score domicile
              </label>

              <input
                value={memberScoreForm.home}
                onChange={(event) =>
                  onMemberScoreChange("home", event.target.value)
                }
                inputMode="numeric"
                className="w-full rounded-lg border border-[#D9A441]/20 bg-[#0B0610] px-3 py-2 text-center font-black text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#8F7B5C]">
                Score extérieur
              </label>

              <input
                value={memberScoreForm.away}
                onChange={(event) =>
                  onMemberScoreChange("away", event.target.value)
                }
                inputMode="numeric"
                className="w-full rounded-lg border border-[#D9A441]/20 bg-[#0B0610] px-3 py-2 text-center font-black text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                placeholder="0"
              />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={onSubmitMemberScore}
              className="rounded-lg bg-[#A61E22] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "..." : isPending ? "Modifier" : "Proposer"}
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="mt-5 rounded-xl border border-[#D9A441]/15 bg-[#160A12]/80 p-4">
          <p className="mb-3 text-sm font-semibold text-[#F2D27A]">
            Saisie score admin
          </p>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#8F7B5C]">
                Score domicile
              </label>

              <input
                value={adminScoreForm.home}
                onChange={(event) =>
                  onAdminScoreChange("home", event.target.value)
                }
                inputMode="numeric"
                className="w-full rounded-lg border border-[#D9A441]/20 bg-[#0B0610] px-3 py-2 text-center font-black text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#8F7B5C]">
                Score extérieur
              </label>

              <input
                value={adminScoreForm.away}
                onChange={(event) =>
                  onAdminScoreChange("away", event.target.value)
                }
                inputMode="numeric"
                className="w-full rounded-lg border border-[#D9A441]/20 bg-[#0B0610] px-3 py-2 text-center font-black text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                placeholder="0"
              />
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={onSaveScore}
              className="rounded-lg bg-[#A61E22] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "..." : "Enregistrer"}
            </button>

            <button
              type="button"
              disabled={saving || !hasScore}
              onClick={onResetScore}
              className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </article>
  );
}