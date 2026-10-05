"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type TeamRole = "manager" | "captain" | "player";

type Team = {
  id: string;
  name: string;
  manager: string | null;
  created_at?: string | null;
};

type MemberOption = {
  player_id: string;
  profile_id: string | null;
  name: string | null;
  ea_name: string | null;
  platform: string | null;
  username: string | null;
  email: string | null;
  pays: string | null;
};

type TeamMember = {
  id: string;
  team_id: string;
  player_id: string;
  role: TeamRole;
  created_at?: string | null;
};

type Competition = {
  id: string;
  name: string;
  season: string | null;
  status: string;
  participant_type: "teams" | "players";
};

type CompetitionTeam = {
  id: string;
  competition_id: string;
  team_id: string;
  created_at?: string | null;
};

type CreateTeamForm = {
  name: string;
  manager: string;
};

const emptyCreateTeamForm: CreateTeamForm = {
  name: "",
  manager: "",
};

function getMemberLabel(member: MemberOption | null) {
  if (!member) return "Membre inconnu";

  return (
    member.name ||
    member.username ||
    member.ea_name ||
    member.email ||
    "Membre"
  );
}

function getRoleLabel(role: TeamRole) {
  if (role === "manager") return "Manager";
  if (role === "captain") return "Capitaine";

  return "Joueur";
}

function getCompetitionLabel(competition: Competition | null) {
  if (!competition) return "Compétition inconnue";

  return competition.season
    ? `${competition.name} · ${competition.season}`
    : competition.name;
}

function getStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "planned") return "Planifiée";
  if (status === "scheduled") return "Programmée";
  if (status === "completed") return "Terminée";
  if (status === "archived") return "Archivée";

  return status;
}

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

