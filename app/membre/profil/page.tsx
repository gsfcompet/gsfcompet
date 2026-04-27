"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AvatarUploader from "@/components/AvatarUploader";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  username: string | null;
  role: "member" | "admin";
  avatar_url: string | null;
  avatar_path: string | null;
};

type Player = {
  id: string;
  user_id: string | null;
  name: string;
  ea_name: string | null;
  platform: string | null;
};

export default function MemberProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);

  const [username, setUsername] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [eaName, setEaName] = useState("");
  const [platform, setPlatform] = useState("");

  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProfile() {
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

    if (playerResult.error) {
      setMessage(`Erreur joueur : ${playerResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedProfile = profileResult.data as Profile;
    const loadedPlayer = playerResult.data as Player | null;

    setProfile(loadedProfile);
    setPlayer(loadedPlayer);

    setUsername(loadedProfile.username || "");
    setPlayerName(loadedPlayer?.name || loadedProfile.username || "");
    setEaName(loadedPlayer?.ea_name || "");
    setPlatform(loadedPlayer?.platform || "");

    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      setMessage("Tu dois être connecté.");
      return;
    }

    if (!username.trim()) {
      setMessage("Merci de renseigner ton pseudo membre.");
      return;
    }

    setSaving(true);
    setMessage("");

    const cleanUsername = username.trim();
    const cleanPlayerName = playerName.trim() || cleanUsername;
    const cleanEaName = eaName.trim() || null;
    const cleanPlatform = platform || null;

    const profileResult = await supabase
      .from("profiles")
      .update({
        username: cleanUsername,
      })
      .eq("id", profile.id);

    if (profileResult.error) {
      setSaving(false);
      setMessage(`Erreur profil : ${profileResult.error.message}`);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        username: cleanUsername,
      },
    });

    if (player) {
      const playerResult = await supabase
        .from("players")
        .update({
          name: cleanPlayerName,
          ea_name: cleanEaName,
          platform: cleanPlatform,
        })
        .eq("id", player.id);

      if (playerResult.error) {
        setSaving(false);
        setMessage(`Erreur fiche joueur : ${playerResult.error.message}`);
        return;
      }
    } else {
      const playerResult = await supabase.from("players").insert({
        user_id: profile.id,
        name: cleanPlayerName,
        ea_name: cleanEaName,
        platform: cleanPlatform,
      });

      if (playerResult.error) {
        setSaving(false);
        setMessage(`Erreur création fiche joueur : ${playerResult.error.message}`);
        return;
      }
    }

    setSaving(false);
    setMessage("Profil modifié avec succès ✅");

    await loadProfile();
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (!profile) {
      setMessage("Tu dois être connecté.");
      return;
    }

    if (deleteConfirmation !== "SUPPRIMER") {
      setMessage('Pour supprimer ton compte, écris exactement "SUPPRIMER".');
      return;
    }

    const confirmDelete = window.confirm(
      "Confirmer la suppression définitive de ton compte ? Cette action est irréversible."
    );

    if (!confirmDelete) return;

    setDeleting(true);
    setMessage("");

    const response = await fetch("/api/account/delete", {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      setDeleting(false);
      setMessage(result.error || "Erreur suppression du compte.");
      return;
    }

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="text-[#D8C7A0]">Chargement du profil...</p>
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
              Profil membre
            </p>

            <h1 className="text-3xl font-black">Connexion requise</h1>

            <p className="mt-3 text-[#D8C7A0]">
              Connecte-toi pour modifier ton profil.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white transition hover:bg-[#8E171C]"
            >
              Se connecter
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Profil membre
          </p>

          <h1 className="text-4xl font-black md:text-5xl">
            Modifier mon profil
          </h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Mets à jour tes informations membre, ta fiche joueur et ton avatar
            de carte UT.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-[#D9A441]/30 bg-[#160A12] px-4 py-3 text-sm text-[#F2D27A]">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
            <h2 className="text-2xl font-black text-[#F7E9C5]">
              Informations personnelles
            </h2>

            <form onSubmit={handleSave} className="mt-8 grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Email
                </label>

                <input
                  value={profile.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-[#D9A441]/10 bg-[#0B0610]/70 px-4 py-3 text-[#8F7B5C] outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Pseudo membre
                </label>

                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                  placeholder="Ex : CeceII27II"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Nom joueur
                </label>

                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                  placeholder="Ex : Cece"
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

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </form>
          </section>

          <div className="space-y-6">
            <AvatarUploader
              userId={profile.id}
              currentAvatarUrl={profile.avatar_url}
              currentAvatarPath={profile.avatar_path}
              onUploaded={(avatarUrl, avatarPath) => {
                setProfile({
                  ...profile,
                  avatar_url: avatarUrl,
                  avatar_path: avatarPath,
                });
              }}
            />

            <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <h2 className="text-2xl font-black text-[#F7E9C5]">Compte</h2>

              <div className="mt-5 space-y-3 text-sm text-[#D8C7A0]">
                <p>
                  Rôle :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {profile.role === "admin" ? "Admin" : "Membre"}
                  </span>
                </p>

                <p>
                  Fiche joueur :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {player ? "Créée" : "Non créée"}
                  </span>
                </p>

                <p>
                  Avatar :{" "}
                  <span className="font-semibold text-[#F2D27A]">
                    {profile.avatar_url ? "Ajouté" : "Non ajouté"}
                  </span>
                </p>
              </div>

              <Link
                href="/membre"
                className="mt-6 inline-flex rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
              >
                Retour au panel membre
              </Link>
            </section>

            <section className="rounded-2xl border border-red-400/30 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <h2 className="text-2xl font-black text-red-300">
                Supprimer mon compte
              </h2>

              <p className="mt-3 text-sm text-[#D8C7A0]">
                Cette action supprimera ton compte, ton profil membre, ta fiche
                joueur et tes inscriptions. Elle est irréversible.
              </p>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-red-300">
                  Écris SUPPRIMER pour confirmer
                </label>

                <input
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  className="w-full rounded-xl border border-red-400/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-red-400/60"
                  placeholder="SUPPRIMER"
                />
              </div>

              <button
                type="button"
                disabled={deleting || deleteConfirmation !== "SUPPRIMER"}
                onClick={handleDeleteAccount}
                className="mt-5 rounded-xl bg-red-700 px-6 py-3 font-semibold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting
                  ? "Suppression..."
                  : "Supprimer définitivement mon compte"}
              </button>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}