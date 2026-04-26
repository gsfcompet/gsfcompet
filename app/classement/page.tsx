"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: "teams" | "players";
};

type Team = {
  id: string;
  name: string;
  manager: string | null;
};

type Player = {
  id: string;
  name: string;
  ea_name: string | null;
  platform: string | null;
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
  ea_team_id: string | null;
  ea_team_name: string;
};

type Match = {
  id: string;
  competition_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_competition_player_id: string | null;
  away_competition_player_id: string | null;
  match_date: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  mvp: string | null;
};

type RankingRow = {
  id: string;
  name: string;
  subtitle: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export default function ClassementPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [competitionPlayers, setCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const competitionsResult = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    const teamsResult = await supabase
      .from("teams")
      .select("*")
      .order("name", { ascending: true });

    const playersResult = await supabase
      .from("players")
      .select("*")
      .order("name", { ascending: true });

    const competitionPlayersResult = await supabase
      .from("competition_players")
      .select("*");

    const matchesResult = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true, nullsFirst: false });

    if (competitionsResult.error) {
      setErrorMessage(
        `Erreur compétitions : ${competitionsResult.error.message}`
      );
      setLoading(false);
      return;
    }

    if (teamsResult.error) {
      setErrorMessage(`Erreur équipes : ${teamsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (playersResult.error) {
      setErrorMessage(`Erreur joueurs : ${playersResult.error.message}`);
      setLoading(false);
      return;
    }

    if (competitionPlayersResult.error) {
      setErrorMessage(
        `Erreur inscriptions joueurs : ${competitionPlayersResult.error.message}`
      );
      setLoading(false);
      return;
    }

    if (matchesResult.error) {
      setErrorMessage(`Erreur matchs : ${matchesResult.error.message}`);
      setLoading(false);
      return;
    }

    const competitionsData = competitionsResult.data ?? [];

    setCompetitions(competitionsData);
    setTeams(teamsResult.data ?? []);
    setPlayers(playersResult.data ?? []);
    setCompetitionPlayers(competitionPlayersResult.data ?? []);
    setMatches(matchesResult.data ?? []);

    if (competitionsData.length > 0) {
      setSelectedCompetitionId(competitionsData[0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedCompetition = useMemo(() => {
    return competitions.find(
      (competition) => competition.id === selectedCompetitionId
    );
  }, [competitions, selectedCompetitionId]);

  const ranking = useMemo(() => {
    if (!selectedCompetition) return [];

    if (selectedCompetition.participant_type === "players") {
      return buildPlayersRanking(selectedCompetition.id);
    }

    return buildTeamsRanking(selectedCompetition.id);
  }, [selectedCompetition, teams, players, competitionPlayers, matches]);

  function getPlayerName(playerId: string) {
    return (
      players.find((player) => player.id === playerId)?.name ?? "Joueur inconnu"
    );
  }

  function getPlayerEaName(playerId: string) {
    return players.find((player) => player.id === playerId)?.ea_name;
  }

  function buildPlayersRanking(competitionId: string): RankingRow[] {
    const registrations = competitionPlayers.filter(
      (registration) => registration.competition_id === competitionId
    );

    const rows: RankingRow[] = registrations.map((registration) => {
      const eaName = getPlayerEaName(registration.player_id);

      return {
        id: registration.id,
        name: getPlayerName(registration.player_id),
        subtitle: eaName
          ? `${registration.ea_team_name} · ${eaName}`
          : registration.ea_team_name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
    });

    const completedMatches = matches.filter(
      (match) =>
        match.competition_id === competitionId &&
        match.status === "completed" &&
        match.home_score !== null &&
        match.away_score !== null &&
        match.home_competition_player_id !== null &&
        match.away_competition_player_id !== null
    );

    completedMatches.forEach((match) => {
      const homeRow = rows.find(
        (row) => row.id === match.home_competition_player_id
      );

      const awayRow = rows.find(
        (row) => row.id === match.away_competition_player_id
      );

      if (!homeRow || !awayRow) return;
      if (match.home_score === null || match.away_score === null) return;

      applyMatchResult(homeRow, awayRow, match.home_score, match.away_score);
    });

    return sortRanking(rows);
  }

  function buildTeamsRanking(competitionId: string): RankingRow[] {
    const competitionMatches = matches.filter(
      (match) => match.competition_id === competitionId
    );

    const teamIds = Array.from(
      new Set(
        competitionMatches.flatMap((match) =>
          [match.home_team_id, match.away_team_id].filter(Boolean)
        )
      )
    ) as string[];

    const rows: RankingRow[] = teamIds.map((teamId) => {
      const team = teams.find((item) => item.id === teamId);

      return {
        id: teamId,
        name: team?.name ?? "Équipe inconnue",
        subtitle: team?.manager ? `Manager : ${team.manager}` : "Team",
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
    });

    const completedMatches = competitionMatches.filter(
      (match) =>
        match.status === "completed" &&
        match.home_score !== null &&
        match.away_score !== null &&
        match.home_team_id !== null &&
        match.away_team_id !== null
    );

    completedMatches.forEach((match) => {
      const homeRow = rows.find((row) => row.id === match.home_team_id);
      const awayRow = rows.find((row) => row.id === match.away_team_id);

      if (!homeRow || !awayRow) return;
      if (match.home_score === null || match.away_score === null) return;

      applyMatchResult(homeRow, awayRow, match.home_score, match.away_score);
    });

    return sortRanking(rows);
  }

  function applyMatchResult(
    homeRow: RankingRow,
    awayRow: RankingRow,
    homeScore: number,
    awayScore: number
  ) {
    homeRow.played += 1;
    awayRow.played += 1;

    homeRow.goalsFor += homeScore;
    homeRow.goalsAgainst += awayScore;

    awayRow.goalsFor += awayScore;
    awayRow.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      homeRow.wins += 1;
      homeRow.points += 3;

      awayRow.losses += 1;
    } else if (homeScore < awayScore) {
      awayRow.wins += 1;
      awayRow.points += 3;

      homeRow.losses += 1;
    } else {
      homeRow.draws += 1;
      awayRow.draws += 1;

      homeRow.points += 1;
      awayRow.points += 1;
    }

    homeRow.goalDifference = homeRow.goalsFor - homeRow.goalsAgainst;
    awayRow.goalDifference = awayRow.goalsFor - awayRow.goalsAgainst;
  }

  function sortRanking(rows: RankingRow[]) {
    return [...rows].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.name.localeCompare(b.name);
    });
  }

  function getCompetitionLabel(competition: Competition) {
    return competition.season
      ? `${competition.name} · ${competition.season}`
      : competition.name;
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Classement
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Classement</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Classement dynamique selon la compétition sélectionnée : teams ou
            joueurs EA FC.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
            Chargement du classement...
          </div>
        )}

        {!loading && errorMessage && (
          <div className="rounded-2xl border border-red-400/30 bg-[#160A12]/90 p-6 text-red-300">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && (
          <>
            <div className="mb-8 rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                Choisir une compétition
              </label>

              <select
                value={selectedCompetitionId}
                onChange={(event) =>
                  setSelectedCompetitionId(event.target.value)
                }
                className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
              >
                {competitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>
                    {getCompetitionLabel(competition)} ·{" "}
                    {competition.participant_type === "players"
                      ? "Joueurs EA FC"
                      : "Teams"}
                  </option>
                ))}
              </select>

              {selectedCompetition && (
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                    <p className="text-sm text-[#8F7B5C]">Format</p>
                    <p className="text-xl font-black text-[#F2D27A]">
                      {selectedCompetition.participant_type === "players"
                        ? "Joueurs EA FC"
                        : "Teams / clubs"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                    <p className="text-sm text-[#8F7B5C]">Participants</p>
                    <p className="text-xl font-black text-[#F2D27A]">
                      {ranking.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                    <p className="text-sm text-[#8F7B5C]">Matchs joués</p>
                    <p className="text-xl font-black text-[#F2D27A]">
                      {
                        matches.filter(
                          (match) =>
                            match.competition_id === selectedCompetition.id &&
                            match.status === "completed"
                        ).length
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {competitions.length === 0 && (
              <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
                Aucune compétition créée pour le moment.
              </div>
            )}

            {competitions.length > 0 && ranking.length === 0 && (
              <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
                Aucun participant trouvé pour cette compétition.
              </div>
            )}

            {ranking.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 shadow-lg shadow-black/30">
                <div className="hidden grid-cols-[70px_1.5fr_repeat(8,80px)] border-b border-[#D9A441]/15 bg-[#0B0610]/70 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[#8F7B5C] lg:grid">
                  <div>#</div>
                  <div>Participant</div>
                  <div className="text-center">MJ</div>
                  <div className="text-center">G</div>
                  <div className="text-center">N</div>
                  <div className="text-center">P</div>
                  <div className="text-center">BP</div>
                  <div className="text-center">BC</div>
                  <div className="text-center">Diff</div>
                  <div className="text-center">Pts</div>
                </div>

                <div className="divide-y divide-[#D9A441]/10">
                  {ranking.map((row, index) => (
                    <div
                      key={row.id}
                      className="grid gap-4 px-5 py-5 lg:grid-cols-[70px_1.5fr_repeat(8,80px)] lg:items-center"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9A441]/25 bg-[#0B0610] text-lg font-black text-[#F2D27A]">
                          {index + 1}
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg font-black text-[#F7E9C5]">
                          {row.name}
                        </h2>
                        <p className="mt-1 text-sm text-[#D8C7A0]">
                          {row.subtitle}
                        </p>
                      </div>

                      <StatCell label="MJ" value={row.played} />
                      <StatCell label="G" value={row.wins} />
                      <StatCell label="N" value={row.draws} />
                      <StatCell label="P" value={row.losses} />
                      <StatCell label="BP" value={row.goalsFor} />
                      <StatCell label="BC" value={row.goalsAgainst} />
                      <StatCell
                        label="Diff"
                        value={
                          row.goalDifference > 0
                            ? `+${row.goalDifference}`
                            : row.goalDifference
                        }
                      />
                      <StatCell label="Pts" value={row.points} strong />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function StatCell({
  label,
  value,
  strong,
}: {
  label: string;
  value: number | string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#D9A441]/10 bg-[#0B0610]/50 px-3 py-2 lg:block lg:border-0 lg:bg-transparent lg:p-0 lg:text-center">
      <span className="text-xs text-[#8F7B5C] lg:hidden">{label}</span>
      <span
        className={
          strong
            ? "text-lg font-black text-[#F2D27A]"
            : "font-semibold text-[#F7E9C5]"
        }
      >
        {value}
      </span>
    </div>
  );
}