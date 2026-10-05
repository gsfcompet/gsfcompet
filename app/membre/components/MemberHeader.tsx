"use client";

import Link from "next/link";

export function MemberHeader() {
  return (
    <section
      aria-labelledby="member-header-title"
      className="w-full rounded-[28px] border border-[#C39B55]/30 bg-gradient-to-br from-[#12274A] via-[#0B1B33] to-[#0B1B33] p-6 shadow-2xl shadow-black/40"
    >
      <div className="flex min-h-[92px] flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.35em] text-[#DBC399]">
            Guardian's
          </p>

          <h1
            id="member-header-title"
            className="mt-2 text-3xl font-black text-[#cfc6ab] drop-shadow md:text-5xl"
          >
            Espace membre
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-[#cfc6ab] md:text-base">
            Retrouve tes compétitions, tes matchs à jouer et le statut de
            validation des scores proposés.
          </p>
        </div>

        <nav aria-label="Navigation membre" className="flex flex-wrap gap-3">
          <Link
            href="/membre/profil"
            className="rounded-xl border border-[#C39B55]/50 bg-[#C39B55] px-5 py-3 text-sm font-black text-[#0B1B33] shadow-lg shadow-black/30 transition hover:bg-[#DBC399] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DBC399] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1B33]"
          >
            Modifier mon profil
          </Link>

          <Link
            href="/classement"
            className="rounded-xl border border-[#C39B55]/30 bg-[#12274A] px-5 py-3 text-sm font-black text-[#DBC399] shadow-lg shadow-black/30 transition hover:bg-[#0B1B33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DBC399] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1B33]"
          >
            Voir le classement
          </Link>
        </nav>
      </div>
    </section>
  );
}