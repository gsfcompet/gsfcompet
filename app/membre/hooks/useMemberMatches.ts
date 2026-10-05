"use client";

import { useMemo, useState } from "react";
import type {
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
    const result = {
      mj: 0,
      v: 0,
      n: 0,
      p: 0,
      bp: 0,
      bc: 0,
      ga: 0,
      pts: 0,
    };

    if (!player?.id) return result;

    const myRegistrationIds = new Set(
      regs
        .filter((registration) => registration.player_id === player.id)
        .map((registration) => registration.id)
    );

    matches.forEach((match) => {
      const homeScore = match.home_score ?? match.score_home;
      const awayScore = match.away_score ?? match.score_away;

      if (homeScore == null || awayScore == null) return;

      const home = Number(homeScore);
      const away = Number(awayScore);

      if (!Number.isFinite(home) || !Number.isFinite(away)) return;

      const isHome = myRegistrationIds.has(
        match.home_competition_player_id ?? ""
      );
      const isAway = myRegistrationIds.has(
        match.away_competition_player_id ?? ""
      );

      if (!isHome && !isAway) return;

      const goalsFor = isHome ? home : away;
      const goalsAgainst = isHome ? away : home;

      result.mj++;
      result.bp += goalsFor;
      result.bc += goalsAgainst;

      if (goalsFor > goalsAgainst) {
        result.v++;
        result.pts += 3;
      } else if (goalsFor === goalsAgainst) {
        result.n++;
        result.pts += 1;
      } else {
        result.p++;
      }
    });

    result.ga = result.bp - result.bc;
    return result;
  }, [matches, player, regs]);

  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams]
  );

  const playerMap = useMemo(
    () => new Map(players.map((item) => [item.id, item])),
    [players]
  );

  const registrationMap = useMemo(
    () => new Map(allRegs.map((registration) => [registration.id, registration])),
    [allRegs]
  );

  const memberMatches = useMemo(
    () => matches.filter((match) => isMatchForPlayer(match, player, regs)),
    [matches, player, regs]
  );

  const matchesToPlay = useMemo(
    () => memberMatches.filter((match) => !hasFinalScore(match)),
    [memberMatches]
  );

  const finishedMatches = useMemo(
    () => memberMatches.filter(hasFinalScore),
    [memberMatches]
  );

  const matchesToPlayRows = useMemo(
    () =>
      matchesToPlay.map((match) => {
        const scoreStatus = getScoreStatus(match);

        return {
          id: match.id,
          competition: getCompetitionName(competitions, match),
          date: getMatchDate(match),
          homeName: getSideName(match, "home", teamMap, playerMap, registrationMap),
          awayName: getSideName(match, "away", teamMap, playerMap, registrationMap),
          scoreLabel:
            match.submitted_home_score != null &&
            match.submitted_away_score != null
              ? `${match.submitted_home_score} - ${match.submitted_away_score}`
              : "VS",
          scoreStatus,
          isFormOpen: openScoreMatchId === match.id,
          isSubmitting: submittingMatchId === match.id,
        };
      }),
    [
      matchesToPlay,
      competitions,
      teamMap,
      playerMap,
      registrationMap,
      openScoreMatchId,
      submittingMatchId,
    ]
  );

  const finishedMatchRows = useMemo(
    () =>
      finishedMatches.map((match) => ({
        id: match.id,
        competition: getCompetitionName(competitions, match),
        date: getMatchDate(match),
        homeName: getSideName(match, "home", teamMap, playerMap, registrationMap),
        awayName: getSideName(match, "away", teamMap, playerMap, registrationMap),
        scoreLabel: `${getFinalHomeScore(match) ?? "-"} - ${
          getFinalAwayScore(match) ?? "-"
        }`,
        scoreStatus: getScoreStatus(match) || "validated",
      })),
    [finishedMatches, competitions, teamMap, playerMap, registrationMap]
  );

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