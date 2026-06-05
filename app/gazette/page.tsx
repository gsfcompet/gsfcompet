"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Gazette = {
  id: string;
  title: string;
  description: string | null;
  month: string | null;
  year: number | null;
  period_date: string | null;
  file_url: string;
  file_path: string | null;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string | null;
};

function getStatusLabel(status: Gazette["status"]) {
  if (status === "published") return "Publiée";
  if (status === "archived") return "Archivée";
  return "Brouillon";
}

function getStatusClass(status: Gazette["status"]) {
  if (status === "published") {
    return "border-green-400/40 bg-green-500/15 text-green-300";
  }

  if (status === "archived") {
    return "border-slate-400/30 bg-slate-500/10 text-slate-300";
  }

  return "border-orange-400/40 bg-orange-500/15 text-orange-300";
}

function formatDateShort(value: string | null) {
  if (!value) return "Date non définie";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date invalide";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function formatPeriod(gazette: Gazette) {
  if (gazette.period_date) {
    return formatDateShort(gazette.period_date);
  }

  if (gazette.month && gazette.year) return `${gazette.month} ${gazette.year}`;
  if (gazette.year) return String(gazette.year);

  return "Période non définie";
}

function formatDate(value: string | null) {
  if (!value) return "Date non définie";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date invalide";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

export default function GazettePage() {
  const supabase = useMemo(() => createClient(), []);

  const [gazettes, setGazettes] = useState<Gazette[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadGazettes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadGazettes() {
    setLoading(true);
    setMessage("");

    const result = await supabase
      .from("gazettes")
      .select("*")
      .in("status", ["published", "archived"])
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (result.error) {
      setMessage(`Erreur chargement gazettes : ${result.error.message}`);
      setLoading(false);
      return;
    }

    setGazettes((result.data ?? []) as Gazette[]);
    setLoading(false);
  }

  const latestGazette = gazettes[0] ?? null;

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <section className="rounded-[28px] border border-[#D9A441]/25 bg-gradient-to-br from-[#21070b] via-[#12040d] to-black p-6 shadow-2xl shadow-black/50">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#F2D27A]">
                Guardian&apos;s Family
              </p>

              <h1 className="mt-3 text-4xl font-black text-[#F7E9C5] md:text-5xl">
                Gazette GSF
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#D8C7A0]">
                Retrouve les gazettes mensuelles Guardian&apos;s Family au
                format PDF.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <SummaryTile label="Gazettes" value={gazettes.length} />
              <SummaryTile
                label="Dernière"
                value={latestGazette?.year ? String(latestGazette.year) : "-"}
              />
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-6 rounded-2xl border border-[#D9A441]/30 bg-[#160A12] px-4 py-3 text-sm font-black text-[#F2D27A]">
            {message}
          </div>
        )}

        {loading ? (
          <section className="mt-8 rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 text-[#D8C7A0] shadow-2xl shadow-black/40">
            Chargement des gazettes...
          </section>
        ) : gazettes.length === 0 ? (
          <section className="mt-8 rounded-[28px] border border-dashed border-[#D9A441]/25 bg-[#160A12]/90 p-6 text-[#D8C7A0] shadow-2xl shadow-black/40">
            Aucune gazette publiée pour le moment.
          </section>
        ) : (
          <section className="mt-8 rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#F7E9C5]">
                  Toutes les gazettes
                </h2>

                <p className="mt-2 text-sm text-[#D8C7A0]">
                  Lecture et téléchargement des PDF publiés.
                </p>
              </div>

              <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[#D9A441]/35 bg-black/30 px-3 text-sm font-black text-[#F2D27A]">
                {gazettes.length}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#D9A441]/20 bg-black/20">
              <div className="max-h-[720px] overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[32%]" />
                    <col className="w-[16%]" />
                    <col className="w-[14%]" />
                    <col className="w-[16%]" />
                    <col className="w-[22%]" />
                  </colgroup>

                  <thead className="sticky top-0 z-10 bg-[#26070b] text-[10px] uppercase tracking-[0.18em] text-[#F2D27A]">
                    <tr>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Gazette
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Période
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Statut
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Publication
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {gazettes.map((gazette) => (
                      <tr
                        key={gazette.id}
                        className="border-b border-[#D9A441]/10 transition hover:bg-[#D9A441]/5"
                      >
                        <td className="px-4 py-4">
                          <p className="truncate font-black text-[#F7E9C5]">
                            {gazette.title}
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs text-[#8F7B5C]">
                            {gazette.description || "Aucune description."}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-[#D8C7A0]">
                          {formatPeriod(gazette)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                              gazette.status
                            )}`}
                          >
                            {getStatusLabel(gazette.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-[#D8C7A0]">
                          {formatDate(gazette.published_at)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <a
                              href={gazette.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-[#A61E22] px-3 py-2 text-xs font-black text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C]"
                            >
                              Lire le PDF
                            </a>

                            <a
                              href={gazette.file_url}
                              download
                              className="rounded-lg border border-[#D9A441]/30 px-3 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
                            >
                              Télécharger
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/25 bg-black/30 px-5 py-4">
      <p className="text-2xl font-black text-[#F2D27A]">{value}</p>
      <p className="text-xs uppercase tracking-widest text-[#8F7B5C]">
        {label}
      </p>
    </div>
  );
}
