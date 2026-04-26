"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  manager: string | null;
};

type Match = {
  id: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  mvp: string | null;
};

export default function MatchsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const teamsResult = await supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: false });

    const matchesResult = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true, nullsFirst: false });

    if (teamsResult.error) {
      setErrorMessage(`Erreur équipes : ${teamsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (matchesResult.error) {
      setErrorMessage(`Erreur matchs : ${matchesResult.error.message}`);
      setLoading(false);
      return;
    }

    setTeams(teamsResult.data ?? []);
    setMatches(matchesResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function getTeamName(teamId: string) {
    return teams.find((team) => team.id === teamId)?.name ?? "Équipe inconnue";
  }

  function formatDate(date: string | null) {
    if (!date) return "À planifier";

    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  }

  function getScore(match: Match) {
    if (match.status === "completed") {
      return `${match.home_score ?? 0} - ${match.away_score ?? 0}`;
    }

    return "VS";
  }

  function getStatusLabel(status: string) {
    if (status === "completed") return "Terminé";
    if (status === "scheduled") return "À venir";
    return status;
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Calendrier
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Matchs</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Calendrier des matchs et résultats officiels de la saison.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
            Chargement des matchs...
          </div>
        )}

        {!loading && errorMessage && (
          <div className="rounded-2xl border border-red-400/30 bg-[#160A12]/90 p-6 text-red-300">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && matches.length === 0 && (
          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
            Aucun match créé pour le moment.
          </div>
        )}

        {!loading && !errorMessage && matches.length > 0 && (
          <div className="space-y-4">
            {matches.map((match) => (
              <article
                key={match.id}
                className="grid gap-5 rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30 md:grid-cols-[1fr_auto_1fr_auto]"
              >
                <div>
                  <p className="text-sm text-[#8F7B5C]">Domicile</p>
                  <p className="text-xl font-black text-[#F7E9C5]">
                    {getTeamName(match.home_team_id)}
                  </p>
                </div>

                <div className="flex items-center justify-center rounded-xl border border-[#D9A441]/30 bg-[#A61E22]/30 px-8 py-3 text-xl font-black text-[#F2D27A]">
                  {getScore(match)}
                </div>

                <div>
                  <p className="text-sm text-[#8F7B5C]">Extérieur</p>
                  <p className="text-xl font-black text-[#F7E9C5]">
                    {getTeamName(match.away_team_id)}
                  </p>
                </div>

                <div className="md:text-right">
                  <p className="text-sm text-[#8F7B5C]">
                    {getStatusLabel(match.status)}
                  </p>
                  <p className="font-semibold text-[#D8C7A0]">
                    {formatDate(match.match_date)}
                  </p>

                  {match.mvp && (
                    <p className="mt-2 text-sm text-[#F2D27A]">
                      MVP : {match.mvp}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}