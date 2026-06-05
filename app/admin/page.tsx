"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  role: "member" | "admin";
};

type ParticipantType = "players" | "teams";

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: ParticipantType;
  created_at?: string | null;
};

type CompetitionForm = {
  name: string;
  type: string;
  season: string;
  status: string;
  participant_type: ParticipantType;
};

const emptyForm: CompetitionForm = {
  name: "",
  type: "league",
  season: "",
  status: "active",
  participant_type: "players",
};

function getCompetitionTypeLabel(type: string) {
  if (type === "league") return "Championnat";
  if (type === "cup") return "Coupe";
  if (type === "tournament") return "Tournoi";

  return type;
}

function getStatusLabel(status: string) {
  if (status === "draft") return "Brouillon";
  if (status === "planned") return "Planifiée";
  if (status === "active") return "Active";
  if (status === "completed") return "Terminée";
  if (status === "archived") return "Archivée";

  return status;
}

function getStatusClass(status: string) {
  if (status === "active") {
    return "border-green-400/40 bg-green-500/15 text-green-300";
  }

  if (status === "planned") {
    return "border-yellow-400/40 bg-yellow-500/15 text-yellow-300";
  }

  if (status === "draft") {
    return "border-orange-400/40 bg-orange-500/15 text-orange-300";
  }

  if (status === "completed") {
    return "border-blue-400/40 bg-blue-500/15 text-blue-300";
  }

  if (status === "archived") {
    return "border-slate-400/30 bg-slate-500/10 text-slate-300";
  }

  return "border-[#D9A441]/30 bg-black/30 text-[#F2D27A]";
}

