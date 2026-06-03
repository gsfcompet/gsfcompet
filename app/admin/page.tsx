"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  role: "member" | "admin";
};

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: "teams" | "players";
  created_at?: string;
};

type CompetitionForm = {
  name: string;
  type: string;
  season: string;
  status: string;
  participant_type: "teams" | "players";
};

const emptyForm: CompetitionForm = {
  name: "",
  type: "league",
  season: "",
  status: "active",
  participant_type: "players",
};

export default function AdminPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  const [form, setForm] = useState<CompetitionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const isAdmin = profile?.role === "admin";

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
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error || !profileResult.data) {
      setMessage("Profil introuvable.");
      setLoading(false);
      return;
    }

    const loadedProfile = profileResult.data as Profile;
    setProfile(loadedProfile);

    if (loadedProfile.role !== "admin") {
      setLoading(false);
      return;
    }

    const competitionsResult = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (competitionsResult.error) {
      setMessage(`Erreur compétitions : ${competitionsResult.error.message}`);
      setLoading(false);
      return;
    }

    setCompetitions((competitionsResult.data ?? []) as Competition[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm<K extends keyof CompetitionForm>(
    key: K,
    value: CompetitionForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function startEdit(competition: Competition) {
    setEditingId(competition.id);
    setForm({
      name: competition.name || "",
      type: competition.type || "league",
      season: competition.season || "",
      status: competition.status || "active",
      participant_type: competition.participant_type || "players",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      setMessage("Action réservée aux admins.");
      return;
    }

    if (!form.name.trim()) {
      setMessage("Merci de renseigner le nom de la compétition.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      name: form.name.trim(),
      type: form.type,
      season: form.season.trim() || null,
      status: form.status,
      participant_type: form.participant_type,
    };

    if (editingId) {
      const updateResult = await supabase
        .from("competitions")
        .update(payload)
        .eq("id", editingId);

      if (updateResult.error) {
        setSaving(false);
        setMessage(`Erreur modification : ${updateResult.error.message}`);
        return;
      }

      setMessage("Compétition modifiée ✅");
    } else {
      const insertResult = await supabase.from("competitions").insert(payload);

      if (insertResult.error) {
        setSaving(false);
        setMessage(`Erreur création : ${insertResult.error.message}`);
        return;
      }

      setMessage("Compétition créée ✅");
    }

    setSaving(false);
    setEditingId(null);
    setForm(emptyForm);

    await loadData();
  }

  async function deleteCompetition(competition: Competition) {
    if (!isAdmin) {
      setMessage("Action réservée aux admins.");
      return;
    }

    const confirmed = window.confirm(
      `Supprimer la compétition "${competition.name}" ?`
    );

    if (!confirmed) return;

    setDeletingId(competition.id);
    setMessage("");

    const deleteResult = await supabase
      .from("competitions")
      .delete()
      .eq("id", competition.id);

    if (deleteResult.error) {
      setDeletingId(null);
      setMessage(`Erreur suppression : ${deleteResult.error.message}`);
      return;
    }

    setDeletingId(null);
    setMessage("Compétition supprimée ✅");

    await loadData();
  }

  function getCompetitionTypeLabel(type: string) {
    if (type === "league") return "Championnat";
    if (type === "cup") return "Coupe";
    if (type === "tournament") return "Tournoi";

    return type;
  }

  function getParticipantTypeLabel(type: "teams" | "players") {
    if (type === "players") return "Joueurs";
    return "Équipes";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="text-[#D8C7A0]">Chargement de l’administration...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <AccessCard
        title="Connexion requise"
        text="Connecte-toi avec un compte admin pour accéder au panneau d’administration."
        linkHref="/login"
        linkText="Se connecter"
      />
    );
  }

  if (!isAdmin) {
    return (
      <AccessCard
        title="Accès refusé"
        text="Cette page est réservée aux administrateurs."
        linkHref="/"
        linkText="Retour à l’accueil"
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Administration Guardian&apos;s Family
          </p>

          <h1 className="text-4xl font-black md:text-5xl">
            Panneau admin
          </h1>

          <p className="mt-3 max-w-3xl text-[#D8C7A0]">
            Crée, modifie et gère les compétitions du site.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-[#D9A441]/30 bg-[#160A12] p-4 text-sm text-[#F2D27A]">
              {message}
            </div>
          )}
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
            <h2 className="text-2xl font-black text-[#F7E9C5]">
              {editingId ? "Modifier la compétition" : "Créer une compétition"}
            </h2>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Nom
                </label>

                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                  placeholder="Ex : GSF League"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Saison
                </label>

                <input
                  value={form.season}
                  onChange={(event) => updateForm("season", event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                  placeholder="Ex : Saison 1"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                    Type
                  </label>

                  <select
                    value={form.type}
                    onChange={(event) => updateForm("type", event.target.value)}
                    className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                  >
                    <option value="league">Championnat</option>
                    <option value="cup">Coupe</option>
                    <option value="tournament">Tournoi</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                    Format
                  </label>

                  <select
                    value={form.participant_type}
                    onChange={(event) =>
                      updateForm(
                        "participant_type",
                        event.target.value as "teams" | "players"
                      )
                    }
                    className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                  >
                    <option value="players">Joueurs</option>
                    <option value="teams">Équipes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                  Statut
                </label>

                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                >
                  <option value="active">Active</option>
                  <option value="draft">Brouillon</option>
                  <option value="closed">Clôturée</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Enregistrement..."
                    : editingId
                      ? "Modifier"
                      : "Créer"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-xl border border-[#D9A441]/30 px-6 py-3 font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#F7E9C5]">
                  Compétitions
                </h2>

                <p className="mt-2 text-sm text-[#D8C7A0]">
                  Accède directement au tableau de bord admin d’une compétition.
                </p>
              </div>

              <div className="rounded-2xl border border-[#D9A441]/30 bg-[#0B0610]/70 px-5 py-3 text-center">
                <p className="text-2xl font-black text-[#F2D27A]">
                  {competitions.length}
                </p>
                <p className="mt-1 text-xs uppercase tracking-widest text-[#8F7B5C]">
                  total
                </p>
              </div>
            </div>

            {competitions.length === 0 ? (
              <EmptyState text="Aucune compétition créée pour le moment." />
            ) : (
              <div className="space-y-4">
                {competitions.map((competition) => (
                  <article
                    key={competition.id}
                    className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-black text-[#F7E9C5]">
                          {competition.name}
                        </h3>

                        <p className="mt-2 text-sm text-[#D8C7A0]">
                          {competition.season || "Saison non définie"} ·{" "}
                          {getCompetitionTypeLabel(competition.type)} ·{" "}
                          {getParticipantTypeLabel(
                            competition.participant_type
                          )}
                        </p>

                        <p className="mt-1 text-xs uppercase tracking-widest text-[#8F7B5C]">
                          Statut : {competition.status}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/competitions/${competition.id}`}
                          className="rounded-lg bg-[#A61E22] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8E171C]"
                        >
                          Gérer
                        </Link>

                        <Link
                          href={`/competitions/${competition.id}/matchs`}
                          className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
                        >
                          Matchs
                        </Link>

                        <Link
                          href={`/competitions/${competition.id}/classement`}
                          className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
                        >
                          Classement
                        </Link>

                        <button
                          type="button"
                          onClick={() => startEdit(competition)}
                          className="rounded-lg border border-blue-400/30 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-950/30"
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          disabled={deletingId === competition.id}
                          onClick={() => deleteCompetition(competition)}
                          className="rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === competition.id ? "..." : "Supprimer"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function AccessCard({
  title,
  text,
  linkHref,
  linkText,
}: {
  title: string;
  text: string;
  linkHref: string;
  linkText: string;
}) {
  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
          <h1 className="text-3xl font-black">{title}</h1>

          <p className="mt-3 text-[#D8C7A0]">{text}</p>

          <Link
            href={linkHref}
            className="mt-6 inline-flex rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
          >
            {linkText}
          </Link>
        </div>
      </section>
    </main>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
      {text}
    </p>
  );
}