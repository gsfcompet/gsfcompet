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
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Participants
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Équipes</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Liste des équipes inscrites aux compétitions GSF Compet.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {teams.map((team) => (
            <div
              key={team}
              className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/20"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D9A441]/30 bg-[#A61E22]/30 text-2xl font-black text-[#F2D27A]">
                {team.charAt(0)}
              </div>

              <h2 className="text-xl font-black text-[#F7E9C5]">{team}</h2>

              <p className="mt-2 text-sm text-[#D8C7A0]">
                Manager à définir
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}