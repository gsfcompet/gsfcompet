"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

export default function CompetitionInscriptionPage() {
  const params = useParams();
  const competitionId = typeof params.id === "string" ? params.id : "";
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [eaTeams, setEaTeams] = useState<EaTeam[]>([]);
  const [registrations, setRegistrations] = useState<CompetitionPlayer[]>([]);

  const [playerName, setPlayerName] = useState("");
  const [eaName, setEaName] = useState("");
  const [platform, setPlatform] = useState("");
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
    if (!competitionId) return;

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

    const competitionResult = await supabase
      .from("competitions")
      .select("*")
      .eq("id", competitionId)
      .single();

    const playerResult = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const eaTeamsResult = await supabase
      .from("ea_teams")
      .select("*")
      .order("country", { ascending: true })
      .order("league", { ascending: true })
      .order("name", { ascending: true });

    const registrationsResult = await supabase
      .from("competition_players")
      .select("*")
      .eq("competition_id", competitionId);

    if (profileResult.error || !profileResult.data) {
      setMessage("Profil introuvable. Reconnecte-toi ou contacte un admin.");
      setLoading(false);
      return;
    }

    if (competitionResult.error || !competitionResult.data) {
      setMessage("Compétition introuvable.");
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
    const loadedCompetition = competitionResult.data as Competition;
    const loadedPlayer = playerResult.data as Player | null;
    const loadedEaTeams = eaTeamsResult.data ?? [];
    const loadedRegistrations = registrationsResult.data ?? [];

    setProfile(loadedProfile);
    setCompetition(loadedCompetition);
    setPlayer(loadedPlayer);
    setEaTeams(loadedEaTeams);
    setRegistrations(loadedRegistrations);

    if (loadedPlayer) {
      setPlayerName(loadedPlayer.name);
      setEaName(loadedPlayer.ea_name ?? "");
      setPlatform(loadedPlayer.platform ?? "");

      const existingRegistration = loadedRegistrations.find(
        (registration) => registration.player_id === loadedPlayer.id
      );

      if (existingRegistration?.ea_team_id) {
        setEaTeamId(existingRegistration.ea_team_id);

        const selectedTeam = loadedEaTeams.find(
          (team) => team.id === existingRegistration.ea_team_id
        );

        if (selectedTeam) {
          setCountry(selectedTeam.country);
          setLeague(selectedTeam.league);
        }
      }
    } else {
      setPlayerName(loadedProfile.username || "");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [competitionId]);

  function getCompetitionLabel() {
    if (!competition) return "Compétition";

    return competition.season
      ? `${competition.name} · ${competition.season}`
      : competition.name;
  }

  function getCurrentRegistration() {
    if (!player) return null;

    return registrations.find(
      (registration) => registration.player_id === player.id
    );
  }

  function isEaTeamAlreadyTaken() {
    if (!eaTeamId) return false;

    return registrations.some(
      (registration) =>
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

    if (!competition) {
      setMessage("Compétition introuvable.");
      return;
    }

    if (competition.participant_type !== "players") {
      setMessage("Cette compétition n’accepte pas les inscriptions joueurs.");
      return;
    }

    if (!playerName || !platform || !eaTeamId) {
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
      (registration) => registration.player_id === currentPlayer?.id
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
      competition_id: competition.id,
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
            <p className="text-[#D8C7A0]">Chargement de l’inscription...</p>
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
              Inscription compétition
            </p>

            <h1 className="text-3xl font-black">Connexion requise</h1>

            <p className="mt-3 text-[#D8C7A0]">
              Connecte-toi pour t’inscrire à cette compétition.
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

  if (!competition) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-2xl border border-red-400/30 bg-[#160A12]/90 p-6 text-red-300">
            {message || "Compétition introuvable."}
          </div>
        </section>
      </main>
    );
  }

  if (competition.participant_type !== "players") {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
            <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#0B0610] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
              {getCompetitionLabel()}
            </p>

            <h1 className="text-3xl font-black">Inscription indisponible</h1>

            <p className="mt-3 text-[#D8C7A0]">
              Cette compétition est au format teams / clubs. L’inscription
              joueur EA FC n’est pas disponible pour ce format.
            </p>

            <Link
              href="/competitions"
              className="mt-6 inline-flex rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white transition hover:bg-[#8E171C]"
            >
              Retour aux compétitions
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const currentRegistration = getCurrentRegistration();

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Inscription compétition
          </p>

          <h1 className="text-4xl font-black md:text-5xl">
            {getCompetitionLabel()}
          </h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Inscris-toi à cette compétition joueurs EA FC et choisis ton équipe.
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
              {currentRegistration
                ? "Modifier mon inscription"
                : "Valider mon inscription"}
            </h2>

            <p className="mt-2 text-[#D8C7A0]">
              Choisis ton pseudo, ta plateforme et ton équipe EA FC.
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

                    {filteredEaTeams.map((team) => {
                      const taken = registrations.some(
                        (registration) =>
                          registration.ea_team_id === team.id &&
                          registration.player_id !== player?.id
                      );

                      return (
                        <option key={team.id} value={team.id} disabled={taken}>
                          {team.name}
                          {taken ? " · déjà prise" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-4 rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Enregistrement..."
                  : currentRegistration
                    ? "Modifier mon inscription"
                    : "Valider mon inscription"}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
            <h2 className="text-2xl font-black text-[#F7E9C5]">
              Mon inscription
            </h2>

            {currentRegistration ? (
              <div className="mt-6 rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
                <p className="text-sm text-[#8F7B5C]">Équipe EA FC choisie</p>

                <h3 className="mt-1 text-2xl font-black text-[#F2D27A]">
                  {currentRegistration.ea_team_name}
                </h3>

                <p className="mt-3 text-sm text-[#D8C7A0]">
                  Tu peux modifier ton équipe tant que l’admin n’a pas
                  verrouillé la compétition.
                </p>
              </div>
            ) : (
              <p className="mt-6 rounded-xl border border-[#D9A441]/20 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
                Tu n’es pas encore inscrit à cette compétition.
              </p>
            )}

            <Link
              href="/competitions"
              className="mt-6 inline-flex rounded-xl border border-[#D9A441]/30 px-6 py-3 font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
            >
              Retour aux compétitions
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}