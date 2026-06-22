"use client";

import { useMemo, useState } from "react";
import {
  Competition,
  CompetitionPlayer,
  Match,
  Player,
  Team,
} from "../types";
import {
  getCompetitionName,
  getFinalAwayScore,
  getFinalHomeScore,
  getMatchDate,
  getScoreStatus,
  getSideName,
  hasFinalScore,
  isMatchForPlayer,
} from "../helpers/matchHelpers";

export function useMemberMatches(
  matches: Match[],
  player: Player | null,
  regs: CompetitionPlayer[],
  competitions: Competition[],
  teams: Team[],
  players: Player[],
  allRegs: CompetitionPlayer[]
) {
  const [openScoreMatchId, setOpenScoreMatchId] = useState<string | null>(null);
  const [scoreHome, setScoreHome] = useState("");
  const [scoreAway, setScoreAway] = useState("");
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const s = { mj: 0, v: 0, n: 0, p: 0, bp: 0, bc: 0, ga: 0, pts: 0 };

    if (!player?.id) return s;

    const myRegs = regs.filter((r) => r.player_id === player.id).map((r) => r.id);

    matches.forEach((m) => {
      const hs = m.home_score ?? m.score_home;
      const as = m.away_score ?? m.score_away;
      if (hs == null || as == null) return;

      const home = Number(hs);
      const away = Number(as);
      if (!Number.isFinite(home) || !Number.isFinite(away)) return;

      const isHome = myRegs.includes(m.home_competition_player_id ?? "");
      const isAway = myRegs.includes(m.away_competition_player_id ?? "");
      if (!isHome && !isAway) return;

      const gf = isHome ? home : away;
      const ga = isHome ? away : home;

      s.mj++;
      s.bp += gf;
      s.bc += ga;

      if (gf > ga) {
        s.v++;
        s.pts += 3;
      } else if (gf === ga) {
        s.n++;
        s.pts += 1;
      } else {
        s.p++;
      }
    });

    s.ga = s.bp - s.bc;
    return s;
  }, [matches, player, regs]);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const regMap = useMemo(() => new Map(allRegs.map((r) => [r.id, r])), [allRegs]);

  const memberMatches = useMemo(
    () => matches.filter((m) => isMatchForPlayer(m, player, regs)),
    [matches, player, regs]
  );

  const matchesToPlay = useMemo(
    () => memberMatches.filter((m) => !hasFinalScore(m)),
    [memberMatches]
  );

  const finishedMatches = useMemo(
    () => memberMatches.filter((m) => hasFinalScore(m)),
    [memberMatches]
  );

  const matchesToPlayRows = useMemo(() => {
    return matchesToPlay.map((m) => {
      const scoreStatus = getScoreStatus(m);
      const isFormOpen = openScoreMatchId === m.id;
      const isSubmitting = submittingMatchId === m.id;

      return {
        id: m.id,
        competition: getCompetitionName(competitions, m),
        date: getMatchDate(m),
        homeName: getSideName(m, "home", teamMap, playerMap, regMap),
        awayName: getSideName(m, "away", teamMap, playerMap, regMap),
        scoreLabel:
          m.submitted_home_score != null && m.submitted_away_score != null
            ? `${m.submitted_home_score} - ${m.submitted_away_score}`
            : "VS",
        scoreStatus,
        isFormOpen,
        isSubmitting,
      };
    });
  }, [
    matchesToPlay,
    competitions,
    teamMap,
    playerMap,
    regMap,
    openScoreMatchId,
    submittingMatchId,
  ]);

  const finishedMatchRows = useMemo(() => {
    return finishedMatches.map((m) => ({
      id: m.id,
      competition: getCompetitionName(competitions, m),
      date: getMatchDate(m),
      homeName: getSideName(m, "home", teamMap, playerMap, regMap),
      awayName: getSideName(m, "away", teamMap, playerMap, regMap),
      scoreLabel: `${getFinalHomeScore(m) ?? "-"} - ${getFinalAwayScore(m) ?? "-"}`,
      scoreStatus: getScoreStatus(m) || "validated",
    }));
  }, [finishedMatches, competitions, teamMap, playerMap, regMap]);

  return {
    stats,
    matchesToPlayRows,
    finishedMatchRows,
    openScoreMatchId,
    setOpenScoreMatchId,
    scoreHome,
    setScoreHome,
    scoreAway,
    setScoreAway,
    submittingMatchId,
    setSubmittingMatchId,
  };
}
