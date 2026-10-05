import { Fragment, type ReactNode } from "react";

type ScoreStatus = "pending" | "validated" | "refused" | null;

export type MemberMatchTableRow = {
  id: string;
  competition: string;
  date: string;
  homeName: string;
  awayName: string;
  scoreLabel: string;
  scoreStatus: ScoreStatus;
  actionNode?: ReactNode;
  expandedNode?: ReactNode;
};

type MemberMatchesTableProps = {
  title: string;
  description: string;
  count: number;
  rows: MemberMatchTableRow[];
  emptyText: string;
};

function CompactScoreStatusBadge({ status }: { status: ScoreStatus }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#C39B55]/40 bg-[#C39B55]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#DBC399]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#DBC399]" />
        Attente
      </span>
    );
  }

  if (status === "validated") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#2EC4B6]/40 bg-[#2EC4B6]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#2EC4B6]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#2EC4B6]" />
        Validé
      </span>
    );
  }

  if (status === "refused") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#E58A8F]/40 bg-[#371015]/40 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#E58A8F]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#E58A8F]" />
        Refusé
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#7189AA]/30 bg-[#7189AA]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#A7B5C9]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#A7B5C9]" />
      Aucun
    </span>
  );
}

export default function MemberMatchesTable({
  title,
  description,
  count,
  rows,
  emptyText,
}: MemberMatchesTableProps) {
  const hasActions = rows.some((row) => row.actionNode || row.expandedNode);
  const colSpan = hasActions ? 7 : 6;

  return (
    <section className="rounded-[28px] border border-[#C39B55]/25 bg-[#0B1B33]/95 p-5 shadow-2xl shadow-black/40">
      <div className="mb-5 flex min-h-[58px] items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black leading-none text-[#DBC399]">
            {title}
          </h2>

          <p className="mt-2 text-sm leading-5 text-[#CFC6AB]/60">
            {description}
          </p>
        </div>

        <span className="flex h-9 min-w-9 items-center justify-center rounded-full border border-[#C39B55]/40 bg-[#07111f]/70 px-3 text-sm font-black text-[#DBC399] shadow-inner shadow-black/30">
          {count}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#C39B55]/20 bg-[#07111f]/40">
        <div className="max-h-[360px] overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed border-collapse text-left text-[11px] xl:text-xs">
            <colgroup>
              <col style={{ width: hasActions ? "22%" : "24%" }} />
              <col style={{ width: hasActions ? "16%" : "17%" }} />
              <col style={{ width: hasActions ? "13%" : "15%" }} />
              <col style={{ width: hasActions ? "8%" : "9%" }} />
              <col style={{ width: hasActions ? "13%" : "15%" }} />
              <col style={{ width: hasActions ? "16%" : "20%" }} />
              {hasActions && <col style={{ width: "12%" }} />}
            </colgroup>

            <thead className="sticky top-0 z-10 bg-[#12274a] text-[9px] uppercase tracking-[0.18em] text-[#DBC399]">
              <tr>
                <th className="border-b border-[#C39B55]/25 px-3 py-3">
                  Compétition
                </th>
                <th className="border-b border-[#C39B55]/25 px-3 py-3">
                  Date
                </th>
                <th className="border-b border-[#C39B55]/25 px-3 py-3">
                  Domicile
                </th>
                <th className="border-b border-[#C39B55]/25 px-3 py-3 text-center">
                  Score
                </th>
                <th className="border-b border-[#C39B55]/25 px-3 py-3">
                  Extérieur
                </th>
                <th className="border-b border-[#C39B55]/25 px-3 py-3 text-right">
                  Statut
                </th>

                {hasActions && (
                  <th className="border-b border-[#C39B55]/25 px-3 py-3 text-right">
                    Action
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="px-4 py-8 text-center text-sm text-[#CFC6AB]/55"
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <Fragment key={row.id}>
                    <tr className="border-b border-[#C39B55]/10 transition hover:bg-[#C39B55]/5">
                      <td className="px-3 py-4 font-black leading-5 text-[#CFC6AB]">
                        {row.competition}
                      </td>

                      <td className="px-3 py-4 leading-5 text-[#CFC6AB]/55">
                        {row.date}
                      </td>

                      <td className="truncate px-3 py-4 font-bold text-[#CFC6AB]">
                        {row.homeName}
                      </td>

                      <td className="px-3 py-4 text-center">
                        <span className="inline-flex min-w-[54px] justify-center rounded-xl border border-[#C39B55]/30 bg-[#07111f] px-2 py-2 text-sm font-black text-[#DBC399] shadow-inner shadow-black/40">
                          {row.scoreLabel}
                        </span>
                      </td>

                      <td className="truncate px-3 py-4 font-bold text-[#CFC6AB]">
                        {row.awayName}
                      </td>

                      <td className="px-3 py-4 text-right">
                        <CompactScoreStatusBadge status={row.scoreStatus} />
                      </td>

                      {hasActions && (
                        <td className="px-3 py-4 text-right">
                          <div className="flex justify-end">{row.actionNode}</div>
                        </td>
                      )}
                    </tr>

                    {row.expandedNode && (
                      <tr className="border-b border-[#C39B55]/10 bg-[#07111f]/30">
                        <td colSpan={colSpan} className="px-4 py-4">
                          {row.expandedNode}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}