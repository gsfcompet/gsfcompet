"use client";

import { useEffect, useState } from "react";
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

type Match = {
  id: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  mvp: string | null;
};

type EaTeam = {
  id: string;
  country: string;
  league: string;
  name: string;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("competition");
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [eaTeams, setEaTeams] = useState<EaTeam[]>([]);
  const [debugMessage, setDebugMessage] = useState("");

  async function loadCompetitions() {
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setDebugMessage(`Erreur competitions : ${error.message}`);
      return;
    }

    setCompetitions(data ?? []);
  }

  async function loadTeams() {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setDebugMessage(`Erreur teams : ${error.message}`);
      return;
    }

    setTeams(data ?? []);
  }

  async function loadMatches() {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setDebugMessage(`Erreur matches : ${error.message}`);
      return;
    }

    setMatches(data ?? []);
  }

  async function loadEaTeams() {
    const { data, error } = await supabase
      .from("ea_teams")
      .select("*")
      .order("country", { ascending: true })
      .order("league", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setDebugMessage(`Erreur équipes EA FC : ${error.message}`);
      return;
    }

    setEaTeams(data ?? []);
  }

  async function refreshData() {
    setDebugMessage("");
    await loadCompetitions();
    await loadTeams();
    await loadMatches();
    await loadEaTeams();
  }

  useEffect(() => {
    refreshData();
  }, []);

  function getTeamName(teamId: string) {
    return teams.find((team) => team.id === teamId)?.name ?? "Équipe inconnue";
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Gestion privée
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Admin</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Gérez les compétitions, équipes, matchs, scores et équipes EA FC.
          </p>

          <div className="mt-6 rounded-xl border border-[#D9A441]/20 bg-[#160A12] p-4 text-sm text-[#F2D27A]">
            <p>Compétitions chargées : {competitions.length}</p>
            <p>Équipes chargées : {teams.length}</p>
            <p>Matchs chargés : {matches.length}</p>
            <p>Équipes EA FC chargées : {eaTeams.length}</p>
            {debugMessage && (
              <p className="mt-2 text-red-300">{debugMessage}</p>
            )}
          </div>
        </div>

        <div className="mb-8 grid gap-3 md:grid-cols-5">
          <TabButton
            label="Compétition"
            value="competition"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <TabButton
            label="Équipe"
            value="team"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <TabButton
            label="Match"
            value="match"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <TabButton
            label="Score"
            value="score"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <TabButton
            label="Équipes EA FC"
            value="ea-teams"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>

        {activeTab === "competition" && (
          <CompetitionForm
            competitions={competitions}
            onCompetitionChanged={refreshData}
          />
        )}

        {activeTab === "team" && (
          <TeamForm competitions={competitions} onTeamChanged={refreshData} />
        )}

        {activeTab === "match" && (
          <MatchForm
            competitions={competitions}
            teams={teams}
            onMatchCreated={refreshData}
          />
        )}

        {activeTab === "score" && (
          <ScoreForm
            matches={matches}
            getTeamName={getTeamName}
            onScoreAdded={refreshData}
          />
        )}

        {activeTab === "ea-teams" && (
          <EaTeamsForm eaTeams={eaTeams} onEaTeamsChanged={refreshData} />
        )}
      </section>
    </main>
  );
}

function TabButton({
  label,
  value,
  activeTab,
  setActiveTab,
}: {
  label: string;
  value: string;
  activeTab: string;
  setActiveTab: (value: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => setActiveTab(value)}
      className={`rounded-xl border px-4 py-3 font-semibold transition ${
        activeTab === value
          ? "border-[#D9A441]/40 bg-[#A61E22] text-white"
          : "border-[#D9A441]/20 bg-[#160A12] text-[#D8C7A0] hover:text-[#F2D27A]"
      }`}
    >
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
    />
  );
}

function SubmitButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-6 rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
      <h2 className="text-2xl font-black text-[#F7E9C5]">{title}</h2>
      <p className="mt-2 text-[#D8C7A0]">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function MessageBox({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="rounded-xl border border-[#D9A441]/30 bg-[#0B0610] px-4 py-3 text-sm text-[#F2D27A]">
      {message}
    </div>
  );
}

