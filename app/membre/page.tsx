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
  pseudo?: string | null;
  role?: string | null;
  note?: number | null;
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

type Team = {
  id: string;
  name?: string | null;
};

type Competition = {
  id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  status?: string | null;
};

type Match = {
  id: string;
  competition_id?: string | null;
  home_team_id?: string | null;
  away_team_id?: string | null;
  date?: string | null;
  match_date?: string | null;
  created_at?: string | null;
  status?: string | null;
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
  competition?: Competition | null;
  competitions?: Competition | null;
  home_team?: Team | null;
  away_team?: Team | null;
};

export default function MembrePage() {
  const router = useRouter();
  const FutCard = FutMemberCard as ComponentType<any>;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
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

    await loadProfile(currentUserId);
    await loadMatches();

    setLoading(false);
  }

  async function loadProfile(currentUserId: string) {
    let loadedProfile: Profile | null = null;

    const profileById = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUserId)
      .maybeSingle();

    if (profileById.data) {
      loadedProfile = profileById.data as Profile;
    }

    if (!loadedProfile) {
      const profileByUserId = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (profileByUserId.data) {
        loadedProfile = profileByUserId.data as Profile;
      }
    }

    setProfile(loadedProfile);
  }

  async function loadMatches() {
    const relationQuery = `
      *,
      competition:competitions (
        id,
        title,
        description,
        status
      ),
      home_team:teams!matches_home_team_id_fkey (
        id,
        name
      ),
      away_team:teams!matches_away_team_id_fkey (
        id,
        name
      )
    `;

    const attempts = [
      () =>
        supabase
          .from("matches")
          .select(relationQuery)
          .order("date", { ascending: true }),

      () =>
        supabase
          .from("matches")
          .select(relationQuery),

      () =>
        supabase
          .from("matches")
          .select("*")
          .order("date", { ascending: true }),

      () =>
        supabase
          .from("matches")
          .select("*"),
    ];

    for (const attempt of attempts) {
      const { data, error } = await attempt();

      if (!error) {
        const sortedMatches = [...((data ?? []) as Match[])].sort((a, b) => {
          const dateA = new Date(
            a.date || a.match_date || a.created_at || "2099-01-01"
          ).getTime();

          const dateB = new Date(
            b.date || b.match_date || b.created_at || "2099-01-01"
          ).getTime();

          return dateA - dateB;
        });

        setMatches(sortedMatches);
        return;
      }

      console.warn("Tentative de chargement des matchs échouée :", error);
    }

    setMatches([]);
    setMessage("Erreur lors du chargement des matchs.");
  }

  const safeProfile = useMemo(() => {
    return {
      pseudo: profile?.pseudo || "Membre",
      role: profile?.role || "MEMBRE",
      note: profile?.note ?? 0,
      plateforme: profile?.plateforme || "PC",
      pays: profile?.pays || "FR",
      equipe_ea: profile?.equipe_ea || profile?.ea_team || "Sans équipe",
      ea_team: profile?.ea_team || profile?.equipe_ea || "Sans équipe",
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
  }, [profile]);

  const competitions = useMemo(() => {
    const map = new Map<string, Competition>();

    matches.forEach((match) => {
      const competition = match.competition || match.competitions;

      if (competition?.id) {
        map.set(competition.id, competition);
      }
    });

    return Array.from(map.values());
  }, [matches]);

  const matchesToPlay = useMemo(() => {
    return matches.filter((match) => {
      const hasFinalScore =
        match.score_home !== null &&
        match.score_home !== undefined &&
        match.score_away !== null &&
        match.score_away !== undefined;

      return !hasFinalScore;
    });
  }, [matches]);

  const finishedMatches = useMemo(() => {
    return matches.filter((match) => {
      return (
        match.score_home !== null &&
        match.score_home !== undefined &&
        match.score_away !== null &&
        match.score_away !== undefined
      );
    });
  }, [matches]);

  function getCompetitionName(match: Match) {
    const competition = match.competition || match.competitions;
    return competition?.title || competition?.name || "Compétition";
  }

  function getTeamName(team?: Team | null, fallback?: string | null) {
    return team?.name || fallback || "Équipe";
  }

  function getMatchDate(match: Match) {
    const rawDate = match.date || match.match_date;

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
                    Les compétitions liées à tes matchs.
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
                  {competitions.map((competition) => (
                    <div
                      key={competition.id}
                      className="rounded-2xl border border-yellow-700/25 bg-black/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-yellow-100">
                            {competition.title || competition.name || "Compétition"}
                          </h3>

                          {competition.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-yellow-100/55">
                              {competition.description}
                            </p>
                          )}
                        </div>

                        {competition.status && (
                          <span className="rounded-full border border-red-500/35 bg-red-500/15 px-2 py-1 text-[11px] font-black uppercase text-red-200">
                            {competition.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
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
                              {getTeamName(match.home_team, match.home_team_id)}{" "}
                              <span className="text-red-300/70">vs</span>{" "}
                              {getTeamName(match.away_team, match.away_team_id)}
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
                                      {getTeamName(
                                        match.home_team,
                                        match.home_team_id
                                      )}
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
                                      {getTeamName(
                                        match.away_team,
                                        match.away_team_id
                                      )}
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
                              {getTeamName(match.home_team, match.home_team_id)}{" "}
                              <span className="text-red-300/70">vs</span>{" "}
                              {getTeamName(match.away_team, match.away_team_id)}
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
                            {match.score_home} - {match.score_away}
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
