"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  username: string | null;
  role: "member" | "admin";
};

type Player = {
  id: string;
  user_id: string | null;
  name: string;
  ea_name: string | null;
  platform: string | null;
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

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
  ea_team_id: string | null;
  ea_team_name: string;
};

export default function CompetitionInscriptionPage() {
  const params = useParams<{ id: string }>();
  const competitionId = params.id;

  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [eaTeams, setEaTeams] = useState<EaTeam[]>([]);
  const [registration, setRegistration] = useState<CompetitionPlayer | null>(
    null
  );

  const [playerName, setPlayerName] = useState("");
  const [eaName, setEaName] = useState("");
  const [platform, setPlatform] = useState("");

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedEaTeamId, setSelectedEaTeamId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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

    if (profileResult.error || !profileResult.data) {
      setMessage("Profil introuvable. Reconnecte-toi ou contacte un admin.");
      setLoading(false);
      return;
    }

    const competitionResult = await supabase
      .from("competitions")
      .select("*")
      .eq("id", competitionId)
      .maybeSingle();

    if (competitionResult.error) {
      setMessage(`Erreur compétition : ${competitionResult.error.message}`);
      setLoading(false);
      return;
    }

    if (!competitionResult.data) {
      setMessage("Compétition introuvable.");
      setLoading(false);
      return;
    }

    const playerResult = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (playerResult.error) {
      setMessage(`Erreur joueur : ${playerResult.error.message}`);
      setLoading(false);
      return;
    }

    const eaTeamsResult = await supabase
      .from("ea_teams")
      .select("*")
      .order("country", { ascending: true })
      .order("league", { ascending: true })
      .order("name", { ascending: true });

    if (eaTeamsResult.error) {
      setMessage(`Erreur équipes EA FC : ${eaTeamsResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedProfile = profileResult.data as Profile;
    const loadedCompetition = competitionResult.data as Competition;
    const loadedPlayer = playerResult.data as Player | null;
    const loadedEaTeams = (eaTeamsResult.data ?? []) as EaTeam[];

    let loadedRegistration: CompetitionPlayer | null = null;

    if (loadedPlayer) {
      const registrationResult = await supabase
        .from("competition_players")
        .select("*")
        .eq("competition_id", competitionId)
        .eq("player_id", loadedPlayer.id)
        .maybeSingle();

      if (registrationResult.error) {
        setMessage(`Erreur inscription : ${registrationResult.error.message}`);
        setLoading(false);
        return;
      }

      loadedRegistration =
        (registrationResult.data as CompetitionPlayer | null) ?? null;
    }

    setProfile(loadedProfile);
    setCompetition(loadedCompetition);
    setPlayer(loadedPlayer);
    setEaTeams(loadedEaTeams);
    setRegistration(loadedRegistration);

    setPlayerName(loadedPlayer?.name || loadedProfile.username || "");
    setEaName(loadedPlayer?.ea_name || "");
    setPlatform(loadedPlayer?.platform || "");

    if (loadedRegistration?.ea_team_id) {
      const registeredTeam = loadedEaTeams.find(
        (team) => team.id === loadedRegistration.ea_team_id
      );

      setSelectedEaTeamId(loadedRegistration.ea_team_id);
      setSelectedCountry(registeredTeam?.country || "");
      setSelectedLeague(registeredTeam?.league || "");
    } else {
      setSelectedEaTeamId("");
      setSelectedCountry("");
      setSelectedLeague("");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [competitionId]);

  const countries = useMemo(() => {
    return Array.from(new Set(eaTeams.map((team) => team.country))).sort();
  }, [eaTeams]);

  const leagues = useMemo(() => {
    if (!selectedCountry) return [];

    return Array.from(
      new Set(
        eaTeams
          .filter((team) => team.country === selectedCountry)
          .map((team) => team.league)
      )
    ).sort();
  }, [eaTeams, selectedCountry]);

  const filteredEaTeams = useMemo(() => {
    return eaTeams.filter((team) => {
      const countryMatch = selectedCountry
        ? team.country === selectedCountry
        : true;

      const leagueMatch = selectedLeague
        ? team.league === selectedLeague
        : true;

      return countryMatch && leagueMatch;
    });
  }, [eaTeams, selectedCountry, selectedLeague]);

  const selectedEaTeam = useMemo(() => {
    if (!selectedEaTeamId) return null;

    return eaTeams.find((team) => team.id === selectedEaTeamId) ?? null;
  }, [eaTeams, selectedEaTeamId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      setMessage(
        "Cette page est prévue pour les compétitions avec inscription joueur."
      );
      return;
    }

    if (!playerName.trim()) {
      setMessage("Merci de renseigner ton nom joueur.");
      return;
    }

    if (!selectedCountry) {
      setMessage("Merci de choisir un pays.");
      return;
    }

    if (!selectedLeague) {
      setMessage("Merci de choisir un championnat.");
      return;
    }

    if (!selectedEaTeam) {
      setMessage("Merci de choisir ton équipe EA FC.");
      return;
    }

    setSaving(true);
    setMessage("");

    const cleanPlayerName = playerName.trim();
    const cleanEaName = eaName.trim() || null;
    const cleanPlatform = platform || null;

    let currentPlayer = player;

    if (currentPlayer) {
      const updatePlayerResult = await supabase
        .from("players")
        .update({
          name: cleanPlayerName,
          ea_name: cleanEaName,
          platform: cleanPlatform,
        })
        .eq("id", currentPlayer.id)
        .select("*")
        .single();

      if (updatePlayerResult.error) {
        setSaving(false);
        setMessage(
          `Erreur mise à jour joueur : ${updatePlayerResult.error.message}`
        );
        return;
      }

      currentPlayer = updatePlayerResult.data as Player;
      setPlayer(currentPlayer);
    } else {
      const insertPlayerResult = await supabase
        .from("players")
        .insert({
          user_id: profile.id,
          name: cleanPlayerName,
          ea_name: cleanEaName,
          platform: cleanPlatform,
        })
        .select("*")
        .single();

      if (insertPlayerResult.error) {
        setSaving(false);
        setMessage(
          `Erreur création joueur : ${insertPlayerResult.error.message}`
        );
        return;
      }

      currentPlayer = insertPlayerResult.data as Player;
      setPlayer(currentPlayer);
    }

    if (!currentPlayer) {
      setSaving(false);
      setMessage("Impossible de récupérer la fiche joueur.");
      return;
    }

    if (registration) {
      const updateRegistrationResult = await supabase
        .from("competition_players")
        .update({
          ea_team_id: selectedEaTeam.id,
          ea_team_name: selectedEaTeam.name,
        })
        .eq("id", registration.id)
        .select("*")
        .single();

      if (updateRegistrationResult.error) {
        setSaving(false);
        setMessage(
          `Erreur modification inscription : ${updateRegistrationResult.error.message}`
        );
        return;
      }

      setRegistration(updateRegistrationResult.data as CompetitionPlayer);
    } else {
      const existingRegistrationResult = await supabase
        .from("competition_players")
        .select("*")
        .eq("competition_id", competition.id)
        .eq("player_id", currentPlayer.id)
        .maybeSingle();

      if (existingRegistrationResult.error) {
        setSaving(false);
        setMessage(
          `Erreur vérification inscription : ${existingRegistrationResult.error.message}`
        );
        return;
      }

      if (existingRegistrationResult.data) {
        const updateExistingResult = await supabase
          .from("competition_players")
          .update({
            ea_team_id: selectedEaTeam.id,
            ea_team_name: selectedEaTeam.name,
          })
          .eq("id", existingRegistrationResult.data.id)
          .select("*")
          .single();

        if (updateExistingResult.error) {
          setSaving(false);
          setMessage(
            `Erreur modification inscription : ${updateExistingResult.error.message}`
          );
          return;
        }

        setRegistration(updateExistingResult.data as CompetitionPlayer);
      } else {
        const insertRegistrationResult = await supabase
          .from("competition_players")
          .insert({
            competition_id: competition.id,
            player_id: currentPlayer.id,
            ea_team_id: selectedEaTeam.id,
            ea_team_name: selectedEaTeam.name,
          })
          .select("*")
          .single();

        if (insertRegistrationResult.error) {
          setSaving(false);
          setMessage(
            `Erreur inscription compétition : ${insertRegistrationResult.error.message}`
          );
          return;
        }

        setRegistration(insertRegistrationResult.data as CompetitionPlayer);
      }
    }

    const generateMatchesResult = await fetch(
      `/api/competitions/${competition.id}/generate-matches`,
      {
        method: "POST",
      }
    );

    const generateMatchesData = await generateMatchesResult.json();

    if (!generateMatchesResult.ok) {
      setSaving(false);
      setMessage(
        `Inscription enregistrée, mais erreur génération matchs : ${
          generateMatchesData.error || "Erreur inconnue"
        }`
      );
      return;
    }

    setSaving(false);
    setMessage(
      generateMatchesData.created > 0
        ? `Inscription enregistrée ✅ ${generateMatchesData.created} match(s) créé(s).`
        : "Inscription enregistrée ✅ Les matchs étaient déjà à jour."
    );

    await loadData();
  }

  function getCompetitionTypeLabel(type: string) {
    if (type === "league") return "Championnat";
    if (type === "cup") return "Coupe";
    if (type === "tournament") return "Tournoi";

    return type;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
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
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <h1 className="text-3xl font-black">Compétition introuvable</h1>

            {message && <p className="mt-3 text-[#D8C7A0]">{message}</p>}

            <Link
              href="/competitions"
              className="mt-6 inline-flex rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
            >
              Retour aux compétitions
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const competitionLabel = competition.season
    ? `${competition.name} · ${competition.season}`
    : competition.name;

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10">
          <Link
            href="/competitions"
            className="mb-6 inline-flex rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
          >
            ← Retour aux compétitions
          </Link>

          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Inscription compétition
          </p>

          <h1 className="text-4xl font-black md:text-5xl">
            {competitionLabel}
          </h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Choisis ton pays, ton championnat puis ton équipe EA FC. Les matchs
            de la compétition seront générés automatiquement.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-[#D9A441]/30 bg-[#160A12] p-4 text-sm text-[#F2D27A]">
              {message}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/competitions/${competition.id}/matchs`}
              className="rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
            >
              Matchs
            </Link>

            <Link
              href={`/competitions/${competition.id}/classement`}
              className="rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
            >
              Classement
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
            <h2 className="text-2xl font-black text-[#F7E9C5]">
              Mon inscription
            </h2>

            <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Nom joueur
                </label>

                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                  placeholder="Ex : CeceII27II"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Pseudo EA FC
                </label>

                <input
                  value={eaName}
                  onChange={(event) => setEaName(event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                  placeholder="Ex : Cece_GSF"
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
                  Pays
                </label>

                <select
                  value={selectedCountry}
                  onChange={(event) => {
                    setSelectedCountry(event.target.value);
                    setSelectedLeague("");
                    setSelectedEaTeamId("");
                  }}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                >
                  <option value="">Choisir un pays</option>

                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Championnat
                </label>

                <select
                  value={selectedLeague}
                  disabled={!selectedCountry}
                  onChange={(event) => {
                    setSelectedLeague(event.target.value);
                    setSelectedEaTeamId("");
                  }}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {selectedCountry
                      ? "Choisir un championnat"
                      : "Choisis d’abord un pays"}
                  </option>

                  {leagues.map((league) => (
                    <option key={league} value={league}>
                      {league}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Équipe
                </label>

                <select
                  value={selectedEaTeamId}
                  disabled={!selectedCountry || !selectedLeague}
                  onChange={(event) => setSelectedEaTeamId(event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {selectedCountry && selectedLeague
                      ? "Choisir une équipe"
                      : "Choisis d’abord un pays et un championnat"}
                  </option>

                  {filteredEaTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={saving || competition.participant_type !== "players"}
                className="rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Enregistrement..."
                  : registration
                    ? "Modifier mon inscription"
                    : "Valider mon inscription"}
              </button>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <h2 className="text-2xl font-black text-[#F7E9C5]">
                Détails compétition
              </h2>

              <div className="mt-5 space-y-3 text-sm text-[#D8C7A0]">
                <p>
                  Nom :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {competition.name}
                  </span>
                </p>

                <p>
                  Type :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {getCompetitionTypeLabel(competition.type)}
                  </span>
                </p>

                <p>
                  Saison :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {competition.season || "Non définie"}
                  </span>
                </p>

                <p>
                  Statut :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {competition.status}
                  </span>
                </p>

                <p>
                  Format :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {competition.participant_type === "players"
                      ? "Joueurs"
                      : "Équipes"}
                  </span>
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <h2 className="text-2xl font-black text-[#F7E9C5]">
                Ton choix
              </h2>

              <div className="mt-5 space-y-3 text-sm text-[#D8C7A0]">
                <p>
                  Joueur :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {playerName || "Non défini"}
                  </span>
                </p>

                <p>
                  Pseudo EA :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {eaName || "Non défini"}
                  </span>
                </p>

                <p>
                  Plateforme :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {platform || "Non définie"}
                  </span>
                </p>

                <p>
                  Pays :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {selectedCountry || "Non choisi"}
                  </span>
                </p>

                <p>
                  Championnat :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {selectedLeague || "Non choisi"}
                  </span>
                </p>

                <p>
                  Équipe EA FC :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {selectedEaTeam ? selectedEaTeam.name : "Non choisie"}
                  </span>
                </p>

                <p>
                  Inscription :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {registration ? "Déjà enregistrée" : "Non enregistrée"}
                  </span>
                </p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}