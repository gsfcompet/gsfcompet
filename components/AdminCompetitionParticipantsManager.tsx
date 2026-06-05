"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { canManageTeams, type AppRole } from "@/lib/roles";

type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  role: AppRole;
  pays?: string | null;
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

type EaTeam = {
  id: string;
  country: string | null;
  league: string | null;
  name: string;
};

type AdminCompetitionParticipantsManagerProps = {
  competitionId: string;
  onChanged?: () => void | Promise<void>;
};

export default function AdminCompetitionParticipantsManager({
  competitionId,
  onChanged,
}: AdminCompetitionParticipantsManagerProps) {
  const supabase = createClient();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [registrations, setRegistrations] = useState<CompetitionPlayer[]>([]);
  const [eaTeams, setEaTeams] = useState<EaTeam[]>([]);

  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [eaName, setEaName] = useState("");
  const [platform, setPlatform] = useState("PC");

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedEaTeamId, setSelectedEaTeamId] = useState("");

  const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingRegistrationId, setRemovingRegistrationId] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState("");

  async function getAccessToken() {
    const sessionResult = await supabase.auth.getSession();
    return sessionResult.data.session?.access_token ?? null;
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  useEffect(() => {
    if (!selectedProfileId) {
      return;
    }

    const selectedProfile = profiles.find(
      (profile) => profile.id === selectedProfileId
    );

    const existingPlayer = players.find(
      (player) => player.user_id === selectedProfileId
    );

    const existingRegistration = existingPlayer
      ? registrations.find(
          (registration) => registration.player_id === existingPlayer.id
        )
      : null;

    const existingEaTeam = existingRegistration?.ea_team_id
      ? eaTeams.find((team) => team.id === existingRegistration.ea_team_id)
      : null;

    setPlayerName(existingPlayer?.name || selectedProfile?.username || "");
    setEaName(existingPlayer?.ea_name || selectedProfile?.username || "");
    setPlatform(existingPlayer?.platform || "PC");

    if (existingRegistration) {
      setEditingRegistrationId(existingRegistration.id);
    } else {
      setEditingRegistrationId(null);
    }

    if (existingEaTeam) {
      setSelectedCountry(existingEaTeam.country || "");
      setSelectedLeague(existingEaTeam.league || "");
      setSelectedEaTeamId(existingEaTeam.id);
    } else {
      setSelectedCountry("");
      setSelectedLeague("");
      setSelectedEaTeamId("");
    }
  }, [selectedProfileId, profiles, players, registrations, eaTeams]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [profilesResult, playersResult, registrationsResult, eaTeamsResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, username, role, pays")
          .order("username", { ascending: true, nullsFirst: false }),

        supabase
          .from("players")
          .select("*")
          .order("name", { ascending: true }),

        supabase
          .from("competition_players")
          .select("*")
          .eq("competition_id", competitionId)
          .order("created_at", { ascending: true }),

        supabase
          .from("ea_teams")
          .select("*")
          .order("country", { ascending: true })
          .order("league", { ascending: true })
          .order("name", { ascending: true }),
      ]);

    if (profilesResult.error) {
      setMessage(`Erreur profils : ${profilesResult.error.message}`);
      setLoading(false);
      return;
    }

    if (playersResult.error) {
      setMessage(`Erreur joueurs : ${playersResult.error.message}`);
      setLoading(false);
      return;
    }

    if (registrationsResult.error) {
      setMessage(`Erreur participants : ${registrationsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (eaTeamsResult.error) {
      setMessage(`Erreur équipes EA FC : ${eaTeamsResult.error.message}`);
      setLoading(false);
      return;
    }

    setProfiles((profilesResult.data ?? []) as Profile[]);
    setPlayers((playersResult.data ?? []) as Player[]);
    setRegistrations((registrationsResult.data ?? []) as CompetitionPlayer[]);
    setEaTeams((eaTeamsResult.data ?? []) as EaTeam[]);

    setLoading(false);
  }

  const registeredPlayerIds = useMemo(() => {
    return new Set(registrations.map((registration) => registration.player_id));
  }, [registrations]);

  const countries = useMemo(() => {
    return Array.from(
      new Set(eaTeams.map((team) => team.country).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }, [eaTeams]);

  const leagues = useMemo(() => {
    return Array.from(
      new Set(
        eaTeams
          .filter((team) => team.country === selectedCountry)
          .map((team) => team.league)
          .filter(Boolean) as string[]
      )
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }, [eaTeams, selectedCountry]);

  const filteredEaTeams = useMemo(() => {
    return eaTeams.filter((team) => {
      return team.country === selectedCountry && team.league === selectedLeague;
    });
  }, [eaTeams, selectedCountry, selectedLeague]);

  function getPlayerById(playerId: string) {
    return players.find((player) => player.id === playerId) ?? null;
  }

  function getPlayerByProfileId(profileId: string) {
    return players.find((player) => player.user_id === profileId) ?? null;
  }

  function getProfileById(profileId: string | null) {
    if (!profileId) return null;
    return profiles.find((profile) => profile.id === profileId) ?? null;
  }

  function getProfileLabel(profile: Profile) {
    const existingPlayer = getPlayerByProfileId(profile.id);

    const baseName =
      existingPlayer?.name ||
      existingPlayer?.ea_name ||
      profile.username ||
      profile.email ||
      "Membre sans nom";

    const alreadyRegistered =
      existingPlayer && registeredPlayerIds.has(existingPlayer.id);

    return alreadyRegistered ? `${baseName} — déjà inscrit` : baseName;
  }

  function resetForm() {
    setSelectedProfileId("");
    setPlayerName("");
    setEaName("");
    setPlatform("PC");
    setSelectedCountry("");
    setSelectedLeague("");
    setSelectedEaTeamId("");
    setEditingRegistrationId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProfileId) {
      setMessage("Merci de choisir un membre.");
      return;
    }

    if (!playerName.trim()) {
      setMessage("Merci de renseigner le nom joueur.");
      return;
    }

    if (!selectedEaTeamId) {
      setMessage("Merci de choisir une équipe EA FC.");
      return;
    }

    const selectedProfile = getProfileById(selectedProfileId);
    const selectedEaTeam = eaTeams.find((team) => team.id === selectedEaTeamId);

    if (!selectedProfile) {
      setMessage("Profil membre introuvable.");
      return;
    }

    if (!selectedEaTeam) {
      setMessage("Équipe EA FC introuvable.");
      return;
    }

    setSaving(true);
    setMessage("");

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setSaving(false);
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return;
    }

    const response = await fetch(
      `/api/admin/competitions/${competitionId}/participants`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          profile_id: selectedProfile.id,
          player_name: playerName.trim(),
          ea_name: eaName.trim() || null,
          platform: platform || null,
          ea_team_id: selectedEaTeam.id,
          registration_id: editingRegistrationId,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setSaving(false);
      setMessage(result.error || "Erreur ajout participant.");
      return;
    }

    setSaving(false);
    setMessage(result.message || "Participant enregistré ✅");
    resetForm();

    await loadData();
    await onChanged?.();
  }

  function editRegistration(registration: CompetitionPlayer) {
    const player = getPlayerById(registration.player_id);
    const profile = getProfileById(player?.user_id ?? null);
    const eaTeam = registration.ea_team_id
      ? eaTeams.find((team) => team.id === registration.ea_team_id)
      : null;

    if (!player || !profile) {
      setMessage("Impossible de modifier ce participant : fiche joueur incomplète.");
      return;
    }

    setSelectedProfileId(profile.id);
    setPlayerName(player.name || profile.username || "");
    setEaName(player.ea_name || profile.username || "");
    setPlatform(player.platform || "PC");
    setEditingRegistrationId(registration.id);

    if (eaTeam) {
      setSelectedCountry(eaTeam.country || "");
      setSelectedLeague(eaTeam.league || "");
      setSelectedEaTeamId(eaTeam.id);
    } else {
      setSelectedCountry("");
      setSelectedLeague("");
      setSelectedEaTeamId("");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeRegistration(registration: CompetitionPlayer) {
    const player = getPlayerById(registration.player_id);
    const label = player?.name || registration.ea_team_name || "ce participant";

    const confirmed = window.confirm(
      `Retirer ${label} de la compétition ? Les matchs liés à ce participant seront également supprimés.`
    );

    if (!confirmed) return;

    setRemovingRegistrationId(registration.id);
    setMessage("");

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setRemovingRegistrationId(null);
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return;
    }

    const response = await fetch(
      `/api/admin/competitions/${competitionId}/participants`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          registration_id: registration.id,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setRemovingRegistrationId(null);
      setMessage(result.error || "Erreur suppression participant.");
      return;
    }

    setRemovingRegistrationId(null);
    setMessage(result.message || "Participant retiré de la compétition ✅");

    if (editingRegistrationId === registration.id) {
      resetForm();
    }

    await loadData();
    await onChanged?.();
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#F7E9C5]">
            Gestion des participants
          </h2>

          <p className="mt-2 text-sm text-[#D8C7A0]">
            Ajoute un membre à la compétition, modifie son équipe EA FC ou retire
            un participant.
          </p>
        </div>

        <div className="rounded-xl border border-[#D9A441]/25 bg-[#0B0610]/70 px-5 py-3 text-center">
          <p className="text-2xl font-black text-[#F2D27A]">
            {registrations.length}
          </p>
          <p className="text-xs uppercase tracking-widest text-[#8F7B5C]">
            participants
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-[#D9A441]/30 bg-[#0B0610]/70 px-4 py-3 text-sm font-semibold text-[#F2D27A]">
          {message}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
          Chargement des participants...
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4"
          >
            <h3 className="text-lg font-black text-[#F7E9C5]">
              {editingRegistrationId
                ? "Modifier un participant"
                : "Ajouter un membre"}
            </h3>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Membre
                </label>

                <select
                  value={selectedProfileId}
                  onChange={(event) => setSelectedProfileId(event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                >
                  <option value="">Choisir un membre</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {getProfileLabel(profile)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                    Nom joueur
                  </label>

                  <input
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                    placeholder="Ex : Cecell27II"
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
                    placeholder="Ex : Cecell27II"
                  />
                </div>
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
                  <option value="PC">PC</option>
                  <option value="PS5">PS5</option>
                  <option value="Xbox Series">Xbox Series</option>
                  <option value="Switch">Switch</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                    Pays équipe
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
                    <option value="">Pays</option>
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
                    <option value="">Championnat</option>
                    {leagues.map((league) => (
                      <option key={league} value={league}>
                        {league}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                    Équipe EA FC
                  </label>

                  <select
                    value={selectedEaTeamId}
                    disabled={!selectedLeague}
                    onChange={(event) => setSelectedEaTeamId(event.target.value)}
                    className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Équipe</option>
                    {filteredEaTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#A61E22] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Enregistrement..."
                    : editingRegistrationId
                    ? "Modifier le participant"
                    : "Ajouter à la compétition"}
                </button>

                {editingRegistrationId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-[#D9A441]/30 px-5 py-3 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
                  >
                    Annuler modification
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
            <h3 className="text-lg font-black text-[#F7E9C5]">
              Participants inscrits
            </h3>

            {registrations.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-[#D9A441]/20 p-4 text-sm text-[#D8C7A0]">
                Aucun participant inscrit pour le moment.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {registrations.map((registration) => {
                  const player = getPlayerById(registration.player_id);
                  const profile = getProfileById(player?.user_id ?? null);
                  const isRemoving = removingRegistrationId === registration.id;

                  return (
                    <article
                      key={registration.id}
                      className="rounded-xl border border-[#D9A441]/15 bg-[#160A12]/80 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-[#F7E9C5]">
                            {player?.name || profile?.username || "Joueur inconnu"}
                          </p>

                          <div className="mt-1 space-y-1 text-sm text-[#8F7B5C]">
                            <p>
                              EA FC :{" "}
                              <span className="font-semibold text-[#F2D27A]">
                                {player?.ea_name || "Non renseigné"}
                              </span>
                            </p>

                            <p>
                              Plateforme :{" "}
                              <span className="font-semibold text-[#F2D27A]">
                                {player?.platform || "Non renseignée"}
                              </span>
                            </p>

                            <p>
                              Équipe :{" "}
                              <span className="font-semibold text-[#F2D27A]">
                                {registration.ea_team_name || "Non définie"}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editRegistration(registration)}
                            className="rounded-lg border border-[#D9A441]/30 px-3 py-2 text-xs font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
                          >
                            Modifier
                          </button>

                          <button
                            type="button"
                            disabled={isRemoving}
                            onClick={() => removeRegistration(registration)}
                            className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isRemoving ? "..." : "Retirer"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
