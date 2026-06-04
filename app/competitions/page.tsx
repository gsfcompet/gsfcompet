"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ParticipantType = "players" | "teams";
type FormatFilter = "all" | "players" | "teams";
type StatusFilter =
  | "all"
  | "draft"
  | "planned"
  | "active"
  | "completed"
  | "archived";

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: ParticipantType;
  created_at?: string | null;
};

type Match = {
  id: string;
  competition_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_competition_player_id: string | null;
  away_competition_player_id: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
};

type CompetitionTeam = {
  id: string;
  competition_id: string;
  team_id: string;
};

function getCompetitionTypeLabel(type: string) {
  if (type === "league") return "Championnat";
  if (type === "cup") return "Coupe";
  if (type === "tournament") return "Tournoi";

  return type;
}

function getParticipantTypeLabel(type: ParticipantType) {
  if (type === "teams") return "Teams esport";
  return "Joueurs EA FC";
}

function getStatusLabel(status: string) {
  if (status === "draft") return "Brouillon";
  if (status === "planned") return "Planifiée";
  if (status === "active") return "Active";
  if (status === "completed") return "Terminée";
  if (status === "archived") return "Archivée";
  if (status === "scheduled") return "Programmée";

  return status;
}

function getStatusClass(status: string) {
  if (status === "active") {
    return "border-green-400/40 bg-green-500/15 text-green-300";
  }

  if (status === "planned" || status === "scheduled") {
    return "border-yellow-400/40 bg-yellow-500/15 text-yellow-300";
  }

  if (status === "draft") {
    return "border-orange-400/40 bg-orange-500/15 text-orange-300";
  }

  if (status === "completed") {
    return "border-blue-400/40 bg-blue-500/15 text-blue-300";
  }

  if (status === "archived") {
    return "border-slate-400/30 bg-slate-500/10 text-slate-300";
  }

  return "border-yellow-500/30 bg-black/30 text-yellow-200";
}

function getFormatClass(type: ParticipantType) {
  if (type === "teams") {
    return "border-red-400/35 bg-red-500/10 text-red-200";
  }

  return "border-yellow-400/35 bg-yellow-500/10 text-yellow-200";
}

