"use client";

import Link from "next/link";

export function MemberHeader() {
  return (
    <section className="w-full rounded-[28px] border border-yellow-700/30 bg-gradient-to-br from-[#21070b] via-[#12040d] to-black p-6 shadow-2xl shadow-black/50">
      <div className="flex min-h-[92px] flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.35em] text-yellow-400">
            Guardian&apos;s Family
          </p>

          <h1 className="mt-2 text-3xl font-black text-yellow-100 drop-shadow md:text-5xl">
            Espace membre
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-yellow-100/75 md:text-base">
            Retrouve tes compétitions, tes matchs à jouer et le statut de validation des scores proposés.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/membre/profil"
            className="rounded-xl border border-yellow-400/50 bg-yellow-400 px-5 py-3 text-sm font-black text-black shadow-lg shadow-yellow-950/30 transition hover:bg-yellow-300"
          >
            Modifier mon profil
          </Link>

          <Link
            href="/classement"
            className="rounded-xl border border-red-500/40 bg-red-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-red-600"
          >
            Voir le classement
          </Link>
        </div>
      </div>
    </section>
  );
}
