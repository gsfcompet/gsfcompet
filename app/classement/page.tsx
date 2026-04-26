"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
};

type Team = {
  id: string;
  name: string;
  manager: string | null;
};

type CompetitionTeam = {
  id: string;
  competition_id: string;
  team_id: string;
};

type Match = {
  id: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
};

type Standing = {
  teamId: string;
  teamName: string;
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
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>(
    []
  );
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
      .order("created_at", { ascending: true });

    const competitionTeamsResult = await supabase
      .from("competition_teams")
      .select("*");

    const matchesResult = await supabase.from("matches").select("*");

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

    if (competitionTeamsResult.error) {
      setErrorMessage(
        `Erreur inscriptions : ${competitionTeamsResult.error.message}`
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
    setCompetitionTeams(competitionTeamsResult.data ?? []);
    setMatches(matchesResult.data ?? []);

    if (!selectedCompetitionId && competitionsData.length > 0) {
      setSelectedCompetitionId(competitionsData[0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedCompetition = competitions.find(
    (competition) => competition.id === selectedCompetitionId
  );

  const filteredMatches = useMemo(() => {
    return matches.filter(
      (match) =>
        match.competition_id === selectedCompetitionId &&
        match.status === "completed"
    );
  }, [matches, selectedCompetitionId]);

  const standings = useMemo(() => {
    if (!selectedCompetitionId) return [];

    const linkedTeamIds = competitionTeams
      .filter((item) => item.competition_id === selectedCompetitionId)
      .map((item) => item.team_id);

    const matchTeamIds = filteredMatches.flatMap((match) => [
      match.home_team_id,
      match.away_team_id,
    ]);

    const teamIds = Array.from(new Set([...linkedTeamIds, ...matchTeamIds]));

    const participatingTeams = teams.filter((team) => teamIds.includes(team.id));

    const table: Record<string, Standing> = {};

    participatingTeams.forEach((team) => {
      table[team.id] = {
        teamId: team.id,
        teamName: team.name,
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

    filteredMatches.forEach((match) => {
      if (
        match.home_score === null ||
        match.away_score === null ||
        !table[match.home_team_id] ||
        !table[match.away_team_id]
      ) {
        return;
      }

      const home = table[match.home_team_id];
      const away = table[match.away_team_id];

      home.played += 1;
      away.played += 1;

      home.goalsFor += match.home_score;
      home.goalsAgainst += match.away_score;

      away.goalsFor += match.away_score;
      away.goalsAgainst += match.home_score;

      if (match.home_score > match.away_score) {
        home.wins += 1;
        home.points += 3;
        away.losses += 1;
      } else if (match.home_score < match.away_score) {
        away.wins += 1;
        away.points += 3;
        home.losses += 1;
      } else {
        home.draws += 1;
        away.draws += 1;
        home.points += 1;
        away.points += 1;
      }
    });

    return Object.values(table)
      .map((team) => ({
        ...team,
        goalDifference: team.goalsFor - team.goalsAgainst,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) {
          return b.goalDifference - a.goalDifference;
        }
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.teamName.localeCompare(b.teamName);
      });
  }, [teams, competitionTeams, filteredMatches, selectedCompetitionId]);

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Classement officiel
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Classement</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Choisis une compétition pour afficher son classement automatiquement
            calculé à partir des matchs terminés.
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

        {!loading && !errorMessage && competitions.length === 0 && (
          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
            Aucune compétition disponible pour le moment.
          </div>
        )}

        {!loading && !errorMessage && competitions.length > 0 && (
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
                    {competition.name}
                    {competition.season ? ` · ${competition.season}` : ""}
                  </option>
                ))}
              </select>

              {selectedCompetition && (
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                    <p className="text-sm text-[#8F7B5C]">Compétition</p>
                    <p className="font-black text-[#F7E9C5]">
                      {selectedCompetition.name}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                    <p className="text-sm text-[#8F7B5C]">Type</p>
                    <p className="font-black text-[#F7E9C5]">
                      {selectedCompetition.type}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                    <p className="text-sm text-[#8F7B5C]">Matchs terminés</p>
                    <p className="font-black text-[#F2D27A]">
                      {filteredMatches.length}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {standings.length === 0 && (
              <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
                Aucune équipe ou aucun match terminé pour cette compétition.
              </div>
            )}

            {standings.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 shadow-lg shadow-black/30">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-[#A61E22]/25 text-[#F2D27A]">
                    <tr>
                      <th className="px-4 py-4 text-left">#</th>
                      <th className="px-4 py-4 text-left">Équipe</th>
                      <th className="px-4 py-4 text-center">J</th>
                      <th className="px-4 py-4 text-center">G</th>
                      <th className="px-4 py-4 text-center">N</th>
                      <th className="px-4 py-4 text-center">P</th>
                      <th className="px-4 py-4 text-center">BP</th>
                      <th className="px-4 py-4 text-center">BC</th>
                      <th className="px-4 py-4 text-center">Diff</th>
                      <th className="px-4 py-4 text-center">Pts</th>
                    </tr>
                  </thead>

                  <tbody>
                    {standings.map((team, index) => (
                      <tr
                        key={team.teamId}
                        className="border-t border-[#D9A441]/10 transition hover:bg-[#A61E22]/10"
                      >
                        <td className="px-4 py-4 font-bold text-[#D8C7A0]">
                          {index + 1}
                        </td>

                        <td className="px-4 py-4 font-bold text-[#F7E9C5]">
                          {team.teamName}
                        </td>

                        <td className="px-4 py-4 text-center text-[#D8C7A0]">
                          {team.played}
                        </td>

                        <td className="px-4 py-4 text-center text-[#D8C7A0]">
                          {team.wins}
                        </td>

                        <td className="px-4 py-4 text-center text-[#D8C7A0]">
                          {team.draws}
                        </td>

                        <td className="px-4 py-4 text-center text-[#D8C7A0]">
                          {team.losses}
                        </td>

                        <td className="px-4 py-4 text-center text-[#D8C7A0]">
                          {team.goalsFor}
                        </td>

                        <td className="px-4 py-4 text-center text-[#D8C7A0]">
                          {team.goalsAgainst}
                        </td>

                        <td className="px-4 py-4 text-center text-[#D8C7A0]">
                          {team.goalDifference > 0
                            ? `+${team.goalDifference}`
                            : team.goalDifference}
                        </td>

                        <td className="px-4 py-4 text-center font-black text-[#F2D27A]">
                          {team.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}