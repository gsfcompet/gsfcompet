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
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Calendrier
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Matchs</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Calendrier des matchs et résultats de la saison.
          </p>
        </div>

        <div className="space-y-4">
          {matches.map((match) => (
            <div
              key={`${match.home}-${match.away}`}
              className="grid gap-4 rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/20 md:grid-cols-[1fr_auto_1fr_auto]"
            >
              <div>
                <p className="text-sm text-[#8F7B5C]">Domicile</p>
                <p className="text-xl font-black text-[#F7E9C5]">
                  {match.home}
                </p>
              </div>

              <div className="flex items-center justify-center rounded-xl border border-[#D9A441]/30 bg-[#A61E22]/30 px-6 py-3 text-xl font-black text-[#F2D27A]">
                {match.score}
              </div>

              <div>
                <p className="text-sm text-[#8F7B5C]">Extérieur</p>
                <p className="text-xl font-black text-[#F7E9C5]">
                  {match.away}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-[#8F7B5C]">{match.status}</p>
                <p className="font-semibold text-[#D8C7A0]">{match.date}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}