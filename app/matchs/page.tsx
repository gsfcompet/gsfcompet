const matches = [
  {
    home: "Guardian's Family",
    away: "Elite Squad",
    date: "À planifier",
    status: "À venir",
    score: "VS",
  },
  {
    home: "North Kings",
    away: "Black Lions",
    date: "À planifier",
    status: "À venir",
    score: "VS",
  },
  {
    home: "Street Ballers",
    away: "Final Boss FC",
    date: "À planifier",
    status: "À venir",
    score: "VS",
  },
];

export default function MatchsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <h1 className="mb-3 text-4xl font-black">Matchs</h1>
      <p className="mb-8 text-slate-400">
        Calendrier des matchs et résultats de la saison.
      </p>

      <div className="space-y-4">
        {matches.map((match) => (
          <div
            key={`${match.home}-${match.away}`}
            className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:grid-cols-[1fr_auto_1fr_auto]"
          >
            <div>
              <p className="text-sm text-slate-500">Domicile</p>
              <p className="text-xl font-black">{match.home}</p>
            </div>

            <div className="flex items-center justify-center rounded-xl bg-white/10 px-6 py-3 text-xl font-black text-emerald-300">
              {match.score}
            </div>

            <div>
              <p className="text-sm text-slate-500">Extérieur</p>
              <p className="text-xl font-black">{match.away}</p>
            </div>

            <div className="text-right">
              <p className="text-sm text-slate-500">{match.status}</p>
              <p className="font-semibold">{match.date}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}