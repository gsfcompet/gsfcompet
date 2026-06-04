"use client";

import { Fragment, type ReactNode } from "react";

type AdminMatchFilter = {
  key: string;
  label: string;
  count: number;
};

export type AdminCompetitionMatchTableRow = {
  id: string;
  dateLabel: string;
  homeTitle: string;
  homeSubtitle: string;
  awayTitle: string;
  awaySubtitle: string;
  scoreLabel: string;
  matchStatusLabel: string;
  matchStatusClassName: string;
  scoreStatusLabel: string;
  scoreStatusClassName: string;
  submittedScoreLabel: string;
  actionNode: ReactNode;
  expandedNode?: ReactNode;
};

type AdminCompetitionMatchesTableProps = {
  title: string;
  description: string;
  filters: AdminMatchFilter[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  rows: AdminCompetitionMatchTableRow[];
  emptyText: string;
};

export default function AdminCompetitionMatchesTable({
  title,
  description,
  filters,
  activeFilter,
  onFilterChange,
  rows,
  emptyText,
}: AdminCompetitionMatchesTableProps) {
  return (
    <section className="mt-8 rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#F7E9C5]">{title}</h2>

          <p className="mt-2 text-sm text-[#D8C7A0]">{description}</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = activeFilter === filter.key;

          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => onFilterChange(filter.key)}
              className={
                active
                  ? "rounded-xl border border-[#D9A441]/50 bg-[#D9A441] px-4 py-2 text-sm font-black text-black shadow-lg shadow-[#D9A441]/20"
                  : "rounded-xl border border-[#D9A441]/25 bg-[#0B0610]/70 px-4 py-2 text-sm font-black text-[#F2D27A] transition hover:bg-[#160A12]"
              }
            >
              {filter.label}
              <span
                className={
                  active
                    ? "ml-2 rounded-full bg-black/20 px-2 py-0.5 text-xs"
                    : "ml-2 rounded-full bg-black/40 px-2 py-0.5 text-xs text-[#D8C7A0]"
                }
              >
                {filter.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70">
        <div className="max-h-[560px] overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed border-collapse text-left text-xs xl:text-sm">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[20%]" />
              <col className="w-[9%]" />
              <col className="w-[20%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[11%]" />
            </colgroup>

            <thead className="sticky top-0 z-10 bg-[#26070b] text-[10px] uppercase tracking-[0.18em] text-[#F2D27A]">
              <tr>
                <th className="border-b border-[#D9A441]/20 px-4 py-3">
                  Date
                </th>
                <th className="border-b border-[#D9A441]/20 px-4 py-3">
                  Domicile
                </th>
                <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center">
                  Score
                </th>
                <th className="border-b border-[#D9A441]/20 px-4 py-3">
                  Extérieur
                </th>
                <th className="border-b border-[#D9A441]/20 px-4 py-3 text-right">
                  Match
                </th>
                <th className="border-b border-[#D9A441]/20 px-4 py-3 text-right">
                  Score proposé
                </th>
                <th className="border-b border-[#D9A441]/20 px-4 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-[#D8C7A0]"
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <Fragment key={row.id}>
                    <tr className="border-b border-[#D9A441]/10 transition hover:bg-[#D9A441]/5">
                      <td className="px-4 py-4 text-[#D8C7A0]">
                        {row.dateLabel}
                      </td>

                      <td className="px-4 py-4">
                        <p className="truncate font-black text-[#F7E9C5]">
                          {row.homeTitle}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#8F7B5C]">
                          {row.homeSubtitle}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex min-w-[66px] justify-center rounded-xl border border-[#D9A441]/30 bg-[#160A12] px-3 py-2 text-base font-black text-[#F2D27A]">
                          {row.scoreLabel}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="truncate font-black text-[#F7E9C5]">
                          {row.awayTitle}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#8F7B5C]">
                          {row.awaySubtitle}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${row.matchStatusClassName}`}
                        >
                          {row.matchStatusLabel}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${row.scoreStatusClassName}`}
                          >
                            {row.scoreStatusLabel}
                          </span>

                          {row.submittedScoreLabel !== "-" && (
                            <span className="text-xs font-black text-[#F2D27A]">
                              {row.submittedScoreLabel}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end">{row.actionNode}</div>
                      </td>
                    </tr>

                    {row.expandedNode && (
                      <tr className="border-b border-[#D9A441]/10 bg-black/20">
                        <td colSpan={7} className="px-4 py-4">
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
