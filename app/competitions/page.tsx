"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: "teams" | "players";
};

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadCompetitions() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(`Erreur chargement compétitions : ${error.message}`);
      setLoading(false);
      return;
    }

    setCompetitions(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCompetitions();
  }, []);

  function getStatusLabel(status: string) {
    if (status === "active") return "En cours";
    if (status === "planned") return "Planifiée";
    if (status === "completed") return "Terminée";
    if (status === "draft") return "Brouillon";
    return status;
  }

  function getParticipantTypeLabel(type: string) {
    if (type === "players") return "Joueurs EA FC";
    return "Teams / clubs";
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Compétitions
          </p>

          <h1 className="text-4xl font-black md:text-5xl">
            Les compétitions GSF
          </h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Retrouve les championnats, coupes et tournois de la Guardian&apos;s
            Family.
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
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {competitions.map((competition) => (
              <article
                key={competition.id}
                className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#D9A441]/25 bg-[#0B0610] px-3 py-1 text-xs font-semibold text-[#F2D27A]">
                    {competition.type}
                  </span>

                  <span className="rounded-full border border-[#D9A441]/25 bg-[#0B0610] px-3 py-1 text-xs font-semibold text-[#D8C7A0]">
                    {getStatusLabel(competition.status)}
                  </span>
                </div>

                <h2 className="text-2xl font-black text-[#F7E9C5]">
                  {competition.name}
                </h2>

                <p className="mt-2 text-sm text-[#D8C7A0]">
                  {competition.season || "Saison non définie"}
                </p>

                <div className="mt-5 rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                  <p className="text-xs text-[#8F7B5C]">Format</p>
                  <p className="mt-1 font-semibold text-[#F2D27A]">
                    {getParticipantTypeLabel(competition.participant_type)}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {competition.participant_type === "players" && (
                    <Link
                      href={`/competitions/${competition.id}/inscription`}
                      className="inline-flex rounded-xl bg-[#A61E22] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C]"
                    >
                      S&apos;inscrire
                    </Link>
                  )}

                  {competition.participant_type === "teams" && (
                    <span className="inline-flex rounded-xl border border-[#D9A441]/20 bg-[#0B0610]/70 px-5 py-2.5 text-sm font-semibold text-[#D8C7A0]">
                      Inter-team
                    </span>
                  )}

                  <Link
                    href="/matchs"
                    className="inline-flex rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
                  >
                    Voir les matchs
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}