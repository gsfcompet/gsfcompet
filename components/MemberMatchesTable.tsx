import ScoreStatusBadge from "@/components/ScoreStatusBadge";

type ScoreStatus = "pending" | "validated" | "refused" | null;

export type MemberMatchTableRow = {
  id: string;
  competition: string;
  date: string;
  homeName: string;
  awayName: string;
  scoreLabel: string;
  scoreStatus: ScoreStatus;
};

type MemberMatchesTableProps = {
  title: string;
  description: string;
  count: number;
  rows: MemberMatchTableRow[];
  emptyText: string;
};

export default function MemberMatchesTable({
  title,
  description,
  count,
  rows,
  emptyText,
}: MemberMatchesTableProps) {
  return (
    <section className="rounded-3xl border border-yellow-700/30 bg-[#140711] p-5 shadow-2xl shadow-black/40">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-yellow-100">{title}</h2>
          <p className="mt-1 text-sm text-yellow-100/60">{description}</p>
        </div>

        <span className="rounded-full border border-yellow-500/30 bg-black/40 px-3 py-1 text-sm font-black text-yellow-200">
          {count}
        </span>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-2xl border border-yellow-700/25 bg-black/25">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#21070b] text-[11px] uppercase tracking-[0.18em] text-yellow-200">
            <tr>
              <th className="border-b border-yellow-700/30 px-4 py-3">
                Compétition
              </th>
              <th className="border-b border-yellow-700/30 px-4 py-3">
                Date
              </th>
              <th className="border-b border-yellow-700/30 px-4 py-3">
                Domicile
              </th>
              <th className="border-b border-yellow-700/30 px-4 py-3 text-center">
                Score
              </th>
              <th className="border-b border-yellow-700/30 px-4 py-3">
                Extérieur
              </th>
              <th className="border-b border-yellow-700/30 px-4 py-3 text-right">
                Statut
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-yellow-100/55"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-yellow-900/25 transition hover:bg-yellow-400/5"
                >
                  <td className="px-4 py-3 font-black text-yellow-100">
                    {row.competition}
                  </td>

                  <td className="px-4 py-3 text-yellow-100/55">
                    {row.date}
                  </td>

                  <td className="px-4 py-3 font-bold text-yellow-100">
                    {row.homeName}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex min-w-[76px] justify-center rounded-xl border border-yellow-700/35 bg-[#07000d] px-3 py-2 text-lg font-black text-yellow-100">
                      {row.scoreLabel}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-bold text-yellow-100">
                    {row.awayName}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <ScoreStatusBadge status={row.scoreStatus} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
