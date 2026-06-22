"use client";

import { useCallback, useState } from "react";
import {
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
import { cacheInvalidate } from "@/lib/cache";

export function useMemberData(userId: string | null) {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [registrations, setRegistrations] = useState<CompetitionPlayer[]>([]);
  const [allCompetitionPlayers, setAllCompetitionPlayers] = useState<CompetitionPlayer[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [eaTeams, setEaTeams] = useState<EaTeam[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const loadRelatedData = useCallback(
    async (loadedMatches: Match[], loadedRegs: CompetitionPlayer[], currentPlayer: Player) => {
      const teamIds = Array.from(
        new Set(
          loadedMatches.flatMap((m) => [m.home_team_id, m.away_team_id]).filter(Boolean) as string[]
        )
      );

      const loadedTeams = await cachedQuery(
        `teams:${teamIds.join(",")}`,
        async () =>
          teamIds.length === 0
            ? []
            : (await supabase.from("teams").select("*").in("id", teamIds)).data ?? []
      );

      setTeams(loadedTeams);

      const playerIds = new Set<string>();
      playerIds.add(currentPlayer.id);

      loadedRegs.forEach((r) => r.player_id && playerIds.add(r.player_id));
      loadedMatches.forEach((m) => {
        [m.home_player_id, m.away_player_id, m.player1_id, m.player2_id].forEach(
          (id) => id && playerIds.add(id)
        );
      });

      const loadedPlayers = await cachedQuery(
        `players:${Array.from(playerIds).join(",")}`,
        async () =>
          (await supabase.from("players").select("*").in("id", Array.from(playerIds))).data ?? []
      );

      setPlayers(loadedPlayers);
    },
    [supabase]
  );

  const loadMemberData = useCallback(
    async (preloadedUserId?: string) => {
      if (!userId && !preloadedUserId) return;

      setLoading(true);
      setErrorMessage(null);

      const uid = preloadedUserId ?? userId;
      if (!uid) {
        setErrorMessage("Session introuvable.");
        setLoading(false);
        return;
      }

      const loadedProfile = await cachedQuery(`profile:${uid}`, async () => {
        const res = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
        return res.data ?? null;
      });

      setProfile(loadedProfile);

      const loadedPlayer = await cachedQuery(`player:${uid}`, async () => {
        const res = await supabase.from("players").select("*").eq("user_id", uid).maybeSingle();
        return res.data ?? null;
      });

      setPlayer(loadedPlayer);

      if (!loadedPlayer) {
        setRegistrations([]);
        setCompetitions([]);
        setMatches([]);
        setEaTeams([]);
        setPlayers([]);
        setTeams([]);
        setLoading(false);
        return;
      }

      const regs = await cachedQuery(`regs:${loadedPlayer.id}`, async () => {
        const res = await supabase
          .from("competition_players")
          .select("*")
          .eq("player_id", loadedPlayer.id);
        return res.data ?? [];
      });

      setRegistrations(regs);

      const competitionIds = Array.from(new Set(regs.map((r) => r.competition_id)));

      const loadedCompetitions = await cachedQuery(
        `competitions:${competitionIds.join(",")}`,
        async () =>
          competitionIds.length === 0
            ? []
            : (await supabase.from("competitions").select("*").in("id", competitionIds)).data ?? []
      );

      setCompetitions(loadedCompetitions);

      const loadedEaTeams = await cachedQuery(
        `eaTeams:${regs.map((r) => r.ea_team_id).join(",")}`,
        async () => {
          const ids = regs.map((r) => r.ea_team_id).filter(Boolean) as string[];
          return ids.length === 0
            ? []
            : (await supabase.from("ea_teams").select("*").in("id", ids)).data ?? [];
        }
      );

      setEaTeams(loadedEaTeams);

      const loadedMatches = await cachedQuery(
        `matches:${competitionIds.join(",")}:${regs.map((r) => r.id).join(",")}`,
        async () => {
          if (competitionIds.length === 0) return [];
          const filter = regs.map((r) => r.id).join(",");
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
          loadedMatches.flatMap((m) => [
            m.home_competition_player_id,
            m.away_competition_player_id,
          ])
        )
      ).filter(Boolean) as string[];

      const loadedAllRegs = await cachedQuery(
        `allRegs:${matchRegIds.join(",")}`,
        async () =>
          matchRegIds.length === 0
            ? []
            : (await supabase.from("competition_players").select("*").in("id", matchRegIds)).data ??
              []
      );

      setAllCompetitionPlayers(loadedAllRegs);

      await loadRelatedData(loadedMatches, regs, loadedPlayer);

      setLoading(false);
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
