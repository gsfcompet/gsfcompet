"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { canAccessAdminModule, type AppRole } from "@/lib/roles";

type Profile = {
  id: string;
  role: AppRole;
  username: string | null;
};

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isAdmin = canAccessAdminModule(profile?.role, "admin");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setIsLoggedIn(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, username")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
      }
    }

    loadProfile();
  }, [supabase]);

  return (
    <main
      className="min-h-screen text-[#CFC6AB]"
      style={{
        background:
          "radial-gradient(1200px 700px at 10% -10%, #12274A 0%, #0B1B33 60%)",
      }}
    >
      <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <section className="relative overflow-hidden rounded-[32px] border border-[#C39B55]/25 bg-[#12274A] p-6 shadow-2xl shadow-black/40 sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[url('/banniere-gsf-v2.png')] bg-cover bg-center opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B1B33]/95 via-[#0B1B33]/85 to-[#12274A]/80" />

          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-[#C39B55]">
              Guardian's
            </p>

            <h1 className="mt-3 text-3xl font-black text-[#CFC6AB] sm:text-5xl">
              Bienvenue chez Guardian's
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#DBC399] sm:text-base">
              Retrouvez au même endroit les compétitions, les statistiques et
              l’histoire de la Guardian's.
            </p>

            {isLoggedIn && (
              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                <Link
                  href="/competitions"
                  className="group rounded-2xl border border-[#C39B55]/35 bg-black/25 p-5 transition hover:border-[#C39B55]/70 hover:bg-black/40 sm:p-6"
                >
                  <span className="text-3xl" aria-hidden="true">
                    🏆
                  </span>
                  <h2 className="mt-4 text-xl font-black text-[#CFC6AB]">
                    Guardian's Compétition
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#DBC399]">
                    Compétitions, équipes, matchs et résultats.
                  </p>
                  <span className="mt-5 inline-flex rounded-lg bg-[#C39B55] px-4 py-2.5 text-sm font-black text-[#0B1B33] transition group-hover:bg-[#DBC399]">
                    Accéder aux compétitions{" "}
                    <span aria-hidden="true">→</span>
                  </span>
                </Link>

                <a
                  href="https://guardiansfamily.netlify.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-[#C39B55]/35 bg-black/25 p-5 transition hover:border-[#C39B55]/70 hover:bg-black/40 sm:p-6"
                >
                  <span className="text-3xl" aria-hidden="true">
                    📊
                  </span>
                  <h2 className="mt-4 text-xl font-black text-[#CFC6AB]">
                    Stats & histoire
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#DBC399]">
                    Statistiques, effectifs, gazettes et archives de la team.
                  </p>
                  <span className="mt-5 inline-flex rounded-lg border border-[#C39B55]/40 px-4 py-2.5 text-sm font-black text-[#DBC399] transition hover:bg-[#C39B55]/10">
                    Découvrir les statistiques{" "}
                    <span aria-hidden="true">→</span>
                  </span>
                </a>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/membre"
                className="rounded-lg border border-[#C39B55]/30 bg-black/20 px-4 py-2 text-sm font-bold text-[#DBC399] transition hover:bg-black/40"
              >
                Espace membre
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-[#371015]/70 bg-[#371015]/50 px-4 py-2 text-sm font-bold text-[#CFC6AB] transition hover:bg-[#371015]/70"
                >
                  Administration
                </Link>
              )}
            </div>
          </div>
        </section>

        {isAdmin && !isLoggedIn && (
          <div className="mt-8">
            <QuickAccessPanel />
          </div>
        )}
      </section>
    </main>
  );
}

function QuickAccessPanel() {
  return (
    <section className="rounded-[28px] border border-[#C39B55]/25 bg-[#12274A]/90 p-6 shadow-2xl shadow-black/30">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.32em] text-[#C39B55]">
          Navigation
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#CFC6AB]">
          Accès rapide
        </h2>
        <p className="mt-2 text-sm text-[#DBC399]">
          Les raccourcis d’administration.
        </p>
      </div>

      <div className="rounded-2xl border border-[#371015]/40 bg-[#371015]/20 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-[0.22em] text-[#DBC399]">
            Administration
          </h3>
          <span className="rounded-full border border-[#C39B55]/25 px-3 py-1 text-[10px] font-black uppercase text-[#CFC6AB]">
            Gestion
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <QuickLink
            href="/admin"
            badge="AD"
            title="Admin"
            text="Créer et gérer les compétitions."
            tone="red"
          />
          <QuickLink
            href="/admin/teams"
            badge="TE"
            title="Teams esport"
            text="Créer les teams et gérer leurs inscriptions."
            tone="blue"
          />
          <QuickLink
            href="/admin/membres"
            badge="MB"
            title="Membres"
            text="Modifier les rôles et gérer les comptes."
            tone="green"
          />
          <QuickLink
            href="/admin/gazette"
            badge="PDF"
            title="Gazette"
            text="Publier, archiver ou supprimer les PDF."
            tone="gold"
          />
        </div>
      </div>
    </section>
  );
}

function QuickLink({
  href,
  badge,
  title,
  text,
  tone = "gold",
}: {
  href: string;
  badge: string;
  title: string;
  text: string;
  tone?: "gold" | "red" | "green" | "blue";
}) {
  const toneClass =
    tone === "red"
      ? "border-[#371015]/60 bg-[#371015]/35 text-[#CFC6AB]"
      : tone === "green"
        ? "border-[#2EC4B6]/35 bg-[#2EC4B6]/10 text-[#2EC4B6]"
        : tone === "blue"
          ? "border-blue-400/35 bg-blue-500/10 text-blue-200"
          : "border-[#C39B55]/35 bg-[#C39B55]/10 text-[#DBC399]";

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#C39B55]/20 bg-black/15 p-4 transition hover:border-[#C39B55]/50 hover:bg-[#C39B55]/5"
    >
      <div className="flex items-start gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xs font-black uppercase tracking-wider transition group-hover:scale-105 ${toneClass}`}
        >
          {badge}
        </span>

        <div className="min-w-0">
          <p className="truncate font-black text-[#CFC6AB]">{title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#DBC399]">
            {text}
          </p>
        </div>
      </div>
    </Link>
  );
}