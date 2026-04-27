"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: "teams" | "players";
  created_at: string;
};

export default function CompetitionsPage() {
  const supabase = createClient();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadCompetitions() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Erreur chargement compétitions : ${error.message}`);
      setLoading(false);
      return;
    }

    setCompetitions((data ?? []) as Competition[]);
    setLoading(false);
  }

  useEffect(() => {
    loadCompetitions();
  }, []);

  function getTypeLabel(type: string) {
    if (type === "league") return "Championnat";
    if (type === "cup") return "Coupe";
    if (type === "tournament") return "Tournoi";

    return type;
  }

  function getParticipantTypeLabel(participantType: "teams" | "players") {
    if (participantType === "players") return "Joueurs EA FC";
    return "Équipes / clubs";
  }

  function getStatusLabel(status: string) {
    if (status === "draft") return "Brouillon";
    if (status === "active") return "En cours";
    if (status === "completed") return "Terminée";
    if (status === "archived") return "Archivée";

    return status;
  }

  function getStatusClass(status: string) {
    if (status === "active") {
      return "border-green-400/30 text-green-300";
    }

    if (status === "completed") {
      return "border-blue-400/30 text-blue-300";
    }

    if (status === "archived") {
      return "border-gray-400/30 text-gray-300";
    }

    return "border-[#D9A441]/30 text-[#F2D27A]";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="text-[#D8C7A0]">Chargement des compétitions...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Compétitions
          </p>

          <h1 className="text-4xl font-black md:text-5xl">
            Compétitions Guardian&apos;s Family
          </h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Consulte les compétitions disponibles, inscris-toi, suis les matchs
            et regarde le classement.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-red-400/30 bg-[#160A12] p-4 text-sm text-red-300">
              {message}
            </div>
          )}
        </div>

        {competitions.length === 0 ? (
          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <h2 className="text-2xl font-black text-[#F7E9C5]">
              Aucune compétition
            </h2>

            <p className="mt-3 text-[#D8C7A0]">
              Aucune compétition n’est disponible pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {competitions.map((competition) => (
              <article
                key={competition.id}
                className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30 transition hover:border-[#D9A441]/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-[#F7E9C5]">
                      {competition.name}
                    </h2>

                    <p className="mt-2 text-sm text-[#D8C7A0]">
                      {getTypeLabel(competition.type)}
                      {competition.season ? ` · ${competition.season}` : ""}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                      competition.status
                    )}`}
                  >
                    {getStatusLabel(competition.status)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#D9A441]/30 bg-[#0B0610]/60 px-3 py-1 text-xs font-semibold text-[#F2D27A]">
                    {getParticipantTypeLabel(competition.participant_type)}
                  </span>

                  <span className="rounded-full border border-[#D9A441]/30 bg-[#0B0610]/60 px-3 py-1 text-xs font-semibold text-[#F2D27A]">
                    Saison : {competition.season || "Non définie"}
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/competitions/${competition.id}/matchs`}
                    className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
                  >
                    Matchs
                  </Link>

                  <Link
                    href={`/competitions/${competition.id}/classement`}
                    className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
                  >
                    Classement
                  </Link>

                  <Link
                    href={`/competitions/${competition.id}/inscription`}
                    className="rounded-xl bg-[#A61E22] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C]"
                  >
                    Inscription
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