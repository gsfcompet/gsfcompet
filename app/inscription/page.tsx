"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  username: string | null;
  role: "member" | "admin";
};

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: "teams" | "players";
};

type EaTeam = {
  id: string;
  country: string;
  league: string;
  name: string;
};

type Player = {
  id: string;
  user_id: string | null;
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

export default function InscriptionPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [eaTeams, setEaTeams] = useState<EaTeam[]>([]);
  const [registrations, setRegistrations] = useState<CompetitionPlayer[]>([]);

  const [playerName, setPlayerName] = useState("");
  const [eaName, setEaName] = useState("");
  const [platform, setPlatform] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [country, setCountry] = useState("");
  const [league, setLeague] = useState("");
  const [eaTeamId, setEaTeamId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const countries = Array.from(
    new Set(eaTeams.map((team) => team.country))
  ).sort();

  const leagues = Array.from(
    new Set(
      eaTeams
        .filter((team) => team.country === country)
        .map((team) => team.league)
    )
  ).sort();

  const filteredEaTeams = eaTeams
    .filter((team) => team.country === country && team.league === league)
    .sort((a, b) => a.name.localeCompare(b.name));

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const profileResult = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileResult.error || !profileResult.data) {
      setMessage("Profil introuvable. Reconnecte-toi ou contacte un admin.");
      setLoading(false);
      return;
    }

    const playerResult = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const competitionsResult = await supabase
      .from("competitions")
      .select("*")
      .eq("participant_type", "players")
      .order("created_at", { ascending: false });

    const eaTeamsResult = await supabase
      .from("ea_teams")
      .select("*")
      .order("country", { ascending: true })
      .order("league", { ascending: true })
      .order("name", { ascending: true });

    const registrationsResult = await supabase
      .from("competition_players")
      .select("*");

    if (competitionsResult.error) {
      setMessage(`Erreur compétitions : ${competitionsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (eaTeamsResult.error) {
      setMessage(`Erreur équipes EA FC : ${eaTeamsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (registrationsResult.error) {
      setMessage(`Erreur inscriptions : ${registrationsResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedProfile = profileResult.data as Profile;
    const loadedPlayer = playerResult.data as Player | null;

    setProfile(loadedProfile);
    setPlayer(loadedPlayer);
    setCompetitions(competitionsResult.data ?? []);
    setEaTeams(eaTeamsResult.data ?? []);
    setRegistrations(registrationsResult.data ?? []);

    if (loadedPlayer) {
      setPlayerName(loadedPlayer.name);
      setEaName(loadedPlayer.ea_name ?? "");
      setPlatform(loadedPlayer.platform ?? "");
    } else {
      setPlayerName(loadedProfile.username || "");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function getCompetitionLabel(competition: Competition) {
    return competition.season
      ? `${competition.name} · ${competition.season}`
      : competition.name;
  }

  function getRegistrationForCompetition(id: string) {
    if (!player) return null;

    return registrations.find(
      (registration) =>
        registration.player_id === player.id && registration.competition_id === id
    );
  }

  function isEaTeamAlreadyTaken() {
    if (!competitionId || !eaTeamId) return false;

    return registrations.some(
      (registration) =>
        registration.competition_id === competitionId &&
        registration.ea_team_id === eaTeamId &&
        registration.player_id !== player?.id
    );
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      setMessage("Tu dois être connecté pour t’inscrire.");
      return;
    }

    if (!playerName || !competitionId || !platform || !eaTeamId) {
      setMessage("Merci de remplir tous les champs obligatoires.");
      return;
    }

    const selectedEaTeam = eaTeams.find((team) => team.id === eaTeamId);

    if (!selectedEaTeam) {
      setMessage("Équipe EA FC introuvable.");
      return;
    }

    if (isEaTeamAlreadyTaken()) {
      setMessage("Cette équipe EA FC est déjà prise dans cette compétition.");
      return;
    }

    setSaving(true);
    setMessage("");

    let currentPlayer = player;

    if (currentPlayer) {
      const { data, error } = await supabase
        .from("players")
        .update({
          name: playerName,
          ea_name: eaName || null,
          platform,
        })
        .eq("id", currentPlayer.id)
        .select()
        .single();

      if (error) {
        setSaving(false);
        setMessage(`Erreur joueur : ${error.message}`);
        return;
      }

      currentPlayer = data;
      setPlayer(data);
    } else {
      const { data, error } = await supabase
        .from("players")
        .insert({
          user_id: profile.id,
          name: playerName,
          ea_name: eaName || null,
          platform,
        })
        .select()
        .single();

      if (error) {
        setSaving(false);
        setMessage(`Erreur création joueur : ${error.message}`);
        return;
      }

      currentPlayer = data;
      setPlayer(data);
    }

    const existingRegistration = registrations.find(
      (registration) =>
        registration.player_id === currentPlayer?.id &&
        registration.competition_id === competitionId
    );

    if (existingRegistration) {
      const { error } = await supabase
        .from("competition_players")
        .update({
          ea_team_id: selectedEaTeam.id,
          ea_team_name: selectedEaTeam.name,
        })
        .eq("id", existingRegistration.id);

      if (error) {
        setSaving(false);
        setMessage(`Erreur mise à jour inscription : ${error.message}`);
        return;
      }

      setSaving(false);
      setMessage("Inscription mise à jour avec succès ✅");
      await loadData();
      return;
    }

    const { error } = await supabase.from("competition_players").insert({
      competition_id: competitionId,
      player_id: currentPlayer.id,
      ea_team_id: selectedEaTeam.id,
      ea_team_name: selectedEaTeam.name,
    });

    if (error) {
      setSaving(false);

      if (error.message.toLowerCase().includes("duplicate")) {
        setMessage(
          "Inscription impossible : tu es déjà inscrit ou cette équipe est déjà prise."
        );
        return;
      }

      setMessage(`Erreur inscription : ${error.message}`);
      return;
    }

    setSaving(false);
    setMessage("Inscription validée avec succès ✅");
    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center">
            <p className="text-[#D8C7A0]">Chargement de l’espace membre...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#0B0610] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
              Espace membre
            </p>

            <h1 className="text-3xl font-black">Connexion requise</h1>

            <p className="mt-3 text-[#D8C7A0]">
              Connecte-toi pour t’inscrire à une compétition.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white transition hover:bg-[#8E171C]"
              >
                Se connecter
              </Link>

              <Link
                href="/register"
                className="rounded-xl border border-[#D9A441]/30 px-6 py-3 font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Espace membre
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Inscription</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Inscris-toi à une compétition joueurs EA FC et choisis ton équipe.
          </p>

          <div className="mt-6 rounded-xl border border-[#D9A441]/20 bg-[#160A12] p-4 text-sm text-[#D8C7A0]">
            Connecté avec{" "}
            <span className="font-semibold text-[#F2D27A]">
              {profile.username || profile.email}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
            <h2 className="text-2xl font-black text-[#F7E9C5]">
              S’inscrire à une compétition
            </h2>

            <p className="mt-2 text-[#D8C7A0]">
              Choisis ta compétition et ton équipe EA FC.
            </p>

            <form onSubmit={handleRegister} className="mt-8 grid gap-5">
              {message && (
                <div className="rounded-xl border border-[#D9A441]/30 bg-[#0B0610] px-4 py-3 text-sm text-[#F2D27A]">
                  {message}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Nom du joueur
                </label>
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                  placeholder="Ex : Greg"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Pseudo EA
                </label>
                <input
                  value={eaName}
                  onChange={(event) => setEaName(event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                  placeholder="Ex : Greg_GSF"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Plateforme
                </label>
                <select
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                >
                  <option value="">Choisir une plateforme</option>
                  <option value="PS5">PS5</option>
                  <option value="Xbox Series">Xbox Series</option>
                  <option value="PC">PC</option>
                  <option value="Switch">Switch</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Compétition
                </label>
                <select
                  value={competitionId}
                  onChange={(event) => setCompetitionId(event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                >
                  <option value="">Choisir une compétition</option>

                  {competitions.map((competition) => (
                    <option key={competition.id} value={competition.id}>
                      {getCompetitionLabel(competition)}
                    </option>
                  ))}
                </select>

                {competitions.length === 0 && (
                  <p className="mt-2 text-sm text-[#8F7B5C]">
                    Aucune compétition joueurs disponible pour le moment.
                  </p>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                    Pays
                  </label>
                  <select
                    value={country}
                    onChange={(event) => {
                      setCountry(event.target.value);
                      setLeague("");
                      setEaTeamId("");
                    }}
                    className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                  >
                    <option value="">Choisir</option>

                    {countries.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                    Championnat
                  </label>
                  <select
                    value={league}
                    onChange={(event) => {
                      setLeague(event.target.value);
                      setEaTeamId("");
                    }}
                    disabled={!country}
                    className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Choisir</option>

                    {leagues.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                    Équipe EA FC
                  </label>
                  <select
                    value={eaTeamId}
                    onChange={(event) => setEaTeamId(event.target.value)}
                    disabled={!league}
                    className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Choisir</option>

                    {filteredEaTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-4 rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Inscription..." : "Valider mon inscription"}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
            <h2 className="text-2xl font-black text-[#F7E9C5]">
              Mes inscriptions
            </h2>

            <p className="mt-2 text-[#D8C7A0]">
              Retrouve les compétitions auxquelles tu es inscrit.
            </p>

            <div className="mt-6 space-y-3">
              {!player && (
                <p className="rounded-xl border border-[#D9A441]/20 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
                  Tu n’as pas encore de fiche joueur.
                </p>
              )}

              {player &&
                registrations
                  .filter((registration) => registration.player_id === player.id)
                  .map((registration) => {
                    const competition = competitions.find(
                      (item) => item.id === registration.competition_id
                    );

                    return (
                      <div
                        key={registration.id}
                        className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4"
                      >
                        <h3 className="font-black text-[#F7E9C5]">
                          {competition
                            ? getCompetitionLabel(competition)
                            : "Compétition inconnue"}
                        </h3>

                        <p className="mt-1 text-sm text-[#D8C7A0]">
                          Équipe EA FC :{" "}
                          <span className="font-semibold text-[#F2D27A]">
                            {registration.ea_team_name}
                          </span>
                        </p>
                      </div>
                    );
                  })}

              {player &&
                registrations.filter(
                  (registration) => registration.player_id === player.id
                ).length === 0 && (
                  <p className="rounded-xl border border-[#D9A441]/20 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
                    Aucune inscription pour le moment.
                  </p>
                )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}