function getParticipantTypeLabel(type: ParticipantType) {
  if (type === "teams") return "Équipes";
  return "Joueurs";
}

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  const [form, setForm] = useState<CompetitionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function updateCompetitionStatus(
    competition: Competition,
    nextStatus: string
  ) {
    if (!isAdmin) {
      setMessage("Action réservée aux admins.");
      return;
    }

    const label =
      nextStatus === "archived"
        ? "archiver"
        : nextStatus === "active"
          ? "réactiver"
          : "modifier";

    const confirmed = window.confirm(
      `Confirmer : ${label} la compétition "${competition.name}" ?`
    );

    if (!confirmed) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return;
    }

    setSaving(true);
    setMessage("");

    const response = await fetch(
      `/api/admin/competitions/${competition.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setSaving(false);
      setMessage(result.error || "Erreur lors du changement de statut.");
      return;
    }

    setSaving(false);
    setMessage(result.message || "Statut modifié ✅");

    await loadData();
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
        linkText="Retour accueil"
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-black text-[#F2D27A]">
            Administration Guardian&apos;s Family
          </p>

          <h1 className="mt-5 text-4xl font-black text-[#F7E9C5] md:text-5xl">
            Panneau admin
          </h1>

          <p className="mt-3 text-[#D8C7A0]">
            Crée, modifie et gère les compétitions du site.
          </p>
        </div>

        <section className="rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F2D27A]">
                Navigation admin
              </p>

              <h2 className="mt-2 text-2xl font-black text-[#F7E9C5]">
                Accès admin
              </h2>

              <p className="mt-2 text-sm text-[#D8C7A0]">
                Accède rapidement aux modules d’administration du site.
              </p>
            </div>

            <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[#D9A441]/35 bg-black/30 px-3 text-sm font-black text-[#F2D27A]">
              5
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#D9A441]/20 bg-black/20">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[58%]" />
                <col className="w-[20%]" />
              </colgroup>

              <thead className="bg-[#26070b] text-[10px] uppercase tracking-[0.18em] text-[#F2D27A]">
                <tr>
                  <th className="border-b border-[#D9A441]/20 px-4 py-3">
                    Module
                  </th>

                  <th className="border-b border-[#D9A441]/20 px-4 py-3">
                    Description
                  </th>

                  <th className="border-b border-[#D9A441]/20 px-4 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                <AdminAccessRow
                  badge="TE"
                  title="Teams esport"
                  description="Créer les teams, rattacher les membres et inscrire les teams aux compétitions."
                  href="/admin/teams"
                  tone="blue"
                />

                <AdminAccessRow
                  badge="MB"
                  title="Membres"
                  description="Créer et modifier les membres, rôles, fiches joueur, plateformes, pays et numéros de maillot."
                  href="/admin/membres"
                  tone="green"
                />

                <AdminAccessRow
                  badge="CP"
                  title="Compétitions"
                  description="Créer les compétitions, gérer les participants, matchs, scores et programmations."
                  href="/admin"
                  tone="gold"
                />

                <AdminAccessRow
                  badge="PDF"
                  title="Gazette"
                  description="Publier, archiver et supprimer les PDF de la gazette mensuelle."
                  href="/admin/gazette"
                  tone="red"
                />

                <AdminAccessRow
                  badge="EM"
                  title="Vue membre"
                  description="Vérifier la carte membre, les matchs à jouer et les résultats."
                  href="/membre"
                  tone="gold"
                />
              </tbody>
            </table>
          </div>
        </section>

        {message && (
          <div className="mt-6 rounded-xl border border-[#D9A441]/30 bg-[#160A12] p-4 text-sm text-[#F2D27A]">
            {message}
          </div>
        )}

        <section className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
            <h2 className="text-2xl font-black text-[#F7E9C5]">
              {editingId ? "Modifier une compétition" : "Créer une compétition"}
            </h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-[#F2D27A]">
                  Nom
                </span>

                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                  placeholder="Ex : GSF League"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-[#F2D27A]">
                  Saison
                </span>

                <input
                  value={form.season}
                  onChange={(event) => updateForm("season", event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                  placeholder="Ex : Saison 1"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[#F2D27A]">
                    Type
                  </span>

                  <select
                    value={form.type}
                    onChange={(event) => updateForm("type", event.target.value)}
                    className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                  >
                    <option value="league">Championnat</option>
                    <option value="cup">Coupe</option>
                    <option value="tournament">Tournoi</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[#F2D27A]">
                    Format
                  </span>

                  <select
                    value={form.participant_type}
                    onChange={(event) =>
                      updateForm(
                        "participant_type",
                        event.target.value as ParticipantType
                      )
                    }
                    className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                  >
                    <option value="players">Joueurs</option>
                    <option value="teams">Équipes</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-[#F2D27A]">
                  Statut
                </span>

                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
                >
                  <option value="draft">Brouillon</option>
                  <option value="planned">Planifiée</option>
                  <option value="active">Active</option>
                  <option value="completed">Terminée</option>
                  <option value="archived">Archivée</option>
                </select>
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#A61E22] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="rounded-xl border border-[#D9A441]/30 px-6 py-3 text-sm font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#F7E9C5]">
                  Compétitions
                </h2>

                <p className="mt-2 text-sm text-[#D8C7A0]">
                  Accède directement au tableau de bord admin d’une compétition.
                </p>
              </div>

              <span className="inline-flex h-14 min-w-14 items-center justify-center rounded-2xl border border-[#D9A441]/35 bg-black/30 px-4 text-center text-lg font-black text-[#F2D27A]">
                {competitions.length}
              </span>
            </div>

            {competitions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D9A441]/20 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
                Aucune compétition créée pour le moment.
              </div>
            ) : (
              <div className="space-y-4">
                {competitions.map((competition) => (
                  <article
                    key={competition.id}
                    className="rounded-2xl border border-[#D9A441]/20 bg-black/25 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black text-[#F7E9C5]">
                          {competition.name}
                        </h3>

                        <p className="mt-2 text-sm text-[#D8C7A0]">
                          {competition.season || "Saison non définie"} ·{" "}
                          {getCompetitionTypeLabel(competition.type)} ·{" "}
                          {getParticipantTypeLabel(competition.participant_type)}
                        </p>

                        <p className="mt-1 text-xs uppercase tracking-widest text-[#8F7B5C]">
                          Statut : {getStatusLabel(competition.status)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                          competition.status
                        )}`}
                      >
                        {getStatusLabel(competition.status)}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/admin/competitions/${competition.id}`}
                        className="rounded-lg bg-[#A61E22] px-4 py-2 text-xs font-black text-white transition hover:bg-[#8E171C]"
                      >
                        Gérer
                      </Link>

                      <Link
                        href={`/admin/competitions/${competition.id}`}
                        className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
                      >
                        Matchs
                      </Link>

                      <Link
                        href={`/competitions/${competition.id}/classement`}
                        className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
                      >
                        Classement
                      </Link>

                      <button
                        type="button"
                        onClick={() => startEdit(competition)}
                        className="rounded-lg border border-blue-400/35 bg-blue-500/10 px-4 py-2 text-xs font-black text-blue-300 transition hover:bg-blue-500/20"
                      >
                        Modifier
                      </button>

                      {competition.status === "archived" ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            updateCompetitionStatus(competition, "active")
                          }
                          className="rounded-lg border border-green-400/35 bg-green-500/10 px-4 py-2 text-xs font-black text-green-300 transition hover:bg-green-500/20 disabled:opacity-50"
                        >
                          Réactiver
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            updateCompetitionStatus(competition, "archived")
                          }
                          className="rounded-lg border border-slate-400/35 bg-slate-500/10 px-4 py-2 text-xs font-black text-slate-300 transition hover:bg-slate-500/20 disabled:opacity-50"
                        >
                          Archiver
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={deletingId === competition.id}
                        onClick={() => deleteCompetition(competition)}
                        className="rounded-lg border border-red-400/35 bg-red-500/10 px-4 py-2 text-xs font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {deletingId === competition.id ? "..." : "Supprimer"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}

function AdminAccessRow({
  badge,
  title,
  description,
  href,
  tone = "gold",
}: {
  badge: string;
  title: string;
  description: string;
  href: string;
  tone?: "gold" | "red" | "green" | "blue";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-400/35 bg-red-500/10 text-red-200"
      : tone === "green"
        ? "border-green-400/35 bg-green-500/10 text-green-200"
        : tone === "blue"
          ? "border-blue-400/35 bg-blue-500/10 text-blue-200"
          : "border-[#D9A441]/35 bg-[#D9A441]/10 text-[#F2D27A]";

  return (
    <tr className="border-b border-[#D9A441]/10 transition hover:bg-[#D9A441]/5">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-black uppercase tracking-wider ${toneClass}`}
          >
            {badge}
          </span>

          <span className="font-black text-[#F7E9C5]">{title}</span>
        </div>
      </td>

      <td className="px-4 py-4 text-[#D8C7A0]">{description}</td>

      <td className="px-4 py-4 text-right">
        <Link
          href={href}
          className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
        >
          Ouvrir
        </Link>
      </td>
    </tr>
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
            className="mt-6 inline-flex rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white transition hover:bg-[#8E171C]"
          >
            {linkText}
          </Link>
        </div>
      </section>
    </main>
  );
}
