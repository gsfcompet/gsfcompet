"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  created_at: string;
};

type CompetitionTeam = {
  id: string;
  competition_id: string;
  team_id: string;
};

type Match = {
  id: string;
  competition_id: string;
  status: string;
};

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>(
    []
  );
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const competitionsResult = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    const competitionTeamsResult = await supabase
      .from("competition_teams")
      .select("*");

    const matchesResult = await supabase.from("matches").select("*");

    if (competitionsResult.error) {
      setErrorMessage(
        `Erreur compétitions : ${competitionsResult.error.message}`
      );
      setLoading(false);
      return;
    }

    if (competitionTeamsResult.error) {
      setErrorMessage(
        `Erreur équipes inscrites : ${competitionTeamsResult.error.message}`
      );
      setLoading(false);
      return;
    }

    if (matchesResult.error) {
      setErrorMessage(`Erreur matchs : ${matchesResult.error.message}`);
      setLoading(false);
      return;
    }

    setCompetitions(competitionsResult.data ?? []);
    setCompetitionTeams(competitionTeamsResult.data ?? []);
    setMatches(matchesResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const statsByCompetition = useMemo(() => {
    return competitions.reduce<
      Record<
        string,
        {
          teamsCount: number;
          matchesCount: number;
          completedMatchesCount: number;
          scheduledMatchesCount: number;
        }
      >
    >((acc, competition) => {
      const competitionMatches = matches.filter(
        (match) => match.competition_id === competition.id
      );

      acc[competition.id] = {
        teamsCount: competitionTeams.filter(
          (item) => item.competition_id === competition.id
        ).length,
        matchesCount: competitionMatches.length,
        completedMatchesCount: competitionMatches.filter(
          (match) => match.status === "completed"
        ).length,
        scheduledMatchesCount: competitionMatches.filter(
          (match) => match.status !== "completed"
        ).length,
      };

      return acc;
    }, {});
  }, [competitions, competitionTeams, matches]);

  function getStatusLabel(status: string) {
    if (status === "active") return "En cours";
    if (status === "planned") return "Planifiée";
    if (status === "completed") return "Terminée";
    if (status === "draft") return "Brouillon";
    return status;
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            EA FC 26 · Tournois
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Compétitions</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Toutes les compétitions officielles de la Guardian&apos;s Family,
            créées depuis l’espace admin.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
            Chargement des compétitions...
          </div>
        )}

        {!loading && errorMessage && (
          <div className="rounded-2xl border border-red-400/30 bg-[#160A12]/90 p-6 text-red-300">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && competitions.length === 0 && (
          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
            Aucune compétition créée pour le moment.
          </div>
        )}

        {!loading && !errorMessage && competitions.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {competitions.map((competition) => {
              const stats = statsByCompetition[competition.id];

              return (
                <article
                  key={competition.id}
                  className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30"
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <span className="rounded-full border border-[#D9A441]/25 bg-[#0B0610] px-3 py-1 text-xs font-semibold text-[#F2D27A]">
                      {competition.type}
                    </span>

                    <span className="rounded-full bg-[#A61E22]/25 px-3 py-1 text-xs text-[#D8C7A0]">
                      {getStatusLabel(competition.status)}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black text-[#F7E9C5]">
                    {competition.name}
                  </h2>

                  <p className="mt-2 text-sm text-[#D8C7A0]">
                    {competition.season || "Saison non définie"}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                      <p className="text-sm text-[#8F7B5C]">Équipes</p>
                      <p className="text-2xl font-black text-[#F2D27A]">
                        {stats?.teamsCount ?? 0}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                      <p className="text-sm text-[#8F7B5C]">Matchs</p>
                      <p className="text-2xl font-black text-[#F2D27A]">
                        {stats?.matchesCount ?? 0}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                      <p className="text-sm text-[#8F7B5C]">À venir</p>
                      <p className="text-2xl font-black text-[#F2D27A]">
                        {stats?.scheduledMatchesCount ?? 0}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                      <p className="text-sm text-[#8F7B5C]">Terminés</p>
                      <p className="text-2xl font-black text-[#F2D27A]">
                        {stats?.completedMatchesCount ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <Link
                      href="/matchs"
                      className="rounded-xl bg-[#A61E22] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#8E171C]"
                    >
                      Voir les matchs
                    </Link>

                    <Link
                      href="/classement"
                      className="rounded-xl border border-[#D9A441]/30 bg-[#0B0610] px-5 py-3 text-center font-semibold text-[#F2D27A] transition hover:bg-[#1E1016]"
                    >
                      Voir le classement
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}