export default function CompetitionsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitionPlayers, setCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>(
    []
  );

  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const competitionsResult = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (competitionsResult.error) {
      setMessage(`Erreur compétitions : ${competitionsResult.error.message}`);
      setLoading(false);
      return;
    }

    const matchesResult = await supabase.from("matches").select("*");

    if (matchesResult.error) {
      setMessage(`Erreur matchs : ${matchesResult.error.message}`);
      setLoading(false);
      return;
    }

    const competitionPlayersResult = await supabase
      .from("competition_players")
      .select("id, competition_id, player_id");

    if (competitionPlayersResult.error) {
      setMessage(
        `Erreur participants joueurs : ${competitionPlayersResult.error.message}`
      );
      setLoading(false);
      return;
    }

    const competitionTeamsResult = await supabase
      .from("competition_teams")
      .select("id, competition_id, team_id");

    if (competitionTeamsResult.error) {
      setMessage(
        `Erreur teams inscrites : ${competitionTeamsResult.error.message}`
      );
      setLoading(false);
      return;
    }

    setCompetitions((competitionsResult.data ?? []) as Competition[]);
    setMatches((matchesResult.data ?? []) as Match[]);
    setCompetitionPlayers(
      (competitionPlayersResult.data ?? []) as CompetitionPlayer[]
    );
    setCompetitionTeams(
      (competitionTeamsResult.data ?? []) as CompetitionTeam[]
    );

    setLoading(false);
  }

  function getCompetitionMatches(competitionId: string) {
    return matches.filter((match) => match.competition_id === competitionId);
  }

  function getParticipantsCount(competition: Competition) {
    const competitionMatches = getCompetitionMatches(competition.id);

    if (competition.participant_type === "teams") {
      const idsFromRegistrations = competitionTeams
        .filter((item) => item.competition_id === competition.id)
        .map((item) => item.team_id);

      const idsFromMatches = competitionMatches.flatMap((match) => [
        match.home_team_id,
        match.away_team_id,
      ]);

      return new Set(
        [...idsFromRegistrations, ...idsFromMatches].filter(Boolean)
      ).size;
    }

    const idsFromRegistrations = competitionPlayers
      .filter((item) => item.competition_id === competition.id)
      .map((item) => item.player_id);

    const idsFromMatches = competitionMatches.flatMap((match) => [
      match.home_competition_player_id,
      match.away_competition_player_id,
    ]);

    return new Set(
      [...idsFromRegistrations, ...idsFromMatches].filter(Boolean)
    ).size;
  }

  function getMatchesCount(competitionId: string) {
    return getCompetitionMatches(competitionId).length;
  }

  function getCompletedMatchesCount(competitionId: string) {
    return getCompetitionMatches(competitionId).filter(
      (match) => match.status === "completed"
    ).length;
  }

  const filteredCompetitions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return competitions.filter((competition) => {
      const matchesFormat =
        formatFilter === "all" ||
        competition.participant_type === formatFilter;

      const matchesStatus =
        statusFilter === "all" || competition.status === statusFilter;

      const searchable = [
        competition.name,
        competition.season,
        competition.type,
        competition.status,
        getCompetitionTypeLabel(competition.type),
        getParticipantTypeLabel(competition.participant_type),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);

      return matchesFormat && matchesStatus && matchesSearch;
    });
  }, [competitions, formatFilter, statusFilter, search]);

  const totalPlayersCompetitions = competitions.filter(
    (competition) => competition.participant_type === "players"
  ).length;

  const totalTeamsCompetitions = competitions.filter(
    (competition) => competition.participant_type === "teams"
  ).length;

  const activeCompetitions = competitions.filter(
    (competition) =>
      competition.status === "active" || competition.status === "planned"
  ).length;

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <section className="rounded-[28px] border border-[#D9A441]/25 bg-gradient-to-br from-[#21070b] via-[#12040d] to-black p-6 shadow-2xl shadow-black/50">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#F2D27A]">
                Compétitions
              </p>

              <h1 className="mt-3 text-4xl font-black text-[#F7E9C5] md:text-5xl">
                Compétitions Guardian&apos;s Family
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#D8C7A0]">
                Vue tableur des compétitions joueurs et teams esport, avec
                suivi des participants, matchs et classements.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryTile label="Total" value={competitions.length} />
              <SummaryTile label="Joueurs" value={totalPlayersCompetitions} />
              <SummaryTile label="Teams" value={totalTeamsCompetitions} />
              <SummaryTile label="À venir" value={activeCompetitions} />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-[#F2D27A]">
                Rechercher une compétition
              </span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-[#D9A441]/25 bg-black px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/70"
                placeholder="Nom, saison, format..."
              />
            </label>

            <div>
              <span className="mb-2 block text-sm font-black text-[#F2D27A]">
                Format
              </span>

              <div className="flex rounded-xl border border-[#D9A441]/25 bg-black p-1">
                <FilterButton
                  active={formatFilter === "all"}
                  onClick={() => setFormatFilter("all")}
                >
                  Tous
                </FilterButton>

                <FilterButton
                  active={formatFilter === "players"}
                  onClick={() => setFormatFilter("players")}
                >
                  Joueurs
                </FilterButton>

                <FilterButton
                  active={formatFilter === "teams"}
                  onClick={() => setFormatFilter("teams")}
                >
                  Teams
                </FilterButton>
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-[#F2D27A]">
                Statut
              </span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="w-full rounded-xl border border-[#D9A441]/25 bg-black px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/70 xl:w-56"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="planned">Planifiée</option>
                <option value="active">Active</option>
                <option value="completed">Terminée</option>
                <option value="archived">Archivée</option>
              </select>
            </label>
          </div>
        </section>

        {message && (
          <div className="mt-6 rounded-2xl border border-[#D9A441]/30 bg-[#160A12] px-4 py-3 text-sm font-black text-[#F2D27A]">
            {message}
          </div>
        )}

        {loading ? (
          <section className="mt-8 rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 text-[#D8C7A0] shadow-2xl shadow-black/40">
            Chargement des compétitions...
          </section>
        ) : filteredCompetitions.length === 0 ? (
          <section className="mt-8 rounded-[28px] border border-dashed border-[#D9A441]/25 bg-[#160A12]/90 p-6 text-[#D8C7A0] shadow-2xl shadow-black/40">
            Aucune compétition ne correspond aux filtres.
          </section>
        ) : (
          <section className="mt-8 rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#F7E9C5]">
                  Liste des compétitions
                </h2>

                <p className="mt-2 text-sm text-[#D8C7A0]">
                  Affichage compact pour suivre rapidement les compétitions,
                  participants et matchs.
                </p>
              </div>

              <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[#D9A441]/35 bg-black/30 px-3 text-sm font-black text-[#F2D27A]">
                {filteredCompetitions.length}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#D9A441]/20 bg-black/20">
              <div className="max-h-[680px] overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[24%]" />
                    <col className="w-[12%]" />
                    <col className="w-[13%]" />
                    <col className="w-[11%]" />
                    <col className="w-[9%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[15%]" />
                  </colgroup>

                  <thead className="sticky top-0 z-10 bg-[#26070b] text-[10px] uppercase tracking-[0.18em] text-[#F2D27A]">
                    <tr>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Compétition
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Type
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Format
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Statut
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center">
                        Participants
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center">
                        Matchs
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-center">
                        Terminés
                      </th>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCompetitions.map((competition) => {
                      const participantsCount = getParticipantsCount(competition);
                      const matchesCount = getMatchesCount(competition.id);
                      const completedMatchesCount =
                        getCompletedMatchesCount(competition.id);

                      return (
                        <tr
                          key={competition.id}
                          className="border-b border-[#D9A441]/10 transition hover:bg-[#D9A441]/5"
                        >
                          <td className="px-4 py-4">
                            <p className="truncate font-black text-[#F7E9C5]">
                              {competition.name}
                            </p>

                            <p className="mt-1 truncate text-xs text-[#D8C7A0]/70">
                              {competition.season || "Saison non définie"}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-[#D8C7A0]">
                            {getCompetitionTypeLabel(competition.type)}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getFormatClass(
                                competition.participant_type
                              )}`}
                            >
                              {getParticipantTypeLabel(
                                competition.participant_type
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                                competition.status
                              )}`}
                            >
                              {getStatusLabel(competition.status)}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <StatPill value={participantsCount} />
                          </td>

                          <td className="px-4 py-4 text-center">
                            <StatPill value={matchesCount} />
                          </td>

                          <td className="px-4 py-4 text-center">
                            <StatPill value={completedMatchesCount} />
                          </td>

                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Link
                                href={`/competitions/${competition.id}/matchs`}
                                className="rounded-lg border border-[#D9A441]/30 px-3 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
                              >
                                Matchs
                              </Link>

                              <Link
                                href={`/competitions/${competition.id}/classement`}
                                className="rounded-lg border border-[#D9A441]/30 px-3 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
                              >
                                Classement
                              </Link>

                              <Link
                                href={`/competitions/${competition.id}/inscription`}
                                className="rounded-lg bg-[#A61E22] px-3 py-2 text-xs font-black text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C]"
                              >
                                {competition.participant_type === "teams"
                                  ? "Inscrire team"
                                  : "Inscription"}
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/25 bg-black/30 px-5 py-4 text-center">
      <p className="text-2xl font-black text-[#F2D27A]">{value}</p>
      <p className="text-xs uppercase tracking-widest text-[#8F7B5C]">
        {label}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-lg bg-[#F2C300] px-4 py-2 text-sm font-black text-black"
          : "rounded-lg px-4 py-2 text-sm font-black text-[#F2D27A] transition hover:bg-[#160A12]"
      }
    >
      {children}
    </button>
  );
}

function StatPill({ value }: { value: number }) {
  return (
    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[#D9A441]/35 bg-black/40 px-2 text-sm font-black text-[#F2D27A]">
      {value}
    </span>
  );
}
