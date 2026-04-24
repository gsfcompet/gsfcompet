const teams = [
  "Guardian's Family",
  "Elite Squad",
  "North Kings",
  "Black Lions",
  "Street Ballers",
  "Final Boss FC",
];

export default function EquipesPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <h1 className="mb-3 text-4xl font-black">Équipes</h1>
      <p className="mb-8 text-slate-400">
        Liste des équipes inscrites aux compétitions GSF Compet.
      </p>

      <div className="grid gap-5 md:grid-cols-3">
        {teams.map((team) => (
          <div
            key={team}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl font-black text-emerald-300">
              {team.charAt(0)}
            </div>
            <h2 className="text-xl font-black">{team}</h2>
            <p className="mt-2 text-sm text-slate-400">Manager à définir</p>
          </div>
        ))}
      </div>
    </main>
  );
}