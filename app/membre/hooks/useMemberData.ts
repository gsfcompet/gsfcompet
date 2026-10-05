"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  Competition,
  CompetitionPlayer,
  EaTeam,
  Match,
  Player,
  Profile,
  Team,
} from "../types";
import { createClient } from "@/lib/supabase/client";
import { cachedQuery } from "@/lib/supabaseCached";

export function useMemberData(userId: string | null) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [registrations, setRegistrations] = useState<CompetitionPlayer[]>([]);
  const [allCompetitionPlayers, setAllCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [eaTeams, setEaTeams] = useState<EaTeam[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const loadRelatedData = useCallback(
    async (
      loadedMatches: Match[],
      loadedRegs: CompetitionPlayer[],
      currentPlayer: Player
    ) => {
      const teamIds = Array.from(
        new Set(
          loadedMatches
            .flatMap((match) => [match.home_team_id, match.away_team_id])
            .filter(Boolean) as string[]
        )
      );

      const loadedTeams = await cachedQuery(`teams:${teamIds.join(",")}`, async () =>
        teamIds.length === 0
          ? []
          : (await supabase.from("teams").select("*").in("id", teamIds)).data ?? []
      );

      setTeams(loadedTeams);

      const playerIds = new Set<string>([currentPlayer.id]);

      loadedRegs.forEach((registration) => {
        if (registration.player_id) playerIds.add(registration.player_id);
      });

      loadedMatches.forEach((match) => {
        [
          match.home_player_id,
          match.away_player_id,
          match.player1_id,
          match.player2_id,
        ].forEach((id) => {
          if (id) playerIds.add(id);
        });
      });

      const playerIdList = Array.from(playerIds);

      const loadedPlayers = await cachedQuery(
        `players:${playerIdList.join(",")}`,
        async () =>
          (await supabase.from("players").select("*").in("id", playerIdList))
            .data ?? []
      );

      setPlayers(loadedPlayers);
    },
    [supabase]
  );

  const loadMemberData = useCallback(
    async (preloadedUserId?: string) => {
      const uid = preloadedUserId ?? userId;

      if (!uid) return;

      setLoading(true);
      setErrorMessage(null);

      try {
        const loadedProfile = await cachedQuery(`profile:${uid}`, async () => {
          const res = await supabase
            .from("profiles")
            .select("*")
            .eq("id", uid)
            .maybeSingle();

          return res.data ?? null;
        });

        setProfile(loadedProfile);

        const loadedPlayer = await cachedQuery(`player:${uid}`, async () => {
          const res = await supabase
            .from("players")
            .select("*")
            .eq("user_id", uid)
            .maybeSingle();

          return res.data ?? null;
        });

        setPlayer(loadedPlayer);

        if (!loadedPlayer) {
          setRegistrations([]);
          setAllCompetitionPlayers([]);
          setCompetitions([]);
          setMatches([]);
          setEaTeams([]);
          setPlayers([]);
          setTeams([]);
          return;
        }

        const regs = await cachedQuery(
          `regs:${loadedPlayer.id}`,
          async () => {
            const res = await supabase
              .from("competition_players")
              .select("*")
              .eq("player_id", loadedPlayer.id);

            return res.data ?? [];
          }
        );

        setRegistrations(regs);

        const competitionIds = Array.from(
          new Set(regs.map((registration) => registration.competition_id))
        );

        const loadedCompetitions = await cachedQuery(
          `competitions:${competitionIds.join(",")}`,
          async () =>
            competitionIds.length === 0
              ? []
              : (
                  await supabase
                    .from("competitions")
                    .select("*")
                    .in("id", competitionIds)
                ).data ?? []
        );

        setCompetitions(loadedCompetitions);

        const eaTeamIds = regs
          .map((registration) => registration.ea_team_id)
          .filter(Boolean) as string[];

        const loadedEaTeams = await cachedQuery(
          `eaTeams:${eaTeamIds.join(",")}`,
          async () =>
            eaTeamIds.length === 0
              ? []
              : (
                  await supabase
                    .from("ea_teams")
                    .select("*")
                    .in("id", eaTeamIds)
                ).data ?? []
        );

        setEaTeams(loadedEaTeams);

        const registrationIds = regs.map((registration) => registration.id);

        const loadedMatches = await cachedQuery(
          `matches:${competitionIds.join(",")}:${registrationIds.join(",")}`,
          async () => {
            if (competitionIds.length === 0 || registrationIds.length === 0) {
              return [];
            }

            const filter = registrationIds.join(",");
            const res = await supabase
              .from("matches")
              .select("*")
              .in("competition_id", competitionIds)
              .or(
                `home_competition_player_id.in.(${filter}),away_competition_player_id.in.(${filter})`
              )
              .order("match_date", { ascending: true })
              .order("created_at", { ascending: false });

            return res.data ?? [];
          }
        );

        setMatches(loadedMatches);

        const matchRegIds = Array.from(
          new Set(
            loadedMatches.flatMap((match) => [
              match.home_competition_player_id,
              match.away_competition_player_id,
            ])
          )
        ).filter(Boolean) as string[];

        const loadedAllRegs = await cachedQuery(
          `allRegs:${matchRegIds.join(",")}`,
          async () =>
            matchRegIds.length === 0
              ? []
              : (
                  await supabase
                    .from("competition_players")
                    .select("*")
                    .in("id", matchRegIds)
                ).data ?? []
        );

        setAllCompetitionPlayers(loadedAllRegs);

        await loadRelatedData(loadedMatches, regs, loadedPlayer);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erreur lors du chargement des données membre."
        );
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, loadRelatedData]
  );

  return {
    loading,
    errorMessage,
    profile,
    player,
    registrations,
    allCompetitionPlayers,
    competitions,
    matches,
    eaTeams,
    players,
    teams,
    loadMemberData,
  };
}