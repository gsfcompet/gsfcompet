"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Match = {
  id: string;
  competition_id: string;
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
    return "border-green-400/40 bg-green-500/15 text-green-300";
  }

  if (status === "scheduled") {
    return "border-yellow-400/40 bg-yellow-500/15 text-yellow-300";
  }

  return "border-slate-400/30 bg-slate-500/10 text-slate-300";
}

export default function AdminMatchesScheduler({
  competitionId,
  onChanged,
}: AdminMatchesSchedulerProps) {
  const supabase = createClient();

  const [matches, setMatches] = useState<Match[]>([]);
  const [competitionPlayers, setCompetitionPlayers] = useState<
    CompetitionPlayer[]
  >([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [dateForms, setDateForms] = useState<Record<string, string>>({});
  const [initialDateForms, setInitialDateForms] = useState<Record<string, string>>(
    {}
  );

  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
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

    const registrationIds = Array.from(
      new Set(
        loadedMatches
          .flatMap((match) => [
            match.home_competition_player_id,
            match.away_competition_player_id,
          ])
          .filter(Boolean) as string[]
      )
    );

    let loadedCompetitionPlayers: CompetitionPlayer[] = [];

    if (registrationIds.length > 0) {
      const registrationsResult = await supabase
        .from("competition_players")
        .select("*")
        .in("id", registrationIds);

      if (registrationsResult.error) {
        setMessage(`Erreur participants : ${registrationsResult.error.message}`);
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

  const editableMatches = useMemo(() => {
    return matches.filter((match) => match.status !== "completed");
  }, [matches]);

  const changedMatchIds = useMemo(() => {
    return editableMatches
      .filter((match) => {
        return (dateForms[match.id] ?? "") !== (initialDateForms[match.id] ?? "");
      })
      .map((match) => match.id);
  }, [editableMatches, dateForms, initialDateForms]);

  function getParticipantName(registrationId: string | null) {
    if (!registrationId) return "À définir";

    const registration = registrationById.get(registrationId);

    if (!registration) return "Participant inconnu";

    const player = playerById.get(registration.player_id);

    const playerName = player?.name || player?.ea_name || "Joueur";
    const eaTeamName = registration.ea_team_name || "Équipe EA FC";

    return `${playerName} · ${eaTeamName}`;
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

    const response = await fetch(`/api/admin/matches/${matchId}/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        match_date: value ? new Date(value).toISOString() : null,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setSavingMatchId(null);
      setMessage(result.error || "Erreur programmation match.");
      return false;
    }

    setSavingMatchId(null);
    setMessage(result.message || "Date / heure enregistrée ✅");

    return true;
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

    for (const matchId of changedMatchIds) {
      const success = await saveMatchDate(matchId);

      if (!success) {
        setSavingAll(false);
        return;
      }

      saved += 1;
    }

    setSavingAll(false);
    setMessage(`${saved} programmation(s) enregistrée(s) ✅`);

    await loadData();
    await onChanged?.();
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#F7E9C5]">
            Programmation rapide des matchs
          </h2>

          <p className="mt-2 text-sm text-[#D8C7A0]">
            Planifie plusieurs matchs sans ouvrir chaque fiche une par une.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-[#D9A441]/25 bg-[#0B0610]/70 px-5 py-3 text-center">
            <p className="text-2xl font-black text-[#F2D27A]">
              {editableMatches.length}
            </p>
            <p className="text-xs uppercase tracking-widest text-[#8F7B5C]">
              à programmer
            </p>
          </div>

          <button
            type="button"
            disabled={savingAll || changedMatchIds.length === 0}
            onClick={handleSaveAll}
            className="rounded-xl bg-[#A61E22] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingAll
              ? "Enregistrement..."
              : `Enregistrer tout (${changedMatchIds.length})`}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-[#D9A441]/30 bg-[#0B0610]/70 px-4 py-3 text-sm font-semibold text-[#F2D27A]">
          {message}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
          Chargement de la programmation...
        </div>
      ) : editableMatches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D9A441]/20 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
          Aucun match à programmer pour cette compétition.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70">
          <div className="max-h-[460px] overflow-y-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#26070b] text-[10px] uppercase tracking-[0.18em] text-[#F2D27A]">
                <tr>
                  <th className="border-b border-[#D9A441]/20 px-4 py-3">
                    Match
                  </th>
                  <th className="border-b border-[#D9A441]/20 px-4 py-3">
                    Date actuelle
                  </th>
                  <th className="border-b border-[#D9A441]/20 px-4 py-3">
                    Nouvelle date / heure
                  </th>
                  <th className="border-b border-[#D9A441]/20 px-4 py-3 text-right">
                    Statut
                  </th>
                  <th className="border-b border-[#D9A441]/20 px-4 py-3 text-right">
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
                      className="border-b border-[#D9A441]/10 transition hover:bg-[#D9A441]/5"
                    >
                      <td className="px-4 py-4">
                        <p className="font-black text-[#F7E9C5]">
                          {getParticipantName(match.home_competition_player_id)}
                        </p>
                        <p className="my-1 text-xs font-black uppercase tracking-widest text-[#F2D27A]">
                          vs
                        </p>
                        <p className="font-black text-[#F7E9C5]">
                          {getParticipantName(match.away_competition_player_id)}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-[#D8C7A0]">
                        {formatDate(match.match_date)}
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="datetime-local"
                          value={dateForms[match.id] ?? ""}
                          onChange={(event) =>
                            updateDateForm(match.id, event.target.value)
                          }
                          className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                        />

                        <button
                          type="button"
                          onClick={() => updateDateForm(match.id, "")}
                          className="mt-2 text-xs font-semibold text-[#8F7B5C] transition hover:text-[#F2D27A]"
                        >
                          Effacer la date
                        </button>
                      </td>

                      <td className="px-4 py-4 text-right">
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
                          className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-xs font-semibold text-[#F2D27A] transition hover:bg-[#160A12] disabled:cursor-not-allowed disabled:opacity-40"
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
