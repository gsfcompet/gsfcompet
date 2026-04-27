import type { ReactNode } from "react";

type FutMemberCardProps = {
  displayName: string;
  eaName?: string | null;
  email: string;
  platform?: string | null;
  role: "member" | "admin";
  registrationsCount: number;
  upcomingMatchesCount: number;
  completedMatchesCount: number;

  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalAverage: number;
  points: number;
};

export default function FutMemberCard({
  displayName,
  eaName,
  email,
  platform,
  role,
  registrationsCount,
  upcomingMatchesCount,
  completedMatchesCount,
  matchesPlayed,
  wins,
  draws,
  losses,
  goalsFor,
  goalsAgainst,
  goalAverage,
  points,
}: FutMemberCardProps) {
  const displayInitial = displayName?.charAt(0)?.toUpperCase() || "G";
  const cardRating = role === "admin" ? 99 : Math.min(99, 80 + points);

  return (
    <section className="rounded-[28px] border border-[#D9A441]/20 bg-[#160A12]/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        {/* Carte membre */}
        <div className="mx-auto w-full max-w-[340px]">
          <div className="relative overflow-hidden rounded-[30px] border border-[#D9A441]/50 bg-[radial-gradient(circle_at_top,_rgba(220,80,50,0.35),_rgba(30,8,18,0.98)_55%)] p-5 shadow-[0_0_45px_rgba(166,30,34,0.22)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(217,164,65,0.12),transparent_35%,transparent_65%,rgba(217,164,65,0.08))]" />
            <div className="pointer-events-none absolute -left-20 top-10 h-52 w-52 rounded-full bg-[#A61E22]/25 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 bottom-10 h-52 w-52 rounded-full bg-[#D9A441]/20 blur-3xl" />

            <div className="relative z-10">
              {/* Haut de carte */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-5xl font-black leading-none text-[#F2D27A]">
                    {cardRating}
                  </p>

                  <p className="mt-1 text-sm font-bold uppercase tracking-[0.25em] text-[#F2D27A]">
                    {role === "admin" ? "ADM" : "MBR"}
                  </p>

                  <div className="mt-4">
                    <div className="flex h-6 w-10 overflow-hidden rounded-sm border border-white/30 shadow">
                      <div className="h-full flex-1 bg-[#0055A4]" />
                      <div className="h-full flex-1 bg-white" />
                      <div className="h-full flex-1 bg-[#EF4135]" />
                    </div>

                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#F7E9C5]">
                      FR
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="rounded-full border border-[#D9A441]/40 bg-[#0B0610]/70 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#F2D27A]">
                    {role === "admin" ? "Admin" : "Membre"}
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#D9A441]/50 bg-[#0B0610]/80 p-1">
                    <img
                      src="/logo.png"
                      alt="Guardian's Family"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Identité */}
              <div className="mt-8 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#D9A441]/40 bg-[#2B0F16] shadow-inner shadow-black/40">
                  <span className="text-5xl font-black text-[#F7E9C5]">
                    {displayInitial}
                  </span>
                </div>

                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#D9A441]">
                  Guardian&apos;s Family
                </p>

                <h2 className="mt-2 text-3xl font-black uppercase tracking-wide text-[#F7E9C5]">
                  {displayName}
                </h2>

                <p className="mt-1 text-sm font-semibold text-[#D9A441]">
                  {eaName || "Pseudo EA FC non renseigné"}
                </p>

                <p className="mt-1 text-xs uppercase tracking-[0.25em] text-[#A98E63]">
                  {platform || "Plateforme non définie"}
                </p>
              </div>

              {/* Stats sportives */}
              <div className="mt-8 grid grid-cols-4 gap-x-3 gap-y-5 border-t border-[#D9A441]/20 pt-5">
                <Stat label="MJ" value={matchesPlayed} />
                <Stat label="V" value={wins} tone="green" />
                <Stat label="N" value={draws} tone="orange" />
                <Stat label="D" value={losses} tone="red" />

                <Stat label="BP" value={goalsFor} tone="green" />
                <Stat label="BC" value={goalsAgainst} tone="red" />
                <Stat
                  label="GA"
                  value={goalAverage > 0 ? `+${goalAverage}` : goalAverage}
                />
                <Stat label="Pts" value={points} />
              </div>

              <div className="mt-6 border-t border-[#D9A441]/20 pt-4 text-center">
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#D9A441]">
                  Loyalty • Respect • Unity
                </p>

                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-[#A61E22]">
                  Since day one
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Infos à droite */}
        <div className="grid gap-5 md:grid-cols-2">
          <InfoCard title="Informations du membre">
            <InfoRow label="Nom affiché" value={displayName} />
            <InfoRow label="Email" value={email} />
            <InfoRow label="Pseudo EA FC" value={eaName || "Non renseigné"} />
            <InfoRow label="Plateforme" value={platform || "Non définie"} />
            <InfoRow
              label="Rôle"
              value={role === "admin" ? "Admin" : "Membre"}
            />
          </InfoCard>

          <InfoCard title="Résumé">
            <InfoRow label="Inscriptions" value={registrationsCount} />
            <InfoRow label="Matchs à venir" value={upcomingMatchesCount} />
            <InfoRow label="Résultats" value={completedMatchesCount} />
            <InfoRow label="Points" value={points} tone="gold" />
          </InfoCard>

          <InfoCard title="Bilan sportif">
            <InfoRow label="Matchs joués" value={matchesPlayed} />
            <InfoRow label="Victoires" value={wins} tone="green" />
            <InfoRow label="Nuls" value={draws} tone="orange" />
            <InfoRow label="Défaites" value={losses} tone="red" />
          </InfoCard>

          <InfoCard title="Buts & différence">
            <InfoRow label="Buts pour" value={goalsFor} tone="green" />
            <InfoRow label="Buts contre" value={goalsAgainst} tone="red" />
            <InfoRow
              label="Goal average"
              value={goalAverage > 0 ? `+${goalAverage}` : goalAverage}
            />

            <div className="mt-4 rounded-xl border border-[#D9A441]/10 bg-[#160A12]/70 px-4 py-3 text-sm text-[#D8C7A0]">
              Les statistiques sont calculées uniquement à partir des matchs
              terminés.
            </div>
          </InfoCard>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone = "gold",
}: {
  label: string;
  value: string | number;
  tone?: "gold" | "green" | "orange" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-300"
      : tone === "orange"
        ? "text-orange-300"
        : tone === "red"
          ? "text-red-300"
          : "text-[#F2D27A]";

  return (
    <div className="text-center">
      <p className={`text-[10px] font-bold uppercase tracking-[0.24em] ${toneClass}`}>
        {label}
      </p>

      <p className={`mt-1 text-2xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/20 bg-[#0B0610]/70 p-5">
      <h3 className="text-lg font-black text-[#F7E9C5]">{title}</h3>

      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "gold" | "green" | "orange" | "red";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-300"
      : tone === "orange"
        ? "text-orange-300"
        : tone === "red"
          ? "text-red-300"
          : tone === "gold"
            ? "text-[#F2D27A]"
            : "text-[#F2D27A]";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#D9A441]/10 bg-[#160A12]/70 px-4 py-3">
      <span className="text-sm text-[#A98E63]">{label}</span>

      <span className={`text-right text-sm font-semibold ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}