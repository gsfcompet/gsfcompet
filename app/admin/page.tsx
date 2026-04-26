"use client";

import { useEffect, useState } from "react";
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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("competition");
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
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

  async function refreshData() {
    setDebugMessage("");
    await loadCompetitions();
    await loadTeams();
    await loadMatches();
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
            Gérez les compétitions, équipes, matchs et scores de GSF Compet.
          </p>

          <div className="mt-6 rounded-xl border border-[#D9A441]/20 bg-[#160A12] p-4 text-sm text-[#F2D27A]">
            <p>Compétitions chargées : {competitions.length}</p>
            <p>Équipes chargées : {teams.length}</p>
            <p>Matchs chargés : {matches.length}</p>
            {debugMessage && (
              <p className="mt-2 text-red-300">{debugMessage}</p>
            )}
          </div>
        </div>

        <div className="mb-8 grid gap-3 md:grid-cols-4">
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
        </div>

        {activeTab === "competition" && (
          <CompetitionForm
            competitions={competitions}
            onCompetitionChanged={refreshData}
          />
        )}

        {activeTab === "team" && (
          <TeamForm competitions={competitions} onTeamCreated={refreshData} />
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
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setEditingCompetitionId("");
    setName("");
    setType("");
    setSeason("");
    setStatus("active");
    setMessage("");
  }

  function selectCompetition(competition: Competition) {
    setEditingCompetitionId(competition.id);
    setName(competition.name);
    setType(competition.type);
    setSeason(competition.season ?? "");
    setStatus(competition.status);
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

                  <p className="mt-1 text-xs text-[#F2D27A]">
                    {getStatusLabel(competition.status)}
                  </p>
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

function TeamForm({
  competitions,
  onTeamCreated,
}: {
  competitions: Competition[];
  onTeamCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [manager, setManager] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreateTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name) {
      setMessage("Merci de renseigner le nom de l’équipe.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data: createdTeam, error: teamError } = await supabase
      .from("teams")
      .insert({
        name,
        manager,
      })
      .select()
      .single();

    if (teamError) {
      setLoading(false);
      setMessage(`Erreur : ${teamError.message}`);
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
    setName("");
    setManager("");
    setCompetitionId("");
    setMessage("Équipe ajoutée avec succès ✅");

    await onTeamCreated();
  }

  return (
    <FormCard
      title="Ajouter une équipe"
      description="Inscris une équipe ou un membre dans la compétition."
    >
      <form onSubmit={handleCreateTeam} className="grid gap-5">
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
              </option>
            ))}
          </Select>
        </div>

        <SubmitButton disabled={loading}>
          {loading ? "Ajout en cours..." : "Ajouter l’équipe"}
        </SubmitButton>
      </form>
    </FormCard>
  );
}

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