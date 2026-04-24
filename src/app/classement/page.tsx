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
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <h1 className="mb-3 text-4xl font-black">Classement</h1>
      <p className="mb-8 text-slate-400">
        Classement général de la Guardian&apos;s League.
      </p>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-slate-400">
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
              <tr key={team.team} className="border-t border-white/10">
                <td className="px-4 py-4 font-bold">{index + 1}</td>
                <td className="px-4 py-4 font-bold">{team.team}</td>
                <td className="px-4 py-4 text-center">{team.played}</td>
                <td className="px-4 py-4 text-center">{team.wins}</td>
                <td className="px-4 py-4 text-center">{team.draws}</td>
                <td className="px-4 py-4 text-center">{team.losses}</td>
                <td className="px-4 py-4 text-center">
                  {team.goalsFor - team.goalsAgainst}
                </td>
                <td className="px-4 py-4 text-center font-black text-emerald-300">
                  {team.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}