"use client";

import { Competition, CompetitionPlayer } from "../types";

export function MemberCompetitions({
  competitions,
  registrations,
}: {
  competitions: Competition[];
  registrations: CompetitionPlayer[];
}) {
  const personalCompetitions = competitions.filter(
    (c) => (c.participant_type || "players") === "players"
  );

  return (
    <section className="rounded-[28px] border border-yellow-700/30 bg-[#140711]/95 p-5 shadow-2xl shadow-black/40">
      <div className="mb-5 flex min-h-[58px] items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-yellow-100">Mes compétitions</h2>
          <p className="mt-1 text-sm text-yellow-100/60">
            Les compétitions où ton inscription est enregistrée.
          </p>
        </div>

        <span className="flex h-9 min-w-9 items-center justify-center rounded-full border border-yellow-500/40 bg-black/40 px-3 text-sm font-black text-yellow-200 shadow-inner shadow-yellow-950/30">
          {personalCompetitions.length}
        </span>
      </div>

      {personalCompetitions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-yellow-700/30 bg-black/25 p-5 text-sm text-yellow-100/55">
          Aucune compétition trouvée pour le moment.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {personalCompetitions.map((competition) => {
            const reg = registrations.find(
              (r) => r.competition_id === competition.id
            );

            return (
              <div
                key={competition.id}
                className="rounded-2xl border border-yellow-700/25 bg-black/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-yellow-100">
                      {competition.title || competition.name || "Compétition"}
                    </h3>

                    <div className="mt-2 space-y-1 text-sm text-yellow-100/65">
                      {competition.season && (
                        <p>
                          Saison :{" "}
                          <span className="font-black text-yellow-200">
                            {competition.season}
                          </span>
                        </p>
                      )}

                      {reg?.ea_team_name && (
                        <p>
                          Équipe EA FC :{" "}
                          <span className="font-black text-yellow-200">
                            {reg.ea_team_name}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {competition.status && (
                    <span className="rounded-full border border-red-500/35 bg-red-500/15 px-2 py-1 text-[11px] font-black uppercase text-red-200">
                      {competition.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