/* ----------------------------- COMPÉTITIONS ----------------------------- */

function CompetitionForm({
  competitions,
  onCompetitionChanged,
}: {
  competitions: Competition[];
  onCompetitionChanged: () => Promise<void>;
}) {
  const [editingCompetitionId, setEditingCompetitionId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [season, setSeason] = useState("");
  const [status, setStatus] = useState("active");
  const [participantType, setParticipantType] = useState<"teams" | "players">(
    "teams"
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setEditingCompetitionId("");
    setName("");
    setType("");
    setSeason("");
    setStatus("active");
    setParticipantType("teams");
    setMessage("");
  }

  function selectCompetition(competition: Competition) {
    setEditingCompetitionId(competition.id);
    setName(competition.name);
    setType(competition.type);
    setSeason(competition.season ?? "");
    setStatus(competition.status);
    setParticipantType(competition.participant_type ?? "teams");
    setMessage(`Modification de : ${competition.name}`);
  }

  async function handleSaveCompetition(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name || !type) {
      setMessage("Merci de remplir le nom et le type de compétition.");
      return;
    }

    setLoading(true);
    setMessage("");

    if (editingCompetitionId) {
      const { error } = await supabase
        .from("competitions")
        .update({
          name,
          type,
          season: season || null,
          status,
          participant_type: participantType,
        })
        .eq("id", editingCompetitionId);

      setLoading(false);

      if (error) {
        setMessage(`Erreur modification : ${error.message}`);
        return;
      }

      resetForm();
      setMessage("Compétition modifiée avec succès ✅");
      await onCompetitionChanged();
      return;
    }

    const { error } = await supabase.from("competitions").insert({
      name,
      type,
      season: season || null,
      status,
      participant_type: participantType,
    });

    setLoading(false);

    if (error) {
      setMessage(`Erreur création : ${error.message}`);
      return;
    }

    resetForm();
    setMessage("Compétition créée avec succès ✅");
    await onCompetitionChanged();
  }

  async function handleDeleteCompetition(competition: Competition) {
    const confirmDelete = window.confirm(
      `Supprimer la compétition "${competition.name}" ? Cette action peut aussi supprimer les matchs liés.`
    );

    if (!confirmDelete) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("competitions")
      .delete()
      .eq("id", competition.id);

    setLoading(false);

    if (error) {
      setMessage(`Erreur suppression : ${error.message}`);
      return;
    }

    if (editingCompetitionId === competition.id) {
      resetForm();
    }

    setMessage("Compétition supprimée avec succès ✅");
    await onCompetitionChanged();
  }

  function getStatusLabel(value: string) {
    if (value === "active") return "En cours";
    if (value === "planned") return "Planifiée";
    if (value === "completed") return "Terminée";
    if (value === "draft") return "Brouillon";
    return value;
  }

  function getParticipantTypeLabel(value: string) {
    if (value === "players") return "Joueurs EA FC";
    return "Teams / clubs";
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <FormCard
        title={
          editingCompetitionId
            ? "Modifier une compétition"
            : "Créer une compétition"
        }
        description={
          editingCompetitionId
            ? "Modifie les informations d’une compétition existante."
            : "Ajoute un championnat, une coupe ou un tournoi EA FC 26."
        }
      >
        <form onSubmit={handleSaveCompetition} className="grid gap-5">
          <MessageBox message={message} />

          <div>
            <FieldLabel>Nom de la compétition</FieldLabel>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex : Guardian's League"
            />
          </div>

          <div>
            <FieldLabel>Type</FieldLabel>
            <Select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">Choisir un type</option>
              <option value="Championnat">Championnat</option>
              <option value="Coupe">Coupe</option>
              <option value="Tournoi rapide">Tournoi rapide</option>
              <option value="Super Cup">Super Cup</option>
            </Select>
          </div>

          <div>
            <FieldLabel>Saison</FieldLabel>
            <Input
              value={season}
              onChange={(event) => setSeason(event.target.value)}
              placeholder="Ex : Saison 1"
            />
          </div>

          <div>
            <FieldLabel>Format de participation</FieldLabel>
            <Select
              value={participantType}
              onChange={(event) =>
                setParticipantType(event.target.value as "teams" | "players")
              }
            >
              <option value="teams">Teams / clubs</option>
              <option value="players">Joueurs avec équipes EA FC</option>
            </Select>

            <p className="mt-2 text-sm text-[#8F7B5C]">
              Teams / clubs = compétition inter-team. Joueurs EA FC = chaque
              joueur choisit une équipe du jeu.
            </p>
          </div>

          <div>
            <FieldLabel>Statut</FieldLabel>
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="active">En cours</option>
              <option value="planned">Planifiée</option>
              <option value="completed">Terminée</option>
              <option value="draft">Brouillon</option>
            </Select>
          </div>

          <div className="flex flex-wrap gap-3">
            <SubmitButton disabled={loading}>
              {loading
                ? "Enregistrement..."
                : editingCompetitionId
                  ? "Modifier la compétition"
                  : "Créer la compétition"}
            </SubmitButton>

            {editingCompetitionId && (
              <button
                type="button"
                onClick={resetForm}
                className="mt-6 rounded-xl border border-[#D9A441]/30 bg-[#0B0610] px-6 py-3 font-semibold text-[#F2D27A] transition hover:bg-[#1E1016]"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </FormCard>

      <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
        <h2 className="text-2xl font-black text-[#F7E9C5]">
          Compétitions existantes
        </h2>

        <p className="mt-2 text-[#D8C7A0]">
          Sélectionne une compétition pour la modifier ou la supprimer.
        </p>

        <div className="mt-6 space-y-3">
          {competitions.length === 0 && (
            <p className="rounded-xl border border-[#D9A441]/20 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
              Aucune compétition créée pour le moment.
            </p>
          )}

          {competitions.map((competition) => (
            <div
              key={competition.id}
              className={`rounded-xl border p-4 transition ${
                editingCompetitionId === competition.id
                  ? "border-[#D9A441]/60 bg-[#A61E22]/20"
                  : "border-[#D9A441]/15 bg-[#0B0610]/70"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black text-[#F7E9C5]">
                    {competition.name}
                  </h3>

                  <p className="mt-1 text-sm text-[#D8C7A0]">
                    {competition.type} ·{" "}
                    {competition.season || "Saison non définie"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#D9A441]/20 bg-[#160A12] px-3 py-1 text-xs text-[#F2D27A]">
                      {getParticipantTypeLabel(competition.participant_type)}
                    </span>

                    <span className="rounded-full border border-[#D9A441]/20 bg-[#160A12] px-3 py-1 text-xs text-[#D8C7A0]">
                      {getStatusLabel(competition.status)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => selectCompetition(competition)}
                    className="rounded-lg border border-[#D9A441]/30 bg-[#160A12] px-3 py-2 text-xs font-semibold text-[#F2D27A] transition hover:bg-[#1E1016]"
                  >
                    Modifier
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCompetition(competition)}
                    className="rounded-lg bg-[#A61E22]/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#8E171C]"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- ÉQUIPES -------------------------------- */

function TeamForm({
  competitions,
  onTeamChanged,
}: {
  competitions: Competition[];
  onTeamChanged: () => Promise<void>;
}) {
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [editingTeamId, setEditingTeamId] = useState("");
  const [name, setName] = useState("");
  const [manager, setManager] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadTeamsForEdit() {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Erreur chargement équipes : ${error.message}`);
      return;
    }

    setTeamsList(data ?? []);
  }

  useEffect(() => {
    loadTeamsForEdit();
  }, []);

  function resetForm() {
    setEditingTeamId("");
    setName("");
    setManager("");
    setCompetitionId("");
    setMessage("");
  }

  async function selectTeam(team: Team) {
    setEditingTeamId(team.id);
    setName(team.name);
    setManager(team.manager ?? "");
    setMessage(`Modification de : ${team.name}`);

    const { data, error } = await supabase
      .from("competition_teams")
      .select("competition_id")
      .eq("team_id", team.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      setCompetitionId("");
      return;
    }

    setCompetitionId(data?.competition_id ?? "");
  }

  async function handleSaveTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name) {
      setMessage("Merci de renseigner le nom de l’équipe.");
      return;
    }

    setLoading(true);
    setMessage("");

    if (editingTeamId) {
      const { error: updateError } = await supabase
        .from("teams")
        .update({
          name,
          manager: manager || null,
        })
        .eq("id", editingTeamId);

      if (updateError) {
        setLoading(false);
        setMessage(`Erreur modification : ${updateError.message}`);
        return;
      }

      const { error: deleteLinksError } = await supabase
        .from("competition_teams")
        .delete()
        .eq("team_id", editingTeamId);

      if (deleteLinksError) {
        setLoading(false);
        setMessage(
          `Équipe modifiée, mais erreur compétition : ${deleteLinksError.message}`
        );
        return;
      }

      if (competitionId) {
        const { error: linkError } = await supabase
          .from("competition_teams")
          .insert({
            competition_id: competitionId,
            team_id: editingTeamId,
          });

        if (linkError) {
          setLoading(false);
          setMessage(
            `Équipe modifiée, mais erreur inscription : ${linkError.message}`
          );
          return;
        }
      }

      setLoading(false);
      resetForm();
      setMessage("Équipe modifiée avec succès ✅");

      await loadTeamsForEdit();
      await onTeamChanged();
      return;
    }

    const { data: createdTeam, error: teamError } = await supabase
      .from("teams")
      .insert({
        name,
        manager: manager || null,
      })
      .select()
      .single();

    if (teamError) {
      setLoading(false);
      setMessage(`Erreur création : ${teamError.message}`);
      return;
    }

    if (competitionId && createdTeam) {
      const { error: linkError } = await supabase
        .from("competition_teams")
        .insert({
          competition_id: competitionId,
          team_id: createdTeam.id,
        });

      if (linkError) {
        setLoading(false);
        setMessage(
          `Équipe créée, mais erreur d’inscription : ${linkError.message}`
        );
        return;
      }
    }

    setLoading(false);
    resetForm();
    setMessage("Équipe ajoutée avec succès ✅");

    await loadTeamsForEdit();
    await onTeamChanged();
  }

  async function handleDeleteTeam(team: Team) {
    const confirmDelete = window.confirm(
      `Supprimer l’équipe "${team.name}" ? Si elle a déjà des matchs, la suppression peut être refusée.`
    );

    if (!confirmDelete) return;

    setLoading(true);
    setMessage("");

    const { error: deleteLinksError } = await supabase
      .from("competition_teams")
      .delete()
      .eq("team_id", team.id);

    if (deleteLinksError) {
      setLoading(false);
      setMessage(
        `Erreur suppression inscriptions : ${deleteLinksError.message}`
      );
      return;
    }

    const { error: deleteTeamError } = await supabase
      .from("teams")
      .delete()
      .eq("id", team.id);

    setLoading(false);

    if (deleteTeamError) {
      setMessage(
        `Erreur suppression : ${deleteTeamError.message}. Si cette équipe a des matchs, supprime ou modifie d’abord les matchs liés.`
      );
      return;
    }

    if (editingTeamId === team.id) {
      resetForm();
    }

    setMessage("Équipe supprimée avec succès ✅");

    await loadTeamsForEdit();
    await onTeamChanged();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <FormCard
        title={editingTeamId ? "Modifier une équipe" : "Ajouter une équipe"}
        description={
          editingTeamId
            ? "Modifie le nom, le manager ou la compétition liée."
            : "Inscris une équipe ou un membre dans la compétition."
        }
      >
        <form onSubmit={handleSaveTeam} className="grid gap-5">
          <MessageBox message={message} />

          <div>
            <FieldLabel>Nom de l’équipe</FieldLabel>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex : Guardian's Family"
            />
          </div>

          <div>
            <FieldLabel>Manager</FieldLabel>
            <Input
              value={manager}
              onChange={(event) => setManager(event.target.value)}
              placeholder="Ex : Mika, Yanis, Rayan..."
            />
          </div>

          <div>
            <FieldLabel>Compétition</FieldLabel>
            <Select
              value={competitionId}
              onChange={(event) => setCompetitionId(event.target.value)}
            >
              <option value="">Aucune compétition</option>

              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}
                  {competition.season ? ` · ${competition.season}` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap gap-3">
            <SubmitButton disabled={loading}>
              {loading
                ? "Enregistrement..."
                : editingTeamId
                  ? "Modifier l’équipe"
                  : "Ajouter l’équipe"}
            </SubmitButton>

            {editingTeamId && (
              <button
                type="button"
                onClick={resetForm}
                className="mt-6 rounded-xl border border-[#D9A441]/30 bg-[#0B0610] px-6 py-3 font-semibold text-[#F2D27A] transition hover:bg-[#1E1016]"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </FormCard>

      <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
        <h2 className="text-2xl font-black text-[#F7E9C5]">
          Équipes existantes
        </h2>

        <p className="mt-2 text-[#D8C7A0]">
          Sélectionne une équipe pour la modifier ou la supprimer.
        </p>

        <div className="mt-6 space-y-3">
          {teamsList.length === 0 && (
            <p className="rounded-xl border border-[#D9A441]/20 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
              Aucune équipe créée pour le moment.
            </p>
          )}

          {teamsList.map((team) => (
            <div
              key={team.id}
              className={`rounded-xl border p-4 transition ${
                editingTeamId === team.id
                  ? "border-[#D9A441]/60 bg-[#A61E22]/20"
                  : "border-[#D9A441]/15 bg-[#0B0610]/70"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black text-[#F7E9C5]">{team.name}</h3>

                  <p className="mt-1 text-sm text-[#D8C7A0]">
                    Manager : {team.manager || "À définir"}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => selectTeam(team)}
                    className="rounded-lg border border-[#D9A441]/30 bg-[#160A12] px-3 py-2 text-xs font-semibold text-[#F2D27A] transition hover:bg-[#1E1016]"
                  >
                    Modifier
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTeam(team)}
                    className="rounded-lg bg-[#A61E22]/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#8E171C]"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- ÉQUIPES EA FC ----------------------------- */

function EaTeamsForm({
  eaTeams,
  onEaTeamsChanged,
}: {
  eaTeams: EaTeam[];
  onEaTeamsChanged: () => Promise<void>;
}) {
  const [editingEaTeamId, setEditingEaTeamId] = useState("");
  const [country, setCountry] = useState("");
  const [league, setLeague] = useState("");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setEditingEaTeamId("");
    setCountry("");
    setLeague("");
    setName("");
    setMessage("");
  }

  function selectEaTeam(team: EaTeam) {
    setEditingEaTeamId(team.id);
    setCountry(team.country);
    setLeague(team.league);
    setName(team.name);
    setMessage(`Modification de : ${team.name}`);
  }

  async function handleSaveEaTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!country || !league || !name) {
      setMessage("Merci de remplir le pays, le championnat et l’équipe.");
      return;
    }

    setLoading(true);
    setMessage("");

    if (editingEaTeamId) {
      const { error } = await supabase
        .from("ea_teams")
        .update({
          country,
          league,
          name,
        })
        .eq("id", editingEaTeamId);

      setLoading(false);

      if (error) {
        setMessage(`Erreur modification : ${error.message}`);
        return;
      }

      resetForm();
      setMessage("Équipe EA FC modifiée avec succès ✅");
      await onEaTeamsChanged();
      return;
    }

    const { error } = await supabase.from("ea_teams").insert({
      country,
      league,
      name,
    });

    setLoading(false);

    if (error) {
      setMessage(`Erreur création : ${error.message}`);
      return;
    }

    resetForm();
    setMessage("Équipe EA FC ajoutée avec succès ✅");
    await onEaTeamsChanged();
  }

  async function handleDeleteEaTeam(team: EaTeam) {
    const confirmDelete = window.confirm(
      `Supprimer "${team.name}" de la liste EA FC ?`
    );

    if (!confirmDelete) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("ea_teams")
      .delete()
      .eq("id", team.id);

    setLoading(false);

    if (error) {
      setMessage(`Erreur suppression : ${error.message}`);
      return;
    }

    if (editingEaTeamId === team.id) {
      resetForm();
    }

    setMessage("Équipe EA FC supprimée avec succès ✅");
    await onEaTeamsChanged();
  }

  const filteredTeams = eaTeams.filter((team) => {
    const value = `${team.country} ${team.league} ${team.name}`.toLowerCase();
    return value.includes(search.toLowerCase());
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1.2fr]">
      <FormCard
        title={
          editingEaTeamId
            ? "Modifier une équipe EA FC"
            : "Ajouter une équipe EA FC"
        }
        description="Gère la liste Pays → Championnat → Équipe utilisée pour les inscriptions joueurs."
      >
        <form onSubmit={handleSaveEaTeam} className="grid gap-5">
          <MessageBox message={message} />

          <div>
            <FieldLabel>Pays</FieldLabel>
            <Input
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="Ex : Angleterre"
            />
          </div>

          <div>
            <FieldLabel>Championnat</FieldLabel>
            <Input
              value={league}
              onChange={(event) => setLeague(event.target.value)}
              placeholder="Ex : Premier League"
            />
          </div>

          <div>
            <FieldLabel>Équipe</FieldLabel>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex : Arsenal"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <SubmitButton disabled={loading}>
              {loading
                ? "Enregistrement..."
                : editingEaTeamId
                  ? "Modifier l’équipe EA FC"
                  : "Ajouter l’équipe EA FC"}
            </SubmitButton>

            {editingEaTeamId && (
              <button
                type="button"
                onClick={resetForm}
                className="mt-6 rounded-xl border border-[#D9A441]/30 bg-[#0B0610] px-6 py-3 font-semibold text-[#F2D27A] transition hover:bg-[#1E1016]"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </FormCard>

      <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
        <h2 className="text-2xl font-black text-[#F7E9C5]">
          Liste équipes EA FC
        </h2>

        <p className="mt-2 text-[#D8C7A0]">
          Recherche, modifie ou supprime une équipe de la liste.
        </p>

        <div className="mt-5">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher pays, championnat ou équipe..."
          />
        </div>

        <div className="mt-6 max-h-[560px] space-y-3 overflow-y-auto pr-2">
          {filteredTeams.length === 0 && (
            <p className="rounded-xl border border-[#D9A441]/20 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
              Aucune équipe EA FC trouvée.
            </p>
          )}

          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className={`rounded-xl border p-4 transition ${
                editingEaTeamId === team.id
                  ? "border-[#D9A441]/60 bg-[#A61E22]/20"
                  : "border-[#D9A441]/15 bg-[#0B0610]/70"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black text-[#F7E9C5]">{team.name}</h3>

                  <p className="mt-1 text-sm text-[#D8C7A0]">
                    {team.country} · {team.league}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => selectEaTeam(team)}
                    className="rounded-lg border border-[#D9A441]/30 bg-[#160A12] px-3 py-2 text-xs font-semibold text-[#F2D27A] transition hover:bg-[#1E1016]"
                  >
                    Modifier
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteEaTeam(team)}
                    className="rounded-lg bg-[#A61E22]/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#8E171C]"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- MATCHS -------------------------------- */

function MatchForm({
  competitions,
  teams,
  onMatchCreated,
}: {
  competitions: Competition[];
  teams: Team[];
  onMatchCreated: () => Promise<void>;
}) {
  const [competitionId, setCompetitionId] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreateMatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!competitionId || !homeTeamId || !awayTeamId) {
      setMessage("Merci de choisir une compétition et deux équipes.");
      return;
    }

    if (homeTeamId === awayTeamId) {
      setMessage("Une équipe ne peut pas jouer contre elle-même.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("matches").insert({
      competition_id: competitionId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      match_date: matchDate || null,
      status: "scheduled",
    });

    setLoading(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setCompetitionId("");
    setHomeTeamId("");
    setAwayTeamId("");
    setMatchDate("");
    setMessage("Match créé avec succès ✅");

    await onMatchCreated();
  }

  return (
    <FormCard
      title="Créer un match"
      description="Programme une rencontre entre deux équipes."
    >
      <form onSubmit={handleCreateMatch} className="grid gap-5">
        <MessageBox message={message} />

        <div>
          <FieldLabel>Compétition</FieldLabel>
          <Select
            value={competitionId}
            onChange={(event) => setCompetitionId(event.target.value)}
          >
            <option value="">Choisir une compétition</option>

            {competitions.map((competition) => (
              <option key={competition.id} value={competition.id}>
                {competition.name}
                {competition.season ? ` · ${competition.season}` : ""}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Équipe domicile</FieldLabel>
            <Select
              value={homeTeamId}
              onChange={(event) => setHomeTeamId(event.target.value)}
            >
              <option value="">Choisir une équipe</option>

              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <FieldLabel>Équipe extérieur</FieldLabel>
            <Select
              value={awayTeamId}
              onChange={(event) => setAwayTeamId(event.target.value)}
            >
              <option value="">Choisir une équipe</option>

              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <FieldLabel>Date du match</FieldLabel>
          <Input
            type="datetime-local"
            value={matchDate}
            onChange={(event) => setMatchDate(event.target.value)}
          />
        </div>

        <SubmitButton disabled={loading}>
          {loading ? "Création en cours..." : "Créer le match"}
        </SubmitButton>
      </form>
    </FormCard>
  );
}

/* -------------------------------- SCORES -------------------------------- */

function ScoreForm({
  matches,
  getTeamName,
  onScoreAdded,
}: {
  matches: Match[];
  getTeamName: (teamId: string) => string;
  onScoreAdded: () => Promise<void>;
}) {
  const [matchId, setMatchId] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [mvp, setMvp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAddScore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!matchId) {
      setMessage("Merci de choisir un match.");
      return;
    }

    if (homeScore === "" || awayScore === "") {
      setMessage("Merci de renseigner les deux scores.");
      return;
    }

    const homeScoreNumber = Number(homeScore);
    const awayScoreNumber = Number(awayScore);

    if (homeScoreNumber < 0 || awayScoreNumber < 0) {
      setMessage("Les scores ne peuvent pas être négatifs.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("matches")
      .update({
        home_score: homeScoreNumber,
        away_score: awayScoreNumber,
        mvp: mvp || null,
        status: "completed",
      })
      .eq("id", matchId);

    setLoading(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setMatchId("");
    setHomeScore("");
    setAwayScore("");
    setMvp("");
    setMessage("Score ajouté avec succès ✅");

    await onScoreAdded();
  }

  const pendingMatches = matches.filter((match) => match.status !== "completed");

  return (
    <FormCard
      title="Ajouter un score"
      description="Saisis le résultat d’un match terminé."
    >
      <form onSubmit={handleAddScore} className="grid gap-5">
        <MessageBox message={message} />

        <div>
          <FieldLabel>Match</FieldLabel>
          <Select
            value={matchId}
            onChange={(event) => setMatchId(event.target.value)}
          >
            <option value="">Choisir un match</option>

            {pendingMatches.map((match) => (
              <option key={match.id} value={match.id}>
                {getTeamName(match.home_team_id)} vs{" "}
                {getTeamName(match.away_team_id)}
              </option>
            ))}
          </Select>

          {pendingMatches.length === 0 && (
            <p className="mt-2 text-sm text-[#D8C7A0]">
              Aucun match en attente de score.
            </p>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Score domicile</FieldLabel>
            <Input
              type="number"
              min="0"
              value={homeScore}
              onChange={(event) => setHomeScore(event.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <FieldLabel>Score extérieur</FieldLabel>
            <Input
              type="number"
              min="0"
              value={awayScore}
              onChange={(event) => setAwayScore(event.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Homme du match</FieldLabel>
          <Input
            value={mvp}
            onChange={(event) => setMvp(event.target.value)}
            placeholder="Ex : joueur MVP"
          />
        </div>

        <SubmitButton disabled={loading}>
          {loading ? "Validation en cours..." : "Valider le score"}
        </SubmitButton>
      </form>
    </FormCard>
  );
}