export default function AdminTeamsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>(
    []
  );

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [createForm, setCreateForm] =
    useState<CreateTeamForm>(emptyCreateTeamForm);

  const [editName, setEditName] = useState("");
  const [editManager, setEditManager] = useState("");

  const [memberToAdd, setMemberToAdd] = useState("");
  const [roleToAdd, setRoleToAdd] = useState<TeamRole>("player");
  const [competitionToAdd, setCompetitionToAdd] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getAccessToken() {
    const sessionResult = await supabase.auth.getSession();
    return sessionResult.data.session?.access_token ?? null;
  }

  async function loadData() {
    setLoading(true);
    setMessage("");

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      setLoading(false);
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
      members?: MemberOption[];
      team_members?: TeamMember[];
      competition_teams?: CompetitionTeam[];
      competitions?: Competition[];
    } = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Erreur chargement teams esport.");
      setLoading(false);
      return;
    }

    const loadedTeams = (result.teams ?? []) as Team[];

    setTeams(loadedTeams);
    setMembers((result.members ?? []) as MemberOption[]);
    setTeamMembers((result.team_members ?? []) as TeamMember[]);
    setCompetitionTeams((result.competition_teams ?? []) as CompetitionTeam[]);
    setCompetitions((result.competitions ?? []) as Competition[]);

    if (selectedTeamId) {
      const selected = loadedTeams.find((team) => team.id === selectedTeamId);

      if (selected) {
        setEditName(selected.name || "");
        setEditManager(selected.manager || "");
      } else {
        setSelectedTeamId(null);
        setEditName("");
        setEditManager("");
      }
    }

    setLoading(false);
  }

  const selectedTeam = useMemo(() => {
    return teams.find((team) => team.id === selectedTeamId) ?? null;
  }, [teams, selectedTeamId]);

  const memberByPlayerId = useMemo(() => {
    return new Map(members.map((member) => [member.player_id, member]));
  }, [members]);

  const competitionById = useMemo(() => {
    return new Map(
      competitions.map((competition) => [competition.id, competition])
    );
  }, [competitions]);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return teams;

    return teams.filter((team) => {
      const values = [team.name, team.manager].filter(Boolean).join(" ");
      return values.toLowerCase().includes(query);
    });
  }, [teams, search]);

  const selectedTeamMembers = useMemo(() => {
    if (!selectedTeam) return [];

    return teamMembers.filter((member) => member.team_id === selectedTeam.id);
  }, [teamMembers, selectedTeam]);

  const selectedCompetitionTeams = useMemo(() => {
    if (!selectedTeam) return [];

    return competitionTeams.filter(
      (competitionTeam) => competitionTeam.team_id === selectedTeam.id
    );
  }, [competitionTeams, selectedTeam]);

  const selectedTeamMemberIds = useMemo(() => {
    return new Set(selectedTeamMembers.map((member) => member.player_id));
  }, [selectedTeamMembers]);

  const availableMembers = useMemo(() => {
    return members.filter(
      (member) => !selectedTeamMemberIds.has(member.player_id)
    );
  }, [members, selectedTeamMemberIds]);

  const selectedCompetitionIds = useMemo(() => {
    return new Set(
      selectedCompetitionTeams.map(
        (competitionTeam) => competitionTeam.competition_id
      )
    );
  }, [selectedCompetitionTeams]);

  const availableCompetitions = useMemo(() => {
    return competitions.filter(
      (competition) => !selectedCompetitionIds.has(competition.id)
    );
  }, [competitions, selectedCompetitionIds]);

  function getTeamMembersCount(teamId: string) {
    return teamMembers.filter((member) => member.team_id === teamId).length;
  }

  function getTeamCompetitionsCount(teamId: string) {
    return competitionTeams.filter(
      (competitionTeam) => competitionTeam.team_id === teamId
    ).length;
  }

  function openTeamModal(team: Team) {
    setSelectedTeamId(team.id);
    setEditName(team.name || "");
    setEditManager(team.manager || "");
    setMemberToAdd("");
    setRoleToAdd("player");
    setCompetitionToAdd("");
    setMessage("");
  }

  function closeTeamModal() {
    setSelectedTeamId(null);
    setEditName("");
    setEditManager("");
    setMemberToAdd("");
    setRoleToAdd("player");
    setCompetitionToAdd("");
  }

  async function runTeamAction(
    action: string,
    payload: Record<string, unknown> = {}
  ) {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return false;
    }

    setSavingAction(action);
    setMessage("");

    const response = await fetch("/api/admin/teams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action,
        ...payload,
      }),
    });

    const result: { error?: string; message?: string } = await response.json();

    if (!response.ok) {
      setSavingAction("");
      setMessage(result.error || "Erreur action team esport.");
      return false;
    }

    setSavingAction("");
    setMessage(result.message || "Action effectuée ✅");

    await loadData();

    return true;
  }

  async function createTeam() {
    if (!createForm.name.trim()) {
      setMessage("Nom de team obligatoire.");
      return;
    }

    const success = await runTeamAction("create_team", {
      name: createForm.name,
      manager: createForm.manager,
    });

    if (success) {
      setCreateForm(emptyCreateTeamForm);
    }
  }

  async function updateTeam() {
    if (!selectedTeam) return;

    if (!editName.trim()) {
      setMessage("Nom de team obligatoire.");
      return;
    }

    await runTeamAction("update_team", {
      team_id: selectedTeam.id,
      name: editName,
      manager: editManager,
    });
  }

  async function deleteTeam(team: Team) {
    const confirmed = window.confirm(
      `Supprimer définitivement la team "${team.name}" ? Les inscriptions et matchs liés à cette team seront aussi supprimés.`
    );

    if (!confirmed) return;

    const success = await runTeamAction("delete_team", {
      team_id: team.id,
    });

    if (success && selectedTeamId === team.id) {
      closeTeamModal();
    }
  }

  async function addMemberToTeam() {
    if (!selectedTeam) return;

    if (!memberToAdd) {
      setMessage("Choisis un membre à rattacher.");
      return;
    }

    const success = await runTeamAction("add_member", {
      team_id: selectedTeam.id,
      player_id: memberToAdd,
      role: roleToAdd,
    });

    if (success) {
      setMemberToAdd("");
      setRoleToAdd("player");
    }
  }

  async function updateMemberRole(playerId: string, role: TeamRole) {
    if (!selectedTeam) return;

    await runTeamAction("update_member_role", {
      team_id: selectedTeam.id,
      player_id: playerId,
      role,
    });
  }

  async function removeMemberFromTeam(playerId: string) {
    if (!selectedTeam) return;

    const member = memberByPlayerId.get(playerId);
    const label = getMemberLabel(member ?? null);

    const confirmed = window.confirm(`Retirer ${label} de cette team ?`);

    if (!confirmed) return;

    await runTeamAction("remove_member", {
      team_id: selectedTeam.id,
      player_id: playerId,
    });
  }

  async function registerTeamToCompetition() {
    if (!selectedTeam) return;

    if (!competitionToAdd) {
      setMessage("Choisis une compétition.");
      return;
    }

    const success = await runTeamAction("register_competition", {
      team_id: selectedTeam.id,
      competition_id: competitionToAdd,
    });

    if (success) {
      setCompetitionToAdd("");
    }
  }

  async function unregisterTeamFromCompetition(competitionId: string) {
    if (!selectedTeam) return;

    const competition = competitionById.get(competitionId);

    const confirmed = window.confirm(
      `Retirer la team de "${getCompetitionLabel(
        competition ?? null
      )}" ? Les matchs liés à cette team dans cette compétition seront supprimés.`
    );

    if (!confirmed) return;

    await runTeamAction("unregister_competition", {
      team_id: selectedTeam.id,
      competition_id: competitionId,
    });
  }

  return (
    <main className="min-h-screen bg-[var(--navy)] px-4 py-10 text-[var(--parchment)]">
      <section className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-black text-[var(--gold-soft)] transition hover:border-[var(--gold)] hover:bg-[var(--gold)]/10"
          >
            ← Retour admin
          </Link>

          <Link
            href="/equipes"
            className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-black text-[var(--gold-soft)] transition hover:border-[var(--gold)] hover:bg-[var(--gold)]/10"
          >
            Vue publique équipes
          </Link>
        </div>

        <section className="rounded-[28px] border border-[var(--line)] bg-gradient-to-br from-[var(--navy-2)] to-[var(--navy)] p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[var(--gold)]">
                Guardian's Family
              </p>

              <h1 className="mt-3 text-4xl font-black text-[var(--gold-soft)] md:text-5xl">
                Gestion teams esport
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--parchment-dim)]">
                Crée les teams, rattache les membres, définis les rôles et
                inscris les teams aux compétitions dédiées.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <SummaryTile label="Teams" value={teams.length} />
              <SummaryTile label="Membres liés" value={teamMembers.length} />
              <SummaryTile
                label="Inscriptions"
                value={competitionTeams.length}
              />
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-6 rounded-2xl border border-[var(--gold)]/30 bg-[var(--navy-2)] px-4 py-3 text-sm font-black text-[var(--gold-soft)]">
            {message}
          </div>
        )}

        <section className="mt-8 rounded-[28px] border border-[var(--line)] bg-[var(--navy-2)]/95 p-6 shadow-2xl shadow-black/30">
          <h2 className="text-2xl font-black text-[var(--gold-soft)]">
            Créer une team esport
          </h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <input
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="rounded-xl border border-[var(--line)] bg-[var(--navy)] px-4 py-3 text-[var(--parchment)] outline-none placeholder:text-[var(--parchment-dim)]/50 focus:border-[var(--gold)]"
              placeholder="Nom de la team"
            />

            <input
              value={createForm.manager}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  manager: event.target.value,
                }))
              }
              className="rounded-xl border border-[var(--line)] bg-[var(--navy)] px-4 py-3 text-[var(--parchment)] outline-none placeholder:text-[var(--parchment-dim)]/50 focus:border-[var(--gold)]"
              placeholder="Manager"
            />

            <button
              type="button"
              disabled={savingAction === "create_team"}
              onClick={createTeam}
              className="rounded-xl bg-[var(--gold)] px-5 py-3 font-black text-[var(--navy)] shadow-lg shadow-black/20 transition hover:bg-[var(--gold-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingAction === "create_team" ? "Création..." : "Créer"}
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-[var(--line)] bg-[var(--navy-2)]/95 p-6 shadow-2xl shadow-black/30">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[var(--gold-soft)]">
                Teams existantes
              </h2>

              <p className="mt-2 text-sm text-[var(--parchment-dim)]">
                Tableur compact des teams. Clique sur gérer pour ouvrir la fiche.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-xl border border-[var(--line)] bg-[var(--navy)] px-4 py-3 text-[var(--parchment)] outline-none placeholder:text-[var(--parchment-dim)]/50 focus:border-[var(--gold)]"
              placeholder="Rechercher..."
            />
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--navy)]/60 p-6 text-[var(--parchment-dim)]">
              Chargement des teams...
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--navy)]/60 p-6 text-[var(--parchment-dim)]">
              Aucune team trouvée.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--navy)]/60">
              <div className="max-h-[620px] overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[26%]" />
                    <col className="w-[22%]" />
                    <col className="w-[13%]" />
                    <col className="w-[13%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                  </colgroup>

                  <thead className="sticky top-0 z-10 bg-[var(--navy-2)] text-[10px] uppercase tracking-[0.18em] text-[var(--gold-soft)]">
                    <tr>
                      <th className="border-b border-[var(--line)] px-4 py-3">
                        Team
                      </th>
                      <th className="border-b border-[var(--line)] px-4 py-3">
                        Manager
                      </th>
                      <th className="border-b border-[var(--line)] px-4 py-3 text-center">
                        Membres
                      </th>
                      <th className="border-b border-[var(--line)] px-4 py-3 text-center">
                        Compétitions
                      </th>
                      <th className="border-b border-[var(--line)] px-4 py-3">
                        Statut
                      </th>
                      <th className="border-b border-[var(--line)] px-4 py-3 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTeams.map((team) => {
                      const membersCount = getTeamMembersCount(team.id);
                      const competitionsCount = getTeamCompetitionsCount(
                        team.id
                      );
                      const initials = getInitials(team.name);

                      return (
                        <tr
                          key={team.id}
                          className="border-b border-[var(--line)] transition hover:bg-[var(--gold)]/5"
                        >
                          <td className="px-4 py-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--gold)]/35 bg-[var(--navy-2)] text-sm font-black text-[var(--gold-soft)]">
                                {initials}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-black text-[var(--parchment)]">
                                  {team.name}
                                </p>
                                <p className="mt-1 text-xs text-[var(--parchment-dim)]">
                                  Team esport
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-[var(--parchment-dim)]">
                            {team.manager || "À définir"}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--gold)]/35 bg-[var(--navy)] px-2 text-sm font-black text-[var(--gold-soft)]">
                              {membersCount}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--gold)]/35 bg-[var(--navy)] px-2 text-sm font-black text-[var(--gold-soft)]">
                              {competitionsCount}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--gold-soft)]">
                              Active
                            </span>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openTeamModal(team)}
                                className="rounded-lg border border-[var(--line)] px-4 py-2 text-xs font-black text-[var(--gold-soft)] transition hover:border-[var(--gold)] hover:bg-[var(--gold)]/10"
                              >
                                Gérer
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteTeam(team)}
                                className="rounded-lg border border-[#371015] bg-[#371015]/40 px-4 py-2 text-xs font-black text-[var(--parchment)] transition hover:bg-[#371015]/70"
                              >
                                Supprimer
                              </button>
                            </div>
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
      </section>

      {selectedTeam && (
        <TeamManagementModal
          selectedTeam={selectedTeam}
          editName={editName}
          editManager={editManager}
          setEditName={setEditName}
          setEditManager={setEditManager}
          closeTeamModal={closeTeamModal}
          updateTeam={updateTeam}
          savingAction={savingAction}
          availableMembers={availableMembers}
          memberToAdd={memberToAdd}
          setMemberToAdd={setMemberToAdd}
          roleToAdd={roleToAdd}
          setRoleToAdd={setRoleToAdd}
          addMemberToTeam={addMemberToTeam}
          selectedTeamMembers={selectedTeamMembers}
          memberByPlayerId={memberByPlayerId}
          updateMemberRole={updateMemberRole}
          removeMemberFromTeam={removeMemberFromTeam}
          availableCompetitions={availableCompetitions}
          competitionToAdd={competitionToAdd}
          setCompetitionToAdd={setCompetitionToAdd}
          registerTeamToCompetition={registerTeamToCompetition}
          selectedCompetitionTeams={selectedCompetitionTeams}
          competitionById={competitionById}
          unregisterTeamFromCompetition={unregisterTeamFromCompetition}
        />
      )}
    </main>
  );
}

