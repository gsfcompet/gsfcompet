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
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-[#D9A441]/25 bg-black shadow-2xl shadow-black/40">
          <Image
            src="/banniere-gsf-v2.png"
            alt="Guardian's Family"
            width={2048}
            height={768}
            className="h-[320px] w-full object-cover object-center md:h-[460px]"
            priority
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0610]/60 via-transparent to-transparent" />

          <div className="absolute bottom-5 left-[13%] hidden md:block">
            <Link
              href="/competitions"
              className="rounded-lg bg-[#A61E22]/85 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C]"
            >
              Voir les compétitions
            </Link>
          </div>

          <div className="absolute bottom-5 right-[13%] hidden md:block">
            <Link
              href="/classement"
              className="rounded-lg border border-[#D9A441]/30 bg-[#160A12]/75 px-4 py-2 text-sm font-semibold text-[#F2D27A] shadow-lg shadow-black/20 backdrop-blur transition hover:bg-[#1E1016]"
            >
              Voir le classement
            </Link>
          </div>

          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3 px-4 md:hidden">
            <Link
              href="/competitions"
              className="rounded-md bg-[#A61E22]/85 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#A61E22]/15"
            >
              Compétitions
            </Link>

            <Link
              href="/classement"
              className="rounded-md border border-[#D9A441]/30 bg-[#160A12]/75 px-3 py-1.5 text-xs font-semibold text-[#F2D27A] backdrop-blur"
            >
              Classement
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
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

        <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-[#D9A441]/15 bg-[#160A12]/70 px-6 py-4 text-center">
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
    <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
      <p className="text-3xl font-black text-[#F2D27A]">{value}</p>
      <p className="mt-2 text-sm text-[#D8C7A0]">{label}</p>
    </div>
  );
}