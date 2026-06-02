"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function AdminCompetitionPage() {
  const params = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-[#0B0610] px-6 py-12 text-[#F7E9C5]">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A]"
          >
            ← Retour admin
          </Link>

          <Link
            href="/competitions"
            className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A]"
          >
            Compétitions
          </Link>
        </div>

        <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-8 shadow-lg shadow-black/30">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Administration compétition
          </p>

          <h1 className="text-4xl font-black">
            Page admin compétition OK
          </h1>

          <p className="mt-4 text-[#D8C7A0]">
            ID compétition :{" "}
            <span className="font-semibold text-[#F2D27A]">{params.id}</span>
          </p>

          <p className="mt-4 text-[#D8C7A0]">
            Si tu vois cette page correctement, le problème venait bien du collage précédent.
          </p>
        </div>
      </section>
    </main>
  );
}
