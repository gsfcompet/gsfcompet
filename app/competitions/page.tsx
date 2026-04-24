const competitions = [
  {
    name: "Guardian's League",
    type: "Championnat",
    status: "En préparation",
    players: 0,
  },
  {
    name: "Coupe Guardian's Family",
    type: "Élimination directe",
    status: "À venir",
    players: 0,
  },
];

export default function CompetitionsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <h1 className="mb-3 text-4xl font-black">Compétitions</h1>
      <p className="mb-8 text-slate-400">
        Gérez les championnats, coupes et tournois EA FC 26 de la Guardian&apos;s Family.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        {competitions.map((competition) => (
          <div
            key={competition.name}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <p className="mb-2 text-sm font-semibold text-emerald-300">
              {competition.type}
            </p>
            <h2 className="text-2xl font-black">{competition.name}</h2>
            <p className="mt-3 text-slate-400">Statut : {competition.status}</p>
            <p className="text-slate-400">Participants : {competition.players}</p>
          </div>
        ))}
      </div>
    </main>
  );
}