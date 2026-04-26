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

export default function MatchsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [competitionPlayers, setCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
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
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

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

    setCompetitions(competitionsResult.data ?? []);
    setTeams(teamsResult.data ?? []);
    setPlayers(playersResult.data ?? []);
    setCompetitionPlayers(competitionPlayersResult.data ?? []);
    setMatches(matchesResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredMatches = useMemo(() => {
    if (selectedCompetitionId === "all") {
      return matches;
    }

    return matches.filter(
      (match) => match.competition_id === selectedCompetitionId
    );
  }, [matches, selectedCompetitionId]);

  function getCompetition(match: Match) {
    return competitions.find(
      (competition) => competition.id === match.competition_id
    );
  }

  function getCompetitionLabel(match: Match) {
    const competition = getCompetition(match);

    if (!competition) {
      return "Compétition inconnue";
    }

    return competition.season
      ? `${competition.name} · ${competition.season}`
      : competition.name;
  }

  function getTeamName(teamId: string | null) {
    if (!teamId) return "Équipe inconnue";

    return teams.find((team) => team.id === teamId)?.name ?? "Équipe inconnue";
  }

  function getPlayerName(playerId: string) {
    return (
      players.find((player) => player.id === playerId)?.name ?? "Joueur inconnu"
    );
  }

  function getCompetitionPlayer(registrationId: string | null) {
    if (!registrationId) return null;

    return (
      competitionPlayers.find((item) => item.id === registrationId) ?? null
    );
  }

  function getParticipantLabel(match: Match, side: "home" | "away") {
    const registrationId =
      side === "home"
        ? match.home_competition_player_id
        : match.away_competition_player_id;

    const teamId = side === "home" ? match.home_team_id : match.away_team_id;

    if (registrationId) {
      const registration = getCompetitionPlayer(registrationId);

      if (!registration) {
        return {
          title: "Joueur inconnu",
          subtitle: "Équipe EA FC inconnue",
        };
      }

      return {
        title: getPlayerName(registration.player_id),
        subtitle: registration.ea_team_name,
      };
    }

    return {
      title: getTeamName(teamId),
      subtitle: side === "home" ? "Domicile" : "Extérieur",
    };
  }

  function getStatusLabel(match: Match) {
    if (match.status === "completed") return "Terminé";
    if (match.status === "scheduled") return "À venir";
    if (match.status === "cancelled") return "Annulé";
    return "À planifier";
  }

  function formatDate(value: string | null) {
    if (!value) return "À planifier";

    const date = new Date(value);

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function isCompleted(match: Match) {
    return (
      match.status === "completed" &&
      match.home_score !== null &&
      match.away_score !== null
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Calendrier
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Matchs</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Calendrier des matchs et résultats de la saison, pour les
            compétitions teams et joueurs EA FC.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
            Chargement des matchs...
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
                    {competition.season ? ` · ${competition.season}` : ""} ·{" "}
                    {competition.participant_type === "players"
                      ? "Joueurs EA FC"
                      : "Teams"}
                  </option>
                ))}
              </select>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                  <p className="text-sm text-[#8F7B5C]">Matchs affichés</p>
                  <p className="text-2xl font-black text-[#F2D27A]">
                    {filteredMatches.length}
                  </p>
                </div>

                <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                  <p className="text-sm text-[#8F7B5C]">Matchs terminés</p>
                  <p className="text-2xl font-black text-[#F2D27A]">
                    {
                      filteredMatches.filter((match) => isCompleted(match))
                        .length
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                  <p className="text-sm text-[#8F7B5C]">À venir</p>
                  <p className="text-2xl font-black text-[#F2D27A]">
                    {
                      filteredMatches.filter((match) => !isCompleted(match))
                        .length
                    }
                  </p>
                </div>
              </div>
            </div>

            {filteredMatches.length === 0 && (
              <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-[#D8C7A0]">
                Aucun match trouvé pour le moment.
              </div>
            )}

            <div className="space-y-5">
              {filteredMatches.map((match) => {
                const home = getParticipantLabel(match, "home");
                const away = getParticipantLabel(match, "away");
                const competition = getCompetition(match);
                const completed = isCompleted(match);

                return (
                  <article
                    key={match.id}
                    className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30"
                  >
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#F2D27A]">
                          {getCompetitionLabel(match)}
                        </p>

                        <p className="mt-1 text-xs text-[#8F7B5C]">
                          {competition?.participant_type === "players"
                            ? "Match joueurs EA FC"
                            : "Match teams / clubs"}
                        </p>
                      </div>

                      <div className="rounded-full border border-[#D9A441]/25 bg-[#0B0610] px-3 py-1 text-xs font-semibold text-[#D8C7A0]">
                        {getStatusLabel(match)}
                      </div>
                    </div>

                    <div className="grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
                      <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-5">
                        <p className="text-xs text-[#8F7B5C]">Domicile</p>
                        <h2 className="mt-1 text-2xl font-black text-[#F7E9C5]">
                          {home.title}
                        </h2>
                        <p className="mt-1 text-sm text-[#D8C7A0]">
                          {home.subtitle}
                        </p>
                      </div>

                      <div className="flex flex-col items-center justify-center">
                        {completed ? (
                          <div className="rounded-2xl border border-[#D9A441]/30 bg-[#A61E22]/30 px-6 py-4 text-center">
                            <p className="text-3xl font-black text-[#F2D27A]">
                              {match.home_score} - {match.away_score}
                            </p>
                            <p className="mt-1 text-xs text-[#D8C7A0]">
                              Score final
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-[#D9A441]/25 bg-[#A61E22]/25 px-6 py-4 text-center">
                            <p className="text-2xl font-black text-[#F2D27A]">
                              VS
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-5 md:text-right">
                        <p className="text-xs text-[#8F7B5C]">Extérieur</p>
                        <h2 className="mt-1 text-2xl font-black text-[#F7E9C5]">
                          {away.title}
                        </h2>
                        <p className="mt-1 text-sm text-[#D8C7A0]">
                          {away.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#D9A441]/10 pt-4 text-sm text-[#D8C7A0]">
                      <p>{formatDate(match.match_date)}</p>

                      {match.mvp && (
                        <p>
                          MVP :{" "}
                          <span className="font-semibold text-[#F2D27A]">
                            {match.mvp}
                          </span>
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}