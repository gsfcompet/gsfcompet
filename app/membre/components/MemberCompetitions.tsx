"use client";

import { useMemo } from "react";
import type { Competition, CompetitionPlayer } from "../types";

type MemberCompetitionsProps = {
  competitions: Competition[];
  registrations: CompetitionPlayer[];
};

export function MemberCompetitions({
  competitions,
  registrations,
}: MemberCompetitionsProps) {
  const personalCompetitions = useMemo(
    () =>
      competitions.filter(
        (competition) =>
          (competition.participant_type || "players") === "players"
      ),
    [competitions]
  );

  const registrationByCompetition = useMemo(() => {
    const map = new Map<string, CompetitionPlayer>();

    // Conserve la première inscription trouvée pour chaque compétition,
    // comme le faisait registrations.find().
    for (const registration of registrations) {
      if (!map.has(registration.competition_id)) {
        map.set(registration.competition_id, registration);
      }
    }

    return map;
  }, [registrations]);

  return (
    <section className="rounded-[28px] border border-[#263449] bg-[#111B2A] p-5 shadow-2xl shadow-black/40">
      <div className="mb-5 flex min-h-[58px] items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#F7E9C5]">
            Mes compétitions
          </h2>
          <p className="mt-1 text-sm text-slate-300/70">
            Les compétitions où ton inscription est enregistrée.
          </p>
        </div>

        <span
          aria-label={`${personalCompetitions.length} compétition${
            personalCompetitions.length > 1 ? "s" : ""
          }`}
          className="flex h-9 min-w-9 items-center justify-center rounded-full border border-[#D9A441]/40 bg-[#0B1220] px-3 text-sm font-black text-[#F7E9C5] shadow-inner"
        >
          {personalCompetitions.length}
        </span>
      </div>

      {personalCompetitions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#40516A] bg-[#0B1220]/60 p-5 text-sm text-slate-300/70">
          Aucune compétition trouvée pour le moment.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {personalCompetitions.map((competition) => {
            const registration = registrationByCompetition.get(competition.id);

            return (
              <article
                key={competition.id}
                className="rounded-2xl border border-[#263449] bg-[#0B1220]/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#F7E9C5]">
                      {competition.title || competition.name || "Compétition"}
                    </h3>

                    <div className="mt-2 space-y-1 text-sm text-slate-300/70">
                      {competition.season && (
                        <p>
                          Saison :{" "}
                          <span className="font-black text-[#D9A441]">
                            {competition.season}
                          </span>
                        </p>
                      )}

                      {registration?.ea_team_name && (
                        <p>
                          Équipe EA FC :{" "}
                          <span className="font-black text-[#D9A441]">
                            {registration.ea_team_name}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {competition.status && (
                    <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-[11px] font-black uppercase text-sky-200">
                      {competition.status}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}