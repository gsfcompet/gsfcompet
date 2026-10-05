"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  canManageCompetitions,
  canAccessAdminModule,
  type AppRole,
} from "@/lib/roles";

type Profile = {
  id: string;
  role: AppRole;
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
    return "border-[#2EC4B6]/35 bg-[#2EC4B6]/10 text-[#2EC4B6]";
  }

  if (status === "planned") {
    return "border-[#C39B55]/40 bg-[#C39B55]/10 text-[#DBC399]";
  }

  if (status === "draft") {
    return "border-orange-300/30 bg-orange-400/10 text-orange-200";
  }

  if (status === "completed") {
    return "border-blue-300/30 bg-blue-400/10 text-blue-200";
  }

  if (status === "archived") {
    return "border-slate-300/25 bg-slate-400/10 text-slate-300";
  }

  return "border-[#C39B55]/30 bg-black/30 text-[#DBC399]";
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

  const isAdmin = canManageCompetitions(profile?.role);

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

    if (!canAccessAdminModule(loadedProfile.role, "admin")) {
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

    const payload = {
      action: editingId ? "update" : "create",
      competition_id: editingId,
      name: form.name.trim(),
      type: form.type,
      season: form.season.trim() || null,
      status: form.status,
      participant_type: form.participant_type,
    };

    const response = await fetch("/api/admin/competitions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const result: { error?: string; message?: string } = await response.json();

    if (!response.ok) {
      setSaving(false);
      setMessage(
        result.error ||
          (editingId
            ? "Erreur modification compétition."
            : "Erreur création compétition.")
      );
      return;
    }

    setSaving(false);
    setEditingId(null);
    setForm(emptyForm);
    setMessage(result.message || "Compétition enregistrée ✅");

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

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return;
    }

    setDeletingId(competition.id);
    setMessage("");

    const response = await fetch("/api/admin/competitions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: "delete",
        competition_id: competition.id,
      }),
    });

    const result: { error?: string; message?: string } = await response.json();

    if (!response.ok) {
      setDeletingId(null);
      setMessage(result.error || "Erreur suppression compétition.");
      return;
    }

    setDeletingId(null);
    setMessage(result.message || "Compétition supprimée ✅");

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

    const result: { error?: string; message?: string } = await response.json();

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
      <main
        className="min-h-screen text-[#CFC6AB]"
        style={{
          background:
            "radial-gradient(1200px 700px at 10% -10%, #12274A 0%, #0B1B33 60%)",
        }}
      >
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#C39B55]/20 bg-[#12274A]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="text-[#DBC399]">
              Chargement de l’administration...
            </p>
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
    <main
      className="min-h-screen text-[#CFC6AB]"
      style={{
        background:
          "radial-gradient(1200px 700px at 10% -10%, #12274A 0%, #0B1B33 60%)",
      }}
    >
      <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="inline-flex rounded-full border border-[#C39B55]/30 bg-[#12274A] px-4 py-2 text-sm font-black text-[#DBC399]">
            Administration Guardian's Family
          </p>

          <h1 className="mt-5 text-4xl font-black text-[#CFC6AB] md:text-5xl">
            Panneau admin
          </h1>

          <p className="mt-3 text-[#DBC399]">
            Crée, modifie et gère les compétitions du site.
          </p>
        </div>

        <section className="rounded-[28px] border border-[#C39B55]/25 bg-[#12274A]/90 p-6 shadow-2xl shadow-black/40">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#C39B55]">
                Navigation admin
              </p>

              <h2 className="mt-2 text-2xl font-black text-[#CFC6AB]">
                Accès admin
              </h2>

              <p className="mt-2 text-sm text-[#DBC399]">
                Accède rapidement aux modules d’administration du site.
              </p>
            </div>

            <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[#C39B55]/35 bg-black/30 px-3 text-sm font-black text-[#DBC399]">
              5
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#C39B55]/20 bg-black/20">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[58%]" />
                <col className="w-[20%]" />
              </colgroup>

              <thead className="bg-[#0B1B33] text-[10px] uppercase tracking-[0.18em] text-[#DBC399]">
                <tr>
                  <th className="border-b border-[#C39B55]/20 px-4 py-3">
                    Module
                  </th>

                  <th className="border-b border-[#C39B55]/20 px-4 py-3">
                    Description
                  </th>

                  <th className="border-b border-[#C39B55]/20 px-4 py-3 text-right">
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
          <div className="mt-6 rounded-xl border border-[#C39B55]/30 bg-[#12274A] p-4 text-sm text-[#DBC399]">
            {message}
          </div>
        )}

        <section className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[28px] border border-[#C39B55]/25 bg-[#12274A]/90 p-6 shadow-2xl shadow-black/40">
            <h2 className="text-2xl font-black text-[#CFC6AB]">
              {editingId ? "Modifier une compétition" : "Créer une compétition"}
            </h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-[#DBC399]">
                  Nom
                </span>

                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className="w-full rounded-xl border border-[#C39B55]/20 bg-[#0B1B33] px-4 py-3 text-[#CFC6AB] outline-none transition placeholder:text-[#8F8063] focus:border-[#C39B55]/60"
                  placeholder="Ex : GSF League"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-[#DBC399]">
                  Saison
                </span>

                <input
                  value={form.season}
                  onChange={(event) => updateForm("season", event.target.value)}
                  className="w-full rounded-xl border border-[#C39B55]/20 bg-[#0B1B33] px-4 py-3 text-[#CFC6AB] outline-none transition placeholder:text-[#8F8063] focus:border-[#C39B55]/60"
                  placeholder="Ex : Saison 1"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[#DBC399]">
                    Type
                  </span>

                  <select
                    value={form.type}
                    onChange={(event) => updateForm("type", event.target.value)}
                    className="w-full rounded-xl border border-[#C39B55]/20 bg-[#0B1B33] px-4 py-3 text-[#CFC6AB] outline-none transition focus:border-[#C39B55]/60"
                  >
                    <option value="league">Championnat</option>
                    <option value="cup">Coupe</option>
                    <option value="tournament">Tournoi</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[#DBC399]">
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
                    className="w-full rounded-xl border border-[#C39B55]/20 bg-[#0B1B33] px-4 py-3 text-[#CFC6AB] outline-none transition focus:border-[#C39B55]/60"
                  >
                    <option value="players">Joueurs</option>
                    <option value="teams">Équipes</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-[#DBC399]">
                  Statut
                </span>

                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className="w-full rounded-xl border border-[#C39B55]/20 bg-[#0B1B33] px-4 py-3 text-[#CFC6AB] outline-none transition focus:border-[#C39B55]/60"
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
                  className="rounded-xl bg-[#C39B55] px-6 py-3 text-sm font-black text-[#0B1B33] shadow-lg shadow-black/20 transition hover:bg-[#DBC399] disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="rounded-xl border border-[#C39B55]/30 px-6 py-3 text-sm font-black text-[#DBC399] transition hover:bg-[#0B1B33]"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-[28px] border border-[#C39B55]/25 bg-[#12274A]/90 p-6 shadow-2xl shadow-black/40">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#CFC6AB]">
                  Compétitions
                </h2>

                <p className="mt-2 text-sm text-[#DBC399]">
                  Accède directement au tableau de bord admin d’une compétition.
                </p>
              </div>

              <span className="inline-flex h-14 min-w-14 items-center justify-center rounded-2xl border border-[#C39B55]/35 bg-black/30 px-4 text-center text-lg font-black text-[#DBC399]">
                {competitions.length}
              </span>
            </div>

            {competitions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#C39B55]/20 bg-[#0B1B33]/70 p-4 text-sm text-[#DBC399]">
                Aucune compétition créée pour le moment.
              </div>
            ) : (
              <div className="space-y-4">
                {competitions.map((competition) => (
                  <article
                    key={competition.id}
                    className="rounded-2xl border border-[#C39B55]/20 bg-black/20 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black text-[#CFC6AB]">
                          {competition.name}
                        </h3>

                        <p className="mt-2 text-sm text-[#DBC399]">
                          {competition.season || "Saison non définie"} ·{" "}
                          {getCompetitionTypeLabel(competition.type)} ·{" "}
                          {getParticipantTypeLabel(competition.participant_type)}
                        </p>

                        <p className="mt-1 text-xs uppercase tracking-widest text-[#A99B7B]">
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
                        className="rounded-lg bg-[#C39B55] px-4 py-2 text-xs font-black text-[#0B1B33] transition hover:bg-[#DBC399]"
                      >
                        Gérer
                      </Link>

                      <Link
                        href={`/admin/competitions/${competition.id}`}
                        className="rounded-lg border border-[#C39B55]/30 px-4 py-2 text-xs font-black text-[#DBC399] transition hover:bg-[#0B1B33]"
                      >
                        Matchs
                      </Link>

                      <Link
                        href={`/competitions/${competition.id}/classement`}
                        className="rounded-lg border border-[#C39B55]/30 px-4 py-2 text-xs font-black text-[#DBC399] transition hover:bg-[#0B1B33]"
                      >
                        Classement
                      </Link>

                      <button
                        type="button"
                        onClick={() => startEdit(competition)}
                        className="rounded-lg border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-xs font-black text-blue-200 transition hover:bg-blue-400/20"
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
                          className="rounded-lg border border-[#2EC4B6]/35 bg-[#2EC4B6]/10 px-4 py-2 text-xs font-black text-[#2EC4B6] transition hover:bg-[#2EC4B6]/20 disabled:opacity-50"
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
                          className="rounded-lg border border-slate-300/25 bg-slate-400/10 px-4 py-2 text-xs font-black text-slate-300 transition hover:bg-slate-400/20 disabled:opacity-50"
                        >
                          Archiver
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={deletingId === competition.id}
                        onClick={() => deleteCompetition(competition)}
                        className="rounded-lg border border-[#371015]/70 bg-[#371015]/40 px-4 py-2 text-xs font-black text-[#CFC6AB] transition hover:bg-[#371015]/70 disabled:opacity-50"
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
      ? "border-[#371015]/70 bg-[#371015]/40 text-[#CFC6AB]"
      : tone === "green"
        ? "border-[#2EC4B6]/35 bg-[#2EC4B6]/10 text-[#2EC4B6]"
        : tone === "blue"
          ? "border-blue-300/30 bg-blue-400/10 text-blue-200"
          : "border-[#C39B55]/35 bg-[#C39B55]/10 text-[#DBC399]";

  return (
    <tr className="border-b border-[#C39B55]/10 transition hover:bg-[#C39B55]/5">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-black uppercase tracking-wider ${toneClass}`}
          >
            {badge}
          </span>

          <span className="font-black text-[#CFC6AB]">{title}</span>
        </div>
      </td>

      <td className="px-4 py-4 text-[#DBC399]">{description}</td>

      <td className="px-4 py-4 text-right">
        <Link
          href={href}
          className="rounded-lg border border-[#C39B55]/30 px-4 py-2 text-xs font-black text-[#DBC399] transition hover:bg-[#0B1B33]"
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
    <main
      className="min-h-screen text-[#CFC6AB]"
      style={{
        background:
          "radial-gradient(1200px 700px at 10% -10%, #12274A 0%, #0B1B33 60%)",
      }}
    >
      <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-[#C39B55]/20 bg-[#12274A]/90 p-6 text-center shadow-lg shadow-black/30">
          <h1 className="text-3xl font-black">{title}</h1>

          <p className="mt-3 text-[#DBC399]">{text}</p>

          <Link
            href={linkHref}
            className="mt-6 inline-flex rounded-xl bg-[#C39B55] px-6 py-3 font-semibold text-[#0B1B33] transition hover:bg-[#DBC399]"
          >
            {linkText}
          </Link>
        </div>
      </section>
    </main>
  );
}