"use client";

import { useEffect, useMemo, useState } from "react";

import { useMemberSession } from "./hooks/useMemberSession";
import { useMemberData } from "./hooks/useMemberData";
import { useMemberMatches } from "./hooks/useMemberMatches";

import { buildSafeProfile } from "./helpers/profileHelpers";

import { MemberHeader } from "./components/MemberHeader";
import { MemberCard } from "./components/MemberCard";
import { MemberCompetitions } from "./components/MemberCompetitions";
import { ScoreForm } from "./components/ScoreForm";

import MemberMatchesTable from "@/components/MemberMatchesTable";
import { Match } from "./types";

import { cacheInvalidate } from "@/lib/cache";

export default function MembrePage() {
  const { userId, sessionLoading, sessionError, supabase } = useMemberSession();

  const {
    loading,
    errorMessage,
    profile,
    player,
    registrations,
    allCompetitionPlayers,
    competitions,
    matches,
    eaTeams,
    players,
    teams,
    loadMemberData,
  } = useMemberData(userId);

  const [message, setMessage] = useState<string | null>(null);

  const {
    stats,
    matchesToPlayRows,
    finishedMatchRows,
    openScoreMatchId,
    setOpenScoreMatchId,
    scoreHome,
    setScoreHome,
    scoreAway,
    setScoreAway,
    submittingMatchId,
    setSubmittingMatchId,
  } = useMemberMatches(
    matches,
    player,
    registrations,
    competitions,
    teams,
    players,
    allCompetitionPlayers
  );

  // Gestion erreurs session
  useEffect(() => {
    if (sessionError) setMessage(sessionError);
  }, [sessionError]);

  // Chargement initial
  useEffect(() => {
    if (userId) loadMemberData(userId);
  }, [userId, loadMemberData]);

  // Gestion erreurs data
  useEffect(() => {
    if (errorMessage) setMessage(errorMessage);
  }, [errorMessage]);

  // Profil sécurisé
  const safeProfile = useMemo(
    () => buildSafeProfile(profile, player, registrations, eaTeams, stats),
    [profile, player, registrations, eaTeams, stats]
  );

  // Reset du formulaire
  function resetScoreForm() {
    setOpenScoreMatchId(null);
    setScoreHome("");
    setScoreAway("");
    setSubmittingMatchId(null);
  }

  // Ouverture du formulaire
  function openScoreForm(match: Match) {
    setOpenScoreMatchId(match.id);
    setScoreHome(
      match.submitted_home_score != null ? String(match.submitted_home_score) : ""
    );
    setScoreAway(
      match.submitted_away_score != null ? String(match.submitted_away_score) : ""
    );
    setMessage(null);
  }

  // Soumission du score
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

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setMessage("Session introuvable. Merci de te reconnecter.");
      return;
    }

    setSubmittingMatchId(matchId);
    setMessage(null);

    const res = await fetch(`/api/matches/${matchId}/submit-score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        homeScore: parsedHome,
        awayScore: parsedAway,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setMessage(json.error || "Erreur lors de l'envoi du score.");
      setSubmittingMatchId(null);
      return;
    }

    setMessage(json.message || "Score proposé. En attente de validation.");
    resetScoreForm();

    // Invalidation du cache
    cacheInvalidate("matches:");
    cacheInvalidate("regs:");
    cacheInvalidate("allRegs:");

    await loadMemberData(userId);
  }

  const isLoading = sessionLoading || loading;

  if (isLoading) {
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

        <MemberHeader />

        {message && (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm font-black text-yellow-200 shadow-lg shadow-black/30">
            {message}
          </div>
        )}

        <section className="grid w-full items-start gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">

          <MemberCard profile={safeProfile} />

          <div className="flex min-w-0 flex-col gap-6">

            <MemberCompetitions
              competitions={competitions}
              registrations={registrations}
            />

            <MemberMatchesTable
              title="Mes matchs à jouer"
              description="Tes prochains matchs dans un affichage compact."
              count={matchesToPlayRows.length}
              rows={matchesToPlayRows.map((row) => ({
                ...row,
                expandedNode:
                  row.isFormOpen && (
                    <ScoreForm
                      match={matches.find((m) => m.id === row.id)!}
                      isSubmitting={row.isSubmitting}
                      scoreHome={scoreHome}
                      scoreAway={scoreAway}
                      onChangeHome={setScoreHome}
                      onChangeAway={setScoreAway}
                      onSubmit={() => submitScore(row.id)}
                      onCancel={resetScoreForm}
                      teams={teams}
                      players={players}
                      allCompetitionPlayers={allCompetitionPlayers}
                    />
                  ),
                actionNode: (
                  <button
                    type="button"
                    onClick={() => {
                      const match = matches.find((m) => m.id === row.id);
                      if (match) openScoreForm(match);
                    }}
                    className="rounded-lg border border-yellow-400/50 bg-yellow-400 px-3 py-2 text-xs font-black text-black shadow-lg shadow-yellow-950/30 transition hover:bg-yellow-300"
                  >
                    {row.scoreStatus === "pending"
                      ? "Modifier"
                      : row.scoreStatus === "refused"
                      ? "Reproposer"
                      : "Proposer"}
                  </button>
                ),
              }))}
              emptyText="Aucun match à jouer pour le moment."
            />

            <MemberMatchesTable
              title="Matchs terminés"
              description="Tes résultats validés ou déjà renseignés."
              count={finishedMatchRows.length}
              rows={finishedMatchRows}
              emptyText="Aucun match terminé pour le moment."
            />

          </div>
        </section>
      </div>
    </main>
  );
}
