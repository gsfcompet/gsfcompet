export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 rounded-full bg-emerald-400/10 px-5 py-2 text-sm font-semibold text-emerald-300">
          EA FC 26 · Guardian&apos;s Family
        </div>

        <h1 className="mb-6 text-5xl font-black tracking-tight md:text-7xl">
          GSF Compet
        </h1>

        <p className="mb-8 max-w-2xl text-lg text-slate-300 md:text-xl">
          Le hub officiel pour organiser les championnats, coupes, matchs,
          résultats et classements de la Guardian&apos;s Family.
        </p>

        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-3xl font-black text-emerald-300">0</p>
            <p className="mt-2 text-sm text-slate-300">Compétitions</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-3xl font-black text-emerald-300">0</p>
            <p className="mt-2 text-sm text-slate-300">Équipes</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-3xl font-black text-emerald-300">0</p>
            <p className="mt-2 text-sm text-slate-300">Matchs joués</p>
          </div>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          Site en construction · Saison 1 bientôt disponible
        </p>
      </section>
    </main>
  );
}