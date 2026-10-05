"use client";

import { useMemo } from "react";
import type { CompetitionPlayer, Match, Player, Team } from "../types";
import { getSideName } from "../helpers/matchHelpers";

type ScoreFormProps = {
  match: Match;
  isSubmitting: boolean;
  scoreHome: string;
  scoreAway: string;
  onChangeHome: (value: string) => void;
  onChangeAway: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  teams: Team[];
  players: Player[];
  allCompetitionPlayers: CompetitionPlayer[];
};

export function ScoreForm({
  match,
  isSubmitting,
  scoreHome,
  scoreAway,
  onChangeHome,
  onChangeAway,
  onSubmit,
  onCancel,
  teams,
  players,
  allCompetitionPlayers,
}: ScoreFormProps) {
  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams]
  );

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players]
  );

  const registrationMap = useMemo(
    () =>
      new Map(
        allCompetitionPlayers.map((registration) => [
          registration.id,
          registration,
        ])
      ),
    [allCompetitionPlayers]
  );

  return (
    <div className="rounded-2xl border border-[#263449] bg-[#0B1220] p-4">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-300/70">
            {getSideName(match, "home", teamMap, playerMap, registrationMap)}
          </span>

          <input
            type="number"
            min="0"
            value={scoreHome}
            onChange={(event) => onChangeHome(event.target.value)}
            className="w-full rounded-xl border border-[#40516A] bg-[#111B2A] px-4 py-3 text-center text-xl font-black text-[#F7E9C5] outline-none transition focus:border-[#D9A441] focus:ring-2 focus:ring-[#D9A441]/20"
            placeholder="0"
          />
        </label>

        <div className="hidden pb-3 text-2xl font-black text-sky-300/80 md:block">
          -
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-300/70">
            {getSideName(match, "away", teamMap, playerMap, registrationMap)}
          </span>

          <input
            type="number"
            min="0"
            value={scoreAway}
            onChange={(event) => onChangeAway(event.target.value)}
            className="w-full rounded-xl border border-[#40516A] bg-[#111B2A] px-4 py-3 text-center text-xl font-black text-[#F7E9C5] outline-none transition focus:border-[#D9A441] focus:ring-2 focus:ring-[#D9A441]/20"
            placeholder="0"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onSubmit}
            className="rounded-xl border border-emerald-400/40 bg-emerald-500 px-4 py-3 text-xs font-black text-[#08111E] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Envoi..." : "Envoyer"}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="rounded-xl border border-rose-400/30 bg-[#753B4C] px-4 py-3 text-xs font-black text-white transition hover:bg-[#8E485D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}