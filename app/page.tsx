"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [competitionsCount, setCompetitionsCount] = useState(0);
  const [teamsCount, setTeamsCount] = useState(0);
  const [playedMatchesCount, setPlayedMatchesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    setLoading(true);

    const competitionsResult = await supabase
      .from("competitions")
      .select("id", { count: "exact", head: true });

    const teamsResult = await supabase
      .from("teams")
      .select("id", { count: "exact", head: true });

    const playedMatchesResult = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed");

    setCompetitionsCount(competitionsResult.count ?? 0);
    setTeamsCount(teamsResult.count ?? 0);
    setPlayedMatchesCount(playedMatchesResult.count ?? 0);

    setLoading(false);
  }

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#0B0610] text-[#F7E9C5]">
      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="absolute left-1/2 top-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#A61E22]/20 blur-3xl" />
        <div className="absolute right-10 top-28 -z-10 h-64 w-64 rounded-full bg-[#D9A441]/10 blur-3xl" />
        <div className="absolute bottom-20 left-10 -z-10 h-72 w-72 rounded-full bg-[#6E1015]/30 blur-3xl" />

        <div className="mb-8">
          <Image
            src="/logo-gf.png"
            alt="Guardian's Family"
            width={180}
            height={180}
            className="mx-auto rounded-full border border-[#D9A441]/40 shadow-[0_0_45px_rgba(217,164,65,0.35)]"
            priority
          />
        </div>

        <div className="mb-6 rounded-full border border-[#D9A441]/30 bg-[#160A12] px-5 py-2 text-sm font-semibold text-[#F2D27A]">
          EA FC 26 · Guardian&apos;s Family
        </div>

        <h1 className="mb-6 text-5xl font-black tracking-tight text-[#F7E9C5] md:text-7xl">
          GSF Compet
        </h1>

        <p className="mb-8 max-w-2xl text-lg leading-relaxed text-[#D8C7A0] md:text-xl">
          Le hub officiel pour organiser les championnats, coupes, matchs,
          résultats et classements de la Guardian&apos;s Family.
        </p>

        <div className="mb-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/competitions"
            className="rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white shadow-lg shadow-[#A61E22]/25 transition hover:bg-[#8E171C]"
          >
            Voir les compétitions
          </Link>

          <Link
            href="/classement"
            className="rounded-xl border border-[#D9A441]/30 bg-[#160A12] px-6 py-3 font-semibold text-[#F2D27A] transition hover:bg-[#1E1016]"
          >
            Voir le classement
          </Link>
        </div>

        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
          <StatCard
            value={loading ? "..." : competitionsCount}
            label="Compétitions"
          />

          <StatCard value={loading ? "..." : teamsCount} label="Équipes" />

          <StatCard
            value={loading ? "..." : playedMatchesCount}
            label="Matchs joués"
          />
        </div>

        <div className="mt-10 rounded-2xl border border-[#D9A441]/15 bg-[#160A12]/70 px-6 py-4">
          <p className="text-sm text-[#D8C7A0]">
            Site officiel Guardian&apos;s Family · Saison 1 en cours
          </p>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg">
      <p className="text-3xl font-black text-[#F2D27A]">{value}</p>
      <p className="mt-2 text-sm text-[#D8C7A0]">{label}</p>
    </div>
  );
}