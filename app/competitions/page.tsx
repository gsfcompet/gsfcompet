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
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Tournois EA FC 26
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Compétitions</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Gérez les championnats, coupes et tournois EA FC 26 de la
            Guardian&apos;s Family.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {competitions.map((competition) => (
            <div
              key={competition.name}
              className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/20"
            >
              <p className="mb-2 text-sm font-semibold text-[#F2D27A]">
                {competition.type}
              </p>

              <h2 className="text-2xl font-black text-[#F7E9C5]">
                {competition.name}
              </h2>

              <div className="mt-5 space-y-2 text-[#D8C7A0]">
                <p>Statut : {competition.status}</p>
                <p>Participants : {competition.players}</p>
              </div>

              <button className="mt-6 rounded-xl bg-[#A61E22] px-5 py-3 font-semibold text-white transition hover:bg-[#8E171C]">
                Voir la compétition
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}