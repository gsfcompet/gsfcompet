"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  created_at?: string | null;
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
  ea_team_id: string | null;
  ea_team_name: string | null;
};

type Player = {
  id: string;
  user_id: string | null;
  name: string | null;
  ea_name: string | null;
  platform: string | null;
};

type Team = {
  id: string;
  name: string;
  manager: string | null;
};

type AdminMatchesSchedulerProps = {
  competitionId: string;
  onChanged?: () => void | Promise<void>;
};

function toDateTimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDate(value: string | null) {
  if (!value) return "À planifier";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date invalide";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusLabel(status: string) {
  if (status === "completed") return "Terminé";
  if (status === "scheduled") return "Programmé";
  if (status === "planned") return "À planifier";
  if (status === "in_progress") return "En cours";

  return status;
}

function getStatusClass(status: string) {
  if (status === "completed") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "scheduled") {
    return "border-[#C39B55]/40 bg-[#C39B55]/10 text-[#DBC399]";
  }

  if (status === "in_progress") {
    return "border-sky-400/30 bg-sky-400/10 text-sky-300";
  }

  return "border-slate-400/25 bg-slate-400/10 text-slate-300";
}

export default function AdminMatchesScheduler({
  competitionId,
  onChanged,
}: AdminMatchesSchedulerProps) {
  const supabase = useMemo(() => createClient(), []);

  const [matches, setMatches] = useState<Match[]>([]);
  const [competitionPlayers, setCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [dateForms, setDateForms] = useState<Record<string, string>>({});
  const [initialDateForms, setInitialDateForms] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  async function getAccessToken() {
    const sessionResult = await supabase.auth.getSession();
    return sessionResult.data.session?.access_token ?? null;
  }

  async function loadData() {
    setLoading(true);
    setMessage("");

    const matchesResult = await supabase
      .from("matches")
      .select("*")
      .eq("competition_id", competitionId)
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (matchesResult.error) {
      setMessage(`Erreur matchs : ${matchesResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedMatches = (matchesResult.data ?? []) as Match[];

    const teamIds = Array.from(
      new Set(
        loadedMatches
          .flatMap((match) => [match.home_team_id, match.away_team_id])
          .filter((id): id is string => Boolean(id))
      )
    );

    let loadedTeams: Team[] = [];

    if (teamIds.length > 0) {
      const teamsResult = await supabase
        .from("teams")
        .select("id, name, manager")
        .in("id", teamIds);

      if (teamsResult.error) {
        setMessage(`Erreur teams : ${teamsResult.error.message}`);
        setLoading(false);
        return;
      }

      loadedTeams = (teamsResult.data ?? []) as Team[];
    }

    const registrationIds = Array.from(
      new Set(
        loadedMatches
          .flatMap((match) => [
            match.home_competition_player_id,
            match.away_competition_player_id,
          ])
          .filter((id): id is string => Boolean(id))
      )
    );

    let loadedCompetitionPlayers: CompetitionPlayer[] = [];

    if (registrationIds.length > 0) {
      const registrationsResult = await supabase
        .from("competition_players")
        .select("*")
        .in("id", registrationIds);

      if (registrationsResult.error) {
        setMessage(
          `Erreur participants : ${registrationsResult.error.message}`
        );
        setLoading(false);
        return;
      }

      loadedCompetitionPlayers =
        (registrationsResult.data ?? []) as CompetitionPlayer[];
    }

    const playerIds = Array.from(
      new Set(
        loadedCompetitionPlayers
          .map((registration) => registration.player_id)
          .filter(Boolean)
      )
    );

    let loadedPlayers: Player[] = [];

    if (playerIds.length > 0) {
      const playersResult = await supabase
        .from("players")
        .select("*")
        .in("id", playerIds);

      if (playersResult.error) {
        setMessage(`Erreur joueurs : ${playersResult.error.message}`);
        setLoading(false);
        return;
      }

      loadedPlayers = (playersResult.data ?? []) as Player[];
    }

    const nextDateForms: Record<string, string> = {};

    loadedMatches.forEach((match) => {
      nextDateForms[match.id] = toDateTimeLocal(match.match_date);
    });

    setMatches(loadedMatches);
    setCompetitionPlayers(loadedCompetitionPlayers);
    setPlayers(loadedPlayers);
    setTeams(loadedTeams);
    setDateForms(nextDateForms);
    setInitialDateForms(nextDateForms);
    setLoading(false);
  }

  const registrationById = useMemo(() => {
    return new Map(
      competitionPlayers.map((registration) => [registration.id, registration])
    );
  }, [competitionPlayers]);

  const playerById = useMemo(() => {
    return new Map(players.map((player) => [player.id, player]));
  }, [players]);

  const teamById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  const editableMatches = useMemo(() => {
    return matches.filter((match) => match.status !== "completed");
  }, [matches]);

  const changedMatchIds = useMemo(() => {
    return editableMatches
      .filter(
        (match) =>
          (dateForms[match.id] ?? "") !== (initialDateForms[match.id] ?? "")
      )
      .map((match) => match.id);
  }, [editableMatches, dateForms, initialDateForms]);

  function getParticipantName(registrationId: string | null) {
    if (!registrationId) return "À définir";

    const registration = registrationById.get(registrationId);

    if (!registration) return "Participant inconnu";

    const player = playerById.get(registration.player_id);
    const playerName = player?.name || player?.ea_name || "Joueur";
    const eaTeamName = registration.ea_team_name || "Équipe EA";

    return `${playerName} · ${eaTeamName}`;
  }

  function getTeamName(teamId: string | null) {
    if (!teamId) return "Équipe inconnue";

    const team = teamById.get(teamId);

    return team?.name || "Équipe introuvable";
  }

  function getMatchParticipantName(match: Match, side: "home" | "away") {
    const teamId = side === "home" ? match.home_team_id : match.away_team_id;

    if (teamId) {
      return getTeamName(teamId);
    }

    return getParticipantName(
      side === "home"
        ? match.home_competition_player_id
        : match.away_competition_player_id
    );
  }

  function updateDateForm(matchId: string, value: string) {
    setDateForms((current) => ({
      ...current,
      [matchId]: value,
    }));
  }

  async function saveMatchDate(matchId: string) {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return false;
    }

    const value = dateForms[matchId] ?? "";

    setSavingMatchId(matchId);
    setMessage("");

    let matchDate: string | null = null;

    if (value) {
      const parsedDate = new Date(value);

      if (Number.isNaN(parsedDate.getTime())) {
        setSavingMatchId(null);
        setMessage("La date saisie est invalide.");
        return false;
      }

      matchDate = parsedDate.toISOString();
    }

    try {
      const response = await fetch(`/api/admin/matches/${matchId}/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ match_date: matchDate }),
      });

      const result: { error?: string; message?: string } =
        await response.json();

      if (!response.ok) {
        setMessage(result.error || "Erreur lors de la programmation du match.");
        return false;
      }

      setMessage(result.message || "Date et heure enregistrées ✅");
      return true;
    } catch {
      setMessage("Impossible de contacter le serveur. Réessaie.");
      return false;
    } finally {
      setSavingMatchId(null);
    }
  }

  async function handleSaveOne(matchId: string) {
    const success = await saveMatchDate(matchId);

    if (success) {
      await loadData();
      await onChanged?.();
    }
  }

  async function handleSaveAll() {
    if (changedMatchIds.length === 0) {
      setMessage("Aucune modification à enregistrer.");
      return;
    }

    setSavingAll(true);
    setMessage("");

    let saved = 0;

    try {
      for (const matchId of changedMatchIds) {
        const success = await saveMatchDate(matchId);

        if (!success) return;

        saved += 1;
      }

      setMessage(`${saved} programmation(s) enregistrée(s) ✅`);
      await loadData();
      await onChanged?.();
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#C39B55]/20 bg-[#0B1B33]/90 p-6 shadow-lg shadow-black/30">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C39B55]">
            Planning
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#DBC399]">
            Programmation rapide des matchs
          </h2>

          <p className="mt-2 text-sm text-[#CFC6AB]">
            Planifie les dates et heures dans un tableau compact.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-[#C39B55]/25 bg-[#071326]/80 px-5 py-3 text-center">
            <p className="text-2xl font-black text-[#DBC399]">
              {editableMatches.length}
            </p>
            <p className="text-xs uppercase tracking-widest text-[#CFC6AB]/70">
              à programmer
            </p>
          </div>

          <button
            type="button"
            disabled={savingAll || changedMatchIds.length === 0}
            onClick={handleSaveAll}
            className="rounded-xl border border-[#C39B55]/40 bg-[#17345B] px-5 py-3 text-sm font-semibold text-[#DBC399] shadow-lg shadow-black/20 transition hover:bg-[#204575] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingAll
              ? "Enregistrement..."
              : `Enregistrer tout (${changedMatchIds.length})`}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-[#C39B55]/30 bg-[#071326]/80 px-4 py-3 text-sm font-semibold text-[#DBC399]">
          {message}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[#C39B55]/15 bg-[#071326]/70 p-4 text-sm text-[#CFC6AB]">
          Chargement de la programmation...
        </div>
      ) : editableMatches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#C39B55]/20 bg-[#071326]/70 p-4 text-sm text-[#CFC6AB]">
          Aucun match à programmer pour cette compétition.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#C39B55]/15 bg-[#071326]/70">
          <div className="max-h-[460px] overflow-y-auto">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[18%]" />
                <col className="w-[28%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>

              <thead className="sticky top-0 z-10 bg-[#102443] text-[10px] uppercase tracking-[0.18em] text-[#DBC399]">
                <tr>
                  <th className="border-b border-[#C39B55]/20 px-4 py-3">
                    Match
                  </th>
                  <th className="border-b border-[#C39B55]/20 px-4 py-3">
                    Date actuelle
                  </th>
                  <th className="border-b border-[#C39B55]/20 px-4 py-3">
                    Nouvelle programmation
                  </th>
                  <th className="border-b border-[#C39B55]/20 px-4 py-3 text-center">
                    Statut
                  </th>
                  <th className="border-b border-[#C39B55]/20 px-4 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {editableMatches.map((match) => {
                  const isChanged =
                    (dateForms[match.id] ?? "") !==
                    (initialDateForms[match.id] ?? "");

                  const isSaving = savingMatchId === match.id;

                  return (
                    <tr
                      key={match.id}
                      className="border-b border-[#C39B55]/10 transition hover:bg-[#C39B55]/5"
                    >
                      <td className="px-4 py-4">
                        <div className="grid gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                              Domicile
                            </span>

                            <p className="truncate font-black text-[#DBC399]">
                              {getMatchParticipantName(match, "home")}
                            </p>
                          </div>

                          <div className="pl-1 text-xs font-black uppercase tracking-[0.25em] text-[#C39B55]">
                            vs
                          </div>

                          <div className="flex min-w-0 items-center gap-3">
                            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-sky-300">
                              Extérieur
                            </span>

                            <p className="truncate font-black text-[#DBC399]">
                              {getMatchParticipantName(match, "away")}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-[#CFC6AB]">
                        {formatDate(match.match_date)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="datetime-local"
                            value={dateForms[match.id] ?? ""}
                            onChange={(event) =>
                              updateDateForm(match.id, event.target.value)
                            }
                            className="w-full rounded-xl border border-[#C39B55]/20 bg-[#09182D] px-4 py-3 text-[#DBC399] outline-none transition focus:border-[#C39B55]/60 focus:ring-2 focus:ring-[#C39B55]/10"
                          />

                          {isChanged && (
                            <span className="shrink-0 rounded-full border border-[#C39B55]/35 bg-[#C39B55]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#DBC399]">
                              Modifié
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => updateDateForm(match.id, "")}
                          className="mt-2 text-xs font-semibold text-[#CFC6AB]/70 transition hover:text-[#DBC399]"
                        >
                          Effacer la date
                        </button>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${getStatusClass(
                            match.status
                          )}`}
                        >
                          {getStatusLabel(match.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          disabled={isSaving || !isChanged}
                          onClick={() => handleSaveOne(match.id)}
                          className="rounded-lg border border-[#C39B55]/30 px-4 py-2 text-xs font-semibold text-[#DBC399] transition hover:bg-[#17345B] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isSaving ? "..." : "Enregistrer"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}