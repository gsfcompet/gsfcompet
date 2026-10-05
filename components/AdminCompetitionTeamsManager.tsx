"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  name: string;
  manager: string | null;
};

type CompetitionTeam = {
  id: string;
  competition_id: string;
  team_id: string;
  created_at?: string | null;
};

type TeamMember = {
  id: string;
  team_id: string;
  player_id: string;
  role: "manager" | "captain" | "player";
};

type AdminCompetitionTeamsManagerProps = {
  competitionId: string;
  onChanged?: () => void | Promise<void>;
};

function getInitials(value: string) {
  return (
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "T"
  );
}

export default function AdminCompetitionTeamsManager({
  competitionId,
  onChanged,
}: AdminCompetitionTeamsManagerProps) {
  const supabase = useMemo(() => createClient(), []);

  const [teams, setTeams] = useState<Team[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>(
    []
  );
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [teamToAdd, setTeamToAdd] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState("");
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

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setMessage("Session admin introuvable. Reconnecte-toi.");
        return;
      }

      const response = await fetch("/api/admin/teams", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result: {
        error?: string;
        message?: string;
        teams?: Team[];
        competition_teams?: CompetitionTeam[];
        team_members?: TeamMember[];
      } = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Erreur chargement teams esport.");
        return;
      }

      setTeams(result.teams ?? []);
      setCompetitionTeams(result.competition_teams ?? []);
      setTeamMembers(result.team_members ?? []);
    } catch {
      setMessage("Impossible de charger les teams. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  const currentCompetitionTeams = useMemo(() => {
    return competitionTeams.filter(
      (competitionTeam) => competitionTeam.competition_id === competitionId
    );
  }, [competitionTeams, competitionId]);

  const registeredTeamIds = useMemo(() => {
    return new Set(currentCompetitionTeams.map((item) => item.team_id));
  }, [currentCompetitionTeams]);

  const registeredTeams = useMemo(() => {
    return currentCompetitionTeams
      .map((competitionTeam) => ({
        competitionTeam,
        team: teams.find((item) => item.id === competitionTeam.team_id),
      }))
      .filter(
        (
          item
        ): item is {
          competitionTeam: CompetitionTeam;
          team: Team;
        } => Boolean(item.team)
      );
  }, [currentCompetitionTeams, teams]);

  const availableTeams = useMemo(() => {
    return teams.filter((team) => !registeredTeamIds.has(team.id));
  }, [teams, registeredTeamIds]);

  function getTeamMembersCount(teamId: string) {
    return teamMembers.filter((member) => member.team_id === teamId).length;
  }

  async function runTeamAction(
    action: "register_competition" | "unregister_competition",
    payload: Record<string, unknown>
  ) {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return false;
    }

    setSavingAction(action);
    setMessage("");

    try {
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action, ...payload }),
      });

      const result: { error?: string; message?: string } =
        await response.json();

      if (!response.ok) {
        setMessage(result.error || "Erreur action team esport.");
        return false;
      }

      setMessage(result.message || "Action effectuée ✅");
      await loadData();
      await onChanged?.();

      return true;
    } catch {
      setMessage("Impossible de contacter le serveur. Réessaie.");
      return false;
    } finally {
      setSavingAction("");
    }
  }

  async function addTeamToCompetition() {
    if (!teamToAdd) {
      setMessage("Choisis une team à inscrire.");
      return;
    }

    const success = await runTeamAction("register_competition", {
      team_id: teamToAdd,
      competition_id: competitionId,
    });

    if (success) {
      setTeamToAdd("");
    }
  }

  async function removeTeamFromCompetition(team: Team) {
    const confirmed = window.confirm(
      `Retirer la team « ${team.name} » de cette compétition ? Les matchs liés à cette team dans cette compétition seront supprimés.`
    );

    if (!confirmed) return;

    await runTeamAction("unregister_competition", {
      team_id: team.id,
      competition_id: competitionId,
    });
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#C39B55]/20 bg-[#0B1B33]/90 p-6 shadow-lg shadow-black/30">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#DBC399]">
            Gestion des teams esport
          </h2>

          <p className="mt-2 text-sm text-[#CFC6AB]">
            Inscris les teams à cette compétition, ou retire une team déjà
            inscrite.
          </p>
        </div>

        <div className="rounded-xl border border-[#C39B55]/25 bg-[#071326]/80 px-5 py-3 text-center">
          <p className="text-2xl font-black text-[#DBC399]">
            {registeredTeams.length}
          </p>
          <p className="text-xs uppercase tracking-widest text-[#CFC6AB]/70">
            teams
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-[#C39B55]/30 bg-[#071326]/80 px-4 py-3 text-sm font-semibold text-[#DBC399]">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border border-[#C39B55]/15 bg-[#071326]/70 p-5">
          <h3 className="text-lg font-black text-[#DBC399]">
            Ajouter une team
          </h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={teamToAdd}
              onChange={(event) => setTeamToAdd(event.target.value)}
              className="rounded-xl border border-[#C39B55]/20 bg-[#09182D] px-4 py-3 text-[#DBC399] outline-none transition focus:border-[#C39B55]/60"
            >
              <option value="">Choisir une team</option>

              {availableTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                  {team.manager ? ` · Manager : ${team.manager}` : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={
                savingAction === "register_competition" || !teamToAdd
              }
              onClick={addTeamToCompetition}
              className="rounded-xl border border-[#C39B55]/40 bg-[#17345B] px-5 py-3 text-sm font-black text-[#DBC399] shadow-lg shadow-black/20 transition hover:bg-[#204575] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingAction === "register_competition" ? "..." : "Inscrire"}
            </button>
          </div>

          {availableTeams.length === 0 && !loading && (
            <p className="mt-4 rounded-xl border border-dashed border-[#C39B55]/20 bg-[#09182D] px-4 py-3 text-sm text-[#CFC6AB]">
              Toutes les teams existantes sont déjà inscrites à cette
              compétition.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[#C39B55]/15 bg-[#071326]/70 p-5">
          <h3 className="text-lg font-black text-[#DBC399]">
            Teams inscrites
          </h3>

          {loading ? (
            <div className="mt-4 rounded-xl border border-[#C39B55]/15 bg-[#09182D] p-4 text-sm text-[#CFC6AB]">
              Chargement des teams...
            </div>
          ) : registeredTeams.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#C39B55]/20 bg-[#09182D] p-4 text-sm text-[#CFC6AB]">
              Aucune team inscrite pour le moment.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-[#C39B55]/15">
              <table className="w-full table-fixed border-collapse text-left text-sm">
                <colgroup>
                  <col className="w-[44%]" />
                  <col className="w-[24%]" />
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                </colgroup>

                <thead className="bg-[#102443] text-[10px] uppercase tracking-[0.18em] text-[#DBC399]">
                  <tr>
                    <th className="border-b border-[#C39B55]/20 px-4 py-3">
                      Team
                    </th>
                    <th className="border-b border-[#C39B55]/20 px-4 py-3">
                      Manager
                    </th>
                    <th className="border-b border-[#C39B55]/20 px-4 py-3 text-center">
                      Membres
                    </th>
                    <th className="border-b border-[#C39B55]/20 px-4 py-3 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {registeredTeams.map(({ competitionTeam, team }) => (
                    <tr
                      key={competitionTeam.id}
                      className="border-b border-[#C39B55]/10 transition hover:bg-[#C39B55]/5"
                    >
                      <td className="px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C39B55]/35 bg-[#17345B] text-sm font-black text-[#DBC399]">
                            {getInitials(team.name)}
                          </div>

                          <p className="truncate font-black text-[#DBC399]">
                            {team.name}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-[#CFC6AB]">
                        {team.manager || "À définir"}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[#C39B55]/35 bg-[#09182D] px-2 text-sm font-black text-[#DBC399]">
                          {getTeamMembersCount(team.id)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          disabled={
                            savingAction === "unregister_competition"
                          }
                          onClick={() => removeTeamFromCompetition(team)}
                          className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-xs font-black text-rose-300 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Retirer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}