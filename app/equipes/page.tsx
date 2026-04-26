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

type TeamStats = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
};

export default function EquipesPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>(
    []
  );
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("all");
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

    setCompetitions(competitionsResult.data ?? []);
    setTeams(teamsResult.data ?? []);
    setCompetitionTeams(competitionTeamsResult.data ?? []);
    setMatches(matchesResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredTeams = useMemo(() => {
    if (selectedCompetitionId === "all") {
      return teams;
    }

    const linkedTeamIds = competitionTeams
      .filter((item) => item.competition_id === selectedCompetitionId)
      .map((item) => item.team_id);

    const matchTeamIds = matches
      .filter((match) => match.competition_id === selectedCompetitionId)
      .flatMap((match) => [match.home_team_id, match.away_team_id]);

    const allowedTeamIds = Array.from(
      new Set([...linkedTeamIds, ...matchTeamIds])
    );

    return teams.filter((team) => allowedTeamIds.includes(team.id));
  }, [teams, competitionTeams, matches, selectedCompetitionId]);

  function getCompetitionName(competitionId: string) {
    const competition = competitions.find((item) => item.id === competitionId);
    if (!competition) return "Compétition inconnue";

    return competition.season
      ? `${competition.name} · ${competition.season}`
      : competition.name;
  }

  function getTeamCompetitionNames(teamId: string) {
    const linkedCompetitionIds = competitionTeams
      .filter((item) => item.team_id === teamId)
      .map((item) => item.competition_id);

    const matchCompetitionIds = matches
      .filter(
        (match) =>
          match.home_team_id === teamId || match.away_team_id === teamId
      )
      .map((match) => match.competition_id);

    const competitionIds = Array.from(
      new Set([...linkedCompetitionIds, ...matchCompetitionIds])
    );

    if (competitionIds.length === 0) {
      return ["Aucune compétition"];
    }

    return competitionIds.map(getCompetitionName);
  }

  function getTeamStats(teamId: string): TeamStats {
    const relevantMatches = matches.filter((match) => {
      const isInSelectedCompetition =
        selectedCompetitionId === "all" ||
        match.competition_id === selectedCompetitionId;

      const teamPlayed =
        match.home_team_id === teamId || match.away_team_id === teamId;

      return (
        isInSelectedCompetition && teamPlayed && match.status === "completed"
      );
    });

    return relevantMatches.reduce<TeamStats>(
      (stats, match) => {
        if (match.home_score === null || match.away_score === null) {
          return stats;
        }

        const isHome = match.home_team_id === teamId;
        const teamScore = isHome ? match.home_score : match.away_score;
        const opponentScore = isHome ? match.away_score : match.home_score;

        stats.played += 1;

        if (teamScore > opponentScore) {
          stats.wins += 1;
          stats.points += 3;
        } else if (teamScore < opponentScore) {
          stats.losses += 1;
        } else {
          stats.draws += 1;
          stats.points += 1;
        }

        return stats;
      },
      {
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
      }
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Participants
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Équipes</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Toutes les équipes inscrites sur GSF Compet, avec leurs statistiques
            selon la compétition sélectionnée.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
            Chargement des équipes...
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
                Filtrer par compétition
              </label>

              <select
                value={selectedCompetitionId}
                onChange={(event) =>
                  setSelectedCompetitionId(event.target.value)
                }
                className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
              >
                <option value="all">Toutes les compétitions</option>

                {competitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>
                    {competition.name}
                    {competition.season ? ` · ${competition.season}` : ""}
                  </option>
                ))}
              </select>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                  <p className="text-sm text-[#8F7B5C]">Équipes affichées</p>
                  <p className="text-2xl font-black text-[#F2D27A]">
                    {filteredTeams.length}
                  </p>
                </div>

                <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                  <p className="text-sm text-[#8F7B5C]">Compétitions</p>
                  <p className="text-2xl font-black text-[#F2D27A]">
                    {competitions.length}
                  </p>
                </div>

                <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                  <p className="text-sm text-[#8F7B5C]">Matchs enregistrés</p>
                  <p className="text-2xl font-black text-[#F2D27A]">
                    {matches.length}
                  </p>
                </div>
              </div>
            </div>

            {filteredTeams.length === 0 && (
              <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
                Aucune équipe trouvée pour cette compétition.
              </div>
            )}

            {filteredTeams.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredTeams.map((team) => {
                  const stats = getTeamStats(team.id);
                  const teamCompetitions = getTeamCompetitionNames(team.id);

                  return (
                    <article
                      key={team.id}
                      className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30"
                    >
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D9A441]/30 bg-[#A61E22]/30 text-2xl font-black text-[#F2D27A]">
                        {team.name.charAt(0)}
                      </div>

                      <h2 className="text-xl font-black text-[#F7E9C5]">
                        {team.name}
                      </h2>

                      <p className="mt-2 text-sm text-[#D8C7A0]">
                        Manager : {team.manager || "À définir"}
                      </p>

                      <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-3">
                          <p className="text-lg font-black text-[#F2D27A]">
                            {stats.played}
                          </p>
                          <p className="text-xs text-[#8F7B5C]">J</p>
                        </div>

                        <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-3">
                          <p className="text-lg font-black text-[#F2D27A]">
                            {stats.wins}
                          </p>
                          <p className="text-xs text-[#8F7B5C]">G</p>
                        </div>

                        <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-3">
                          <p className="text-lg font-black text-[#F2D27A]">
                            {stats.draws}
                          </p>
                          <p className="text-xs text-[#8F7B5C]">N</p>
                        </div>

                        <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-3">
                          <p className="text-lg font-black text-[#F2D27A]">
                            {stats.points}
                          </p>
                          <p className="text-xs text-[#8F7B5C]">Pts</p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                        <p className="mb-2 text-sm font-semibold text-[#F2D27A]">
                          Compétitions
                        </p>

                        <div className="space-y-1">
                          {teamCompetitions.map((competitionName) => (
                            <p
                              key={competitionName}
                              className="text-sm text-[#D8C7A0]"
                            >
                              {competitionName}
                            </p>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}