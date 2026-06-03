"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminCompetitionParticipantsManager from "@/components/AdminCompetitionParticipantsManager";

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

  const [scoreForms, setScoreForms] = useState<Record<string, ScoreForm>>({});
  const [dateForms, setDateForms] = useState<Record<string, string>>({});

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

  const isAdmin = profile?.role === "admin";

  const pendingScoreMatches = useMemo(() => {
    return matches.filter((match) => match.score_status === "pending");
  }, [matches]);

  const plannedMatches = useMemo(() => {
    return matches.filter((match) => match.status !== "completed");
  }, [matches]);

  const completedMatches = useMemo(() => {
    return matches.filter((match) => match.status === "completed");
  }, [matches]);

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

    if (loadedProfile.role !== "admin") {
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
      return "border-green-400/30 text-green-300";
    }

    if (status === "in_progress") {
      return "border-orange-400/30 text-orange-300";
    }

    if (status === "scheduled") {
      return "border-blue-400/30 text-blue-300";
    }

    return "border-[#D9A441]/30 text-[#F2D27A]";
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
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

    return localDate.toISOString().slice(0, 16);
  }

  function updateScoreForm(matchId: string, field: "home" | "away", value: string) {
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
    if (!competition) return;

    setGenerating(true);
    setMessage("");

    const response = await fetch(
      `/api/competitions/${competition.id}/generate-matches`,
      {
        method: "POST",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setGenerating(false);
      setMessage(result.error || "Erreur génération des matchs.");
      return;
    }

    setGenerating(false);
    setMessage(result.message || "Matchs générés.");

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

    setSavingScoreMatchId(match.id);
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
      setSavingScoreMatchId(null);
      setMessage(`Erreur enregistrement score : ${updateResult.error.message}`);
      return;
    }

    setSavingScoreMatchId(null);
    setMessage("Score enregistré ✅");

    await loadData();
  }

  async function resetAdminScore(match: Match) {
    const confirmed = window.confirm("Réinitialiser le score de ce match ?");

    if (!confirmed) return;

    setResettingMatchId(match.id);
    setMessage("");

    const nextStatus = match.match_date ? "scheduled" : "planned";

    const updateResult = await supabase
      .from("matches")
      .update({
        home_score: null,
        away_score: null,
        status: nextStatus,
        submitted_home_score: null,
        submitted_away_score: null,
        score_submitted_by: null,
        score_submitted_at: null,
        score_status: null,
      })
      .eq("id", match.id);

    if (updateResult.error) {
      setResettingMatchId(null);
      setMessage(`Erreur reset score : ${updateResult.error.message}`);
      return;
    }

    setResettingMatchId(null);
    setMessage("Score réinitialisé ✅");

    await loadData();
  }

  async function saveMatchDate(match: Match) {
    const value = dateForms[match.id] ?? "";

    setSavingDateMatchId(match.id);
    setMessage("");

    const nextDate = value ? new Date(value).toISOString() : null;
    const nextStatus =
      match.status === "completed" ? "completed" : nextDate ? "scheduled" : "planned";

    const updateResult = await supabase
      .from("matches")
      .update({
        match_date: nextDate,
        status: nextStatus,
      })
      .eq("id", match.id);

    if (updateResult.error) {
      setSavingDateMatchId(null);
      setMessage(`Erreur programmation match : ${updateResult.error.message}`);
      return;
    }

    setSavingDateMatchId(null);
    setMessage(
      nextDate
        ? "Date / heure du match enregistrée ✅"
        : "Date / heure du match supprimée ✅"
    );

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

    const result = await response.json();

    if (!response.ok) {
      setReviewingMatchId(null);
      setMessage(result.error || "Erreur traitement du score.");
      return;
    }

    setReviewingMatchId(null);
    setMessage(result.message || "Score traité.");

    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="text-[#D8C7A0]">Chargement admin compétition...</p>
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
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <div className="mb-6 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
            >
              ← Retour admin
            </Link>

            <Link
              href="/competitions"
              className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
            >
              Compétitions
            </Link>

            <Link
              href={`/competitions/${competition.id}/matchs`}
              className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
            >
              Page matchs
            </Link>

            <Link
              href={`/competitions/${competition.id}/classement`}
              className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
            >
              Classement
            </Link>
          </div>

          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Administration compétition
          </p>

          <h1 className="text-4xl font-black md:text-5xl">
            {competitionLabel}
          </h1>

          <p className="mt-3 max-w-3xl text-[#D8C7A0]">
            Tableau de bord de gestion de la compétition.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-[#D9A441]/30 bg-[#160A12] p-4 text-sm text-[#F2D27A]">
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

          <StatCard label="Participants" value={competitionPlayers.length} />

          <StatCard label="Matchs" value={matches.length} />
        </div>

        <section className="mt-8 rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#F7E9C5]">
                Actions rapides
              </h2>

              <p className="mt-2 text-sm text-[#D8C7A0]">
                Génère automatiquement les matchs manquants entre les
                participants inscrits.
              </p>
            </div>

            <button
              type="button"
              disabled={generating}
              onClick={generateMatches}
              className="rounded-xl bg-[#A61E22] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? "Génération..." : "Générer les matchs"}
            </button>
          </div>
        </section>

        <AdminCompetitionParticipantsManager
          competitionId={competition.id}
          onChanged={loadData}
        />

        <section className="mt-8 rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#F7E9C5]">
                Matchs de la compétition
              </h2>

              <p className="mt-2 text-sm text-[#D8C7A0]">
                Gestion des scores, reset et programmation des dates de match.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <MiniCounter label="À venir" value={plannedMatches.length} />
              <MiniCounter label="Terminés" value={completedMatches.length} />
            </div>
          </div>

          {matches.length === 0 ? (
            <EmptyState text="Aucun match généré pour le moment." />
          ) : (
            <div className="space-y-4">
              {matches.map((match) => {
                const home = getParticipantLabel(
                  match.home_competition_player_id
                );
                const away = getParticipantLabel(
                  match.away_competition_player_id
                );

                const hasScore =
                  match.home_score !== null && match.away_score !== null;

                const hasSubmittedScore =
                  match.submitted_home_score !== null &&
                  match.submitted_away_score !== null;

                const isSavingScore = savingScoreMatchId === match.id;
                const isResetting = resettingMatchId === match.id;
                const isSavingDate = savingDateMatchId === match.id;

                return (
                  <article
                    key={match.id}
                    className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-[#8F7B5C]">
                        {formatDate(match.match_date)}
                      </p>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                          match.status
                        )}`}
                      >
                        {getStatusLabel(match.status)}
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <div>
                        <p className="font-black text-[#F7E9C5]">
                          {home.title}
                        </p>
                        <p className="mt-1 text-sm text-[#8F7B5C]">
                          {home.subtitle}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#D9A441]/25 bg-[#160A12] px-6 py-4 text-center">
                        {hasScore ? (
                          <p className="text-3xl font-black text-[#F2D27A]">
                            {match.home_score} - {match.away_score}
                          </p>
                        ) : (
                          <p className="text-sm font-black uppercase tracking-widest text-[#F2D27A]">
                            VS
                          </p>
                        )}
                      </div>

                      <div className="md:text-right">
                        <p className="font-black text-[#F7E9C5]">
                          {away.title}
                        </p>
                        <p className="mt-1 text-sm text-[#8F7B5C]">
                          {away.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                      <div className="rounded-xl border border-[#D9A441]/15 bg-[#160A12]/80 p-4">
                        <p className="mb-3 text-sm font-semibold text-[#F2D27A]">
                          Score admin
                        </p>

                        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[#8F7B5C]">
                              Domicile
                            </label>

                            <input
                              value={scoreForms[match.id]?.home ?? ""}
                              onChange={(event) =>
                                updateScoreForm(
                                  match.id,
                                  "home",
                                  event.target.value
                                )
                              }
                              inputMode="numeric"
                              className="w-full rounded-lg border border-[#D9A441]/20 bg-[#0B0610] px-3 py-2 text-center font-black text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[#8F7B5C]">
                              Extérieur
                            </label>

                            <input
                              value={scoreForms[match.id]?.away ?? ""}
                              onChange={(event) =>
                                updateScoreForm(
                                  match.id,
                                  "away",
                                  event.target.value
                                )
                              }
                              inputMode="numeric"
                              className="w-full rounded-lg border border-[#D9A441]/20 bg-[#0B0610] px-3 py-2 text-center font-black text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                              placeholder="0"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={isSavingScore}
                            onClick={() => saveAdminScore(match)}
                            className="rounded-lg bg-[#A61E22] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSavingScore ? "..." : "Enregistrer"}
                          </button>

                          <button
                            type="button"
                            disabled={isResetting || !hasScore}
                            onClick={() => resetAdminScore(match)}
                            className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isResetting ? "..." : "Reset"}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[#D9A441]/15 bg-[#160A12]/80 p-4">
                        <p className="mb-3 text-sm font-semibold text-[#F2D27A]">
                          Programmation
                        </p>

                        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[#8F7B5C]">
                              Date / heure
                            </label>

                            <input
                              type="datetime-local"
                              value={dateForms[match.id] ?? ""}
                              onChange={(event) =>
                                updateDateForm(match.id, event.target.value)
                              }
                              className="w-full rounded-lg border border-[#D9A441]/20 bg-[#0B0610] px-3 py-2 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={isSavingDate}
                            onClick={() => saveMatchDate(match)}
                            className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSavingDate ? "..." : "Programmer"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {hasSubmittedScore && (
                      <div className="mt-4 rounded-xl border border-orange-400/20 bg-orange-950/20 p-4">
                        <p className="text-sm font-semibold text-orange-300">
                          Score proposé : {match.submitted_home_score} -{" "}
                          {match.submitted_away_score}
                        </p>

                        <p className="mt-1 text-xs text-[#D8C7A0]">
                          Statut : {match.score_status || "none"}
                          {match.score_submitted_at
                            ? ` · proposé le ${formatSubmittedAt(
                                match.score_submitted_at
                              )}`
                            : ""}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-orange-400/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-orange-300">
                Scores à valider
              </h2>

              <p className="mt-2 text-sm text-[#D8C7A0]">
                Scores proposés par les membres en attente de validation admin.
              </p>
            </div>

            <div className="rounded-2xl border border-orange-400/30 bg-orange-950/20 px-6 py-4 text-center">
              <p className="text-3xl font-black text-orange-300">
                {pendingScoreMatches.length}
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest text-orange-200/80">
                en attente
              </p>
            </div>
          </div>

          {pendingScoreMatches.length === 0 ? (
            <EmptyState text="Aucun score en attente de validation." />
          ) : (
            <div className="space-y-4">
              {pendingScoreMatches.map((match) => {
                const home = getParticipantLabel(
                  match.home_competition_player_id
                );
                const away = getParticipantLabel(
                  match.away_competition_player_id
                );

                return (
                  <article
                    key={match.id}
                    className="rounded-xl border border-orange-400/20 bg-[#0B0610]/70 p-4"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-[#8F7B5C]">
                        Proposé le {formatSubmittedAt(match.score_submitted_at)}
                      </p>

                      <span className="rounded-full border border-orange-400/30 px-3 py-1 text-xs font-semibold text-orange-300">
                        En attente
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <div>
                        <p className="font-black text-[#F7E9C5]">
                          {home.title}
                        </p>
                        <p className="mt-1 text-sm text-[#8F7B5C]">
                          {home.subtitle}
                        </p>
                      </div>

                      <div className="rounded-xl border border-orange-400/30 bg-orange-950/20 px-6 py-4 text-center">
                        <p className="text-3xl font-black text-orange-300">
                          {match.submitted_home_score} -{" "}
                          {match.submitted_away_score}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-widest text-orange-200/80">
                          score proposé
                        </p>
                      </div>

                      <div className="md:text-right">
                        <p className="font-black text-[#F7E9C5]">
                          {away.title}
                        </p>
                        <p className="mt-1 text-sm text-[#8F7B5C]">
                          {away.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={reviewingMatchId === match.id}
                        onClick={() => reviewScore(match, "validate")}
                        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
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
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
          <h1 className="text-3xl font-black">{title}</h1>

          <p className="mt-3 text-[#D8C7A0]">{text}</p>

          <Link
            href={linkHref}
            className="mt-6 inline-flex rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
          >
            {linkText}
          </Link>
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

function MiniCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/25 bg-[#0B0610]/70 px-5 py-3 text-center">
      <p className="text-2xl font-black text-[#F2D27A]">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-widest text-[#8F7B5C]">
        {label}
      </p>
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