function TeamManagementModal({
  selectedTeam,
  editName,
  editManager,
  setEditName,
  setEditManager,
  closeTeamModal,
  updateTeam,
  savingAction,
  availableMembers,
  memberToAdd,
  setMemberToAdd,
  roleToAdd,
  setRoleToAdd,
  addMemberToTeam,
  selectedTeamMembers,
  memberByPlayerId,
  updateMemberRole,
  removeMemberFromTeam,
  availableCompetitions,
  competitionToAdd,
  setCompetitionToAdd,
  registerTeamToCompetition,
  selectedCompetitionTeams,
  competitionById,
  unregisterTeamFromCompetition,
}: {
  selectedTeam: Team;
  editName: string;
  editManager: string;
  setEditName: (value: string) => void;
  setEditManager: (value: string) => void;
  closeTeamModal: () => void;
  updateTeam: () => void;
  savingAction: string;
  availableMembers: MemberOption[];
  memberToAdd: string;
  setMemberToAdd: (value: string) => void;
  roleToAdd: TeamRole;
  setRoleToAdd: (value: TeamRole) => void;
  addMemberToTeam: () => void;
  selectedTeamMembers: TeamMember[];
  memberByPlayerId: Map<string, MemberOption>;
  updateMemberRole: (playerId: string, role: TeamRole) => void;
  removeMemberFromTeam: (playerId: string) => void;
  availableCompetitions: Competition[];
  competitionToAdd: string;
  setCompetitionToAdd: (value: string) => void;
  registerTeamToCompetition: () => void;
  selectedCompetitionTeams: CompetitionTeam[];
  competitionById: Map<string, Competition>;
  unregisterTeamFromCompetition: (competitionId: string) => void;
}) {
  const inputClass =
    "rounded-xl border border-[var(--line)] bg-[var(--navy)] px-4 py-3 text-[var(--parchment)] outline-none focus:border-[var(--gold)]";
  const actionButtonClass =
    "rounded-xl bg-[var(--gold)] px-5 py-3 font-black text-[var(--navy)] shadow-lg shadow-black/20 transition hover:bg-[var(--gold-soft)] disabled:opacity-60";
  const sectionClass =
    "rounded-2xl border border-[var(--line)] bg-[var(--navy-2)]/70 p-5";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--navy)]/85 px-4 py-8 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--navy-2)] shadow-2xl shadow-black/70">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[var(--gold)]">
              Gestion team esport
            </p>

            <h2 className="mt-3 text-3xl font-black text-[var(--gold-soft)]">
              {selectedTeam.name}
            </h2>

            <p className="mt-2 text-sm text-[var(--parchment-dim)]">
              Manager : {selectedTeam.manager || "À définir"}
            </p>
          </div>

          <button
            type="button"
            onClick={closeTeamModal}
            className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-black text-[var(--gold-soft)] transition hover:border-[var(--gold)] hover:bg-[var(--gold)]/10"
          >
            Fermer
          </button>
        </div>

        <div className="max-h-[calc(92vh-120px)] overflow-y-auto p-6">
          <div className="grid gap-6">
            <section className={sectionClass}>
              <h3 className="text-lg font-black text-[var(--gold-soft)]">
                Informations team
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className={inputClass}
                  placeholder="Nom de team"
                />

                <input
                  value={editManager}
                  onChange={(event) => setEditManager(event.target.value)}
                  className={inputClass}
                  placeholder="Manager"
                />

                <button
                  type="button"
                  disabled={savingAction === "update_team"}
                  onClick={updateTeam}
                  className={actionButtonClass}
                >
                  {savingAction === "update_team" ? "..." : "Enregistrer"}
                </button>
              </div>
            </section>

            <section className={sectionClass}>
              <h3 className="text-lg font-black text-[var(--gold-soft)]">
                Membres de la team
              </h3>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
                <select
                  value={memberToAdd}
                  onChange={(event) => setMemberToAdd(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Choisir un membre</option>
                  {availableMembers.map((member) => (
                    <option key={member.player_id} value={member.player_id}>
                      {getMemberLabel(member)} · {member.platform || "PC"}
                    </option>
                  ))}
                </select>

                <select
                  value={roleToAdd}
                  onChange={(event) =>
                    setRoleToAdd(event.target.value as TeamRole)
                  }
                  className={inputClass}
                >
                  <option value="player">Joueur</option>
                  <option value="captain">Capitaine</option>
                  <option value="manager">Manager</option>
                </select>

                <button
                  type="button"
                  disabled={savingAction === "add_member"}
                  onClick={addMemberToTeam}
                  className={actionButtonClass}
                >
                  Ajouter
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-[var(--line)]">
                {selectedTeamMembers.length === 0 ? (
                  <div className="p-4 text-sm text-[var(--parchment-dim)]">
                    Aucun membre rattaché.
                  </div>
                ) : (
                  <table className="w-full table-fixed border-collapse text-left text-sm">
                    <colgroup>
                      <col className="w-[42%]" />
                      <col className="w-[18%]" />
                      <col className="w-[24%]" />
                      <col className="w-[16%]" />
                    </colgroup>

                    <tbody>
                      {selectedTeamMembers.map((teamMember) => {
                        const member =
                          memberByPlayerId.get(teamMember.player_id) ?? null;

                        return (
                          <tr
                            key={teamMember.id}
                            className="border-b border-[var(--line)]"
                          >
                            <td className="px-4 py-3">
                              <p className="font-black text-[var(--parchment)]">
                                {getMemberLabel(member)}
                              </p>
                              <p className="mt-1 text-xs text-[var(--parchment-dim)]">
                                EA : {member?.ea_name || "Non renseigné"}
                              </p>
                            </td>

                            <td className="px-4 py-3 text-[var(--parchment-dim)]">
                              {member?.platform || "PC"}
                            </td>

                            <td className="px-4 py-3">
                              <select
                                value={teamMember.role}
                                onChange={(event) =>
                                  updateMemberRole(
                                    teamMember.player_id,
                                    event.target.value as TeamRole
                                  )
                                }
                                className="w-full rounded-lg border border-[var(--line)] bg-[var(--navy)] px-3 py-2 text-[var(--parchment)]"
                              >
                                <option value="player">Joueur</option>
                                <option value="captain">Capitaine</option>
                                <option value="manager">Manager</option>
                              </select>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  removeMemberFromTeam(teamMember.player_id)
                                }
                                className="rounded-lg border border-[#371015] bg-[#371015]/40 px-3 py-2 text-xs font-black text-[var(--parchment)] transition hover:bg-[#371015]/70"
                              >
                                Retirer
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className={sectionClass}>
              <h3 className="text-lg font-black text-[var(--gold-soft)]">
                Inscriptions compétitions
              </h3>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <select
                  value={competitionToAdd}
                  onChange={(event) => setCompetitionToAdd(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Choisir une compétition teams</option>
                  {availableCompetitions.map((competition) => (
                    <option key={competition.id} value={competition.id}>
                      {getCompetitionLabel(competition)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={savingAction === "register_competition"}
                  onClick={registerTeamToCompetition}
                  className={actionButtonClass}
                >
                  Inscrire
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-[var(--line)]">
                {selectedCompetitionTeams.length === 0 ? (
                  <div className="p-4 text-sm text-[var(--parchment-dim)]">
                    Cette team n’est inscrite à aucune compétition teams.
                  </div>
                ) : (
                  <table className="w-full table-fixed border-collapse text-left text-sm">
                    <tbody>
                      {selectedCompetitionTeams.map((competitionTeam) => {
                        const competition = competitionById.get(
                          competitionTeam.competition_id
                        );

                        return (
                          <tr
                            key={competitionTeam.id}
                            className="border-b border-[var(--line)]"
                          >
                            <td className="px-4 py-3">
                              <p className="font-black text-[var(--parchment)]">
                                {getCompetitionLabel(competition ?? null)}
                              </p>
                              <p className="mt-1 text-xs text-[var(--parchment-dim)]">
                                Statut :{" "}
                                {competition
                                  ? getStatusLabel(competition.status)
                                  : "Inconnu"}
                              </p>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  unregisterTeamFromCompetition(
                                    competitionTeam.competition_id
                                  )
                                }
                                className="rounded-lg border border-[#371015] bg-[#371015]/40 px-3 py-2 text-xs font-black text-[var(--parchment)] transition hover:bg-[#371015]/70"
                              >
                                Retirer
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--navy)]/60 px-5 py-4">
      <p className="text-2xl font-black text-[var(--gold-soft)]">{value}</p>
      <p className="text-xs uppercase tracking-widest text-[var(--parchment-dim)]">
        {label}
      </p>
    </div>
  );
}