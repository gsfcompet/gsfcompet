"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  manager: string | null;
};

type Match = {
  id: string;
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
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const teamsResult = await supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: true });

    const matchesResult = await supabase
      .from("matches")
      .select("*")
      .eq("status", "completed");

    if (teamsResult.error) {
      setErrorMessage(`Erreur équipes : ${teamsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (matchesResult.error) {
      setErrorMessage(`Erreur matchs : ${matchesResult.error.message}`);
      setLoading(false);
      return;
    }

    setTeams(teamsResult.data ?? []);
    setMatches(matchesResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const standings = useMemo(() => {
    const table: Record<string, Standing> = {};

    teams.forEach((team) => {
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

    matches.forEach((match) => {
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
  }, [teams, matches]);

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Guardian&apos;s League
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Classement</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Classement automatique calculé à partir des matchs terminés.
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

        {!loading && !errorMessage && standings.length === 0 && (
          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
            Aucune équipe disponible pour le moment.
          </div>
        )}

        {!loading && !errorMessage && standings.length > 0 && (
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

        {!loading && !errorMessage && matches.length === 0 && (
          <p className="mt-4 text-sm text-[#8F7B5C]">
            Aucun match terminé pour le moment. Les équipes sont affichées avec
            0 point.
          </p>
        )}
      </section>
    </main>
  );
}