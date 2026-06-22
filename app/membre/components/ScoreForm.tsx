"use client";

import { Match, Team, Player, CompetitionPlayer } from "../types";
import { getSideName } from "../helpers/matchHelpers";

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
}: {
  match: Match;
  isSubmitting: boolean;
  scoreHome: string;
  scoreAway: string;
  onChangeHome: (v: string) => void;
  onChangeAway: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  teams: Team[];
  players: Player[];
  allCompetitionPlayers: CompetitionPlayer[];
}) {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const regMap = new Map(allCompetitionPlayers.map((r) => [r.id, r]));

  return (
    <div className="rounded-2xl border border-yellow-700/25 bg-[#07000d] p-4">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-yellow-100/70">
            {getSideName(match, "home", teamMap, playerMap, regMap)}
          </span>

          <input
            type="number"
            min="0"
            value={scoreHome}
            onChange={(e) => onChangeHome(e.target.value)}
            className="w-full rounded-xl border border-yellow-700/35 bg-black px-4 py-3 text-center text-xl font-black text-yellow-100 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
            placeholder="0"
          />
        </label>

        <div className="hidden pb-3 text-2xl font-black text-red-300/80 md:block">
          -
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-yellow-100/70">
            {getSideName(match, "away", teamMap, playerMap, regMap)}
          </span>

          <input
            type="number"
            min="0"
            value={scoreAway}
            onChange={(e) => onChangeAway(e.target.value)}
            className="w-full rounded-xl border border-yellow-700/35 bg-black px-4 py-3 text-center text-xl font-black text-yellow-100 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
            placeholder="0"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onSubmit}
            className="rounded-xl border border-green-400/40 bg-green-500 px-4 py-3 text-xs font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Envoi..." : "Envoyer"}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="rounded-xl border border-red-500/40 bg-red-700 px-4 py-3 text-xs font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
