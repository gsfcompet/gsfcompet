const standings = [
  {
    team: "Guardian's Family",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    team: "Elite Squad",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    team: "North Kings",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
];

export default function ClassementPage() {
  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Guardian&apos;s League
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Classement</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Classement général de la Guardian&apos;s League.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 shadow-lg shadow-black/20">
          <table className="w-full text-sm">
            <thead className="bg-[#A61E22]/25 text-[#F2D27A]">
              <tr>
                <th className="px-4 py-4 text-left">#</th>
                <th className="px-4 py-4 text-left">Équipe</th>
                <th className="px-4 py-4 text-center">J</th>
                <th className="px-4 py-4 text-center">G</th>
                <th className="px-4 py-4 text-center">N</th>
                <th className="px-4 py-4 text-center">P</th>
                <th className="px-4 py-4 text-center">Diff</th>
                <th className="px-4 py-4 text-center">Pts</th>
              </tr>
            </thead>

            <tbody>
              {standings.map((team, index) => (
                <tr
                  key={team.team}
                  className="border-t border-[#D9A441]/10 transition hover:bg-[#A61E22]/10"
                >
                  <td className="px-4 py-4 font-bold text-[#D8C7A0]">
                    {index + 1}
                  </td>

                  <td className="px-4 py-4 font-bold text-[#F7E9C5]">
                    {team.team}
                  </td>

                  <td className="px-4 py-4 text-center text-[#D8C7A0]">
                    {team.played}
                  </td>
                  <td className="px-4 py-4 text-center text-[#D8C7A0]">
                    {team.wins}
                  </td>
                  <td className="px-4 py-4 text-center text-[#D8C7A0]">
                    {team.draws}
                  </td>
                  <td className="px-4 py-4 text-center text-[#D8C7A0]">
                    {team.losses}
                  </td>
                  <td className="px-4 py-4 text-center text-[#D8C7A0]">
                    {team.goalsFor - team.goalsAgainst}
                  </td>
                  <td className="px-4 py-4 text-center font-black text-[#F2D27A]">
                    {team.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}