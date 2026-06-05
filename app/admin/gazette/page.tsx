"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  role: "member" | "admin";
};

type GazetteStatus = "draft" | "published" | "archived";

type Gazette = {
  id: string;
  title: string;
  description: string | null;
  month: string | null;
  year: number | null;
  period_date: string | null;
  file_url: string;
  file_path: string | null;
  status: GazetteStatus;
  published_at: string | null;
  created_at: string | null;
};

type GazetteForm = {
  title: string;
  description: string;
  periodDate: string;
  status: GazetteStatus;
};

const emptyForm: GazetteForm = {
  title: "",
  description: "",
  periodDate: "",
  status: "draft",
};

function getStatusLabel(status: GazetteStatus) {
  if (status === "published") return "Publiée";
  if (status === "archived") return "Archivée";
  return "Brouillon";
}

function getStatusClass(status: GazetteStatus) {
  if (status === "published") {
    return "border-green-400/40 bg-green-500/15 text-green-300";
  }

  if (status === "archived") {
    return "border-slate-400/30 bg-slate-500/10 text-slate-300";
  }

  return "border-orange-400/40 bg-orange-500/15 text-orange-300";
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function formatShortDate(value: string | null) {
  if (!value) return "Non définie";

  const datePart = value.split("T")[0];
  const parts = datePart.split("-");

  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year.slice(-2)}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date invalide";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function toDateInputValue(value: string | null) {
  if (!value) return "";

  const datePart = value.split("T")[0];
  const parts = datePart.split("-");

  if (parts.length === 3) return datePart;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getYearFromPeriodDate(value: string) {
  const year = Number(value.slice(0, 4));
  return Number.isNaN(year) ? null : year;
}

function getMonthNameFromPeriodDate(value: string) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
  }).format(date);
}

function formatPeriod(gazette: Gazette) {
  if (gazette.period_date) return formatShortDate(gazette.period_date);

  if (gazette.month && gazette.year) return `${gazette.month} ${gazette.year}`;
  if (gazette.year) return String(gazette.year);

  return "Non définie";
}

export default function AdminGazettePage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [gazettes, setGazettes] = useState<Gazette[]>([]);

  const [form, setForm] = useState<GazetteForm>(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingGazette, setEditingGazette] = useState<Gazette | null>(null);

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

    const gazettesResult = await supabase
      .from("gazettes")
      .select("*")
      .order("period_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (gazettesResult.error) {
      setMessage(`Erreur gazettes : ${gazettesResult.error.message}`);
      setLoading(false);
      return;
    }

    setGazettes((gazettesResult.data ?? []) as Gazette[]);
    setLoading(false);
  }

  function updateForm<K extends keyof GazetteForm>(
    key: K,
    value: GazetteForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function startEdit(gazette: Gazette) {
    setEditingGazette(gazette);
    setSelectedFile(null);
    setForm({
      title: gazette.title,
      description: gazette.description || "",
      periodDate: toDateInputValue(gazette.period_date),
      status: gazette.status,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingGazette(null);
    setSelectedFile(null);
    setForm(emptyForm);
    setMessage("");
  }

  async function uploadPdf(file: File, title: string, periodDate: string) {
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      throw new Error("Le fichier doit être un PDF.");
    }

    const cleanTitle = sanitizeFileName(title) || "gazette";
    const cleanYear =
      getYearFromPeriodDate(periodDate) || new Date().getFullYear();

    const filePath = `${cleanYear}/${Date.now()}-${cleanTitle}.pdf`;

    const uploadResult = await supabase.storage
      .from("gazettes")
      .upload(filePath, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadResult.error) {
      throw new Error(uploadResult.error.message);
    }

    const publicUrlResult = supabase.storage
      .from("gazettes")
      .getPublicUrl(filePath);

    return {
      filePath,
      fileUrl: publicUrlResult.data.publicUrl,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      setMessage("Action réservée aux admins.");
      return;
    }

    if (!form.title.trim()) {
      setMessage("Merci de renseigner le titre de la gazette.");
      return;
    }

    if (!form.periodDate) {
      setMessage("Merci de renseigner la date de période.");
      return;
    }

    if (!editingGazette && !selectedFile) {
      setMessage("Merci d’ajouter le PDF de la gazette.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let filePath = editingGazette?.file_path || null;
      let fileUrl = editingGazette?.file_url || "";

      if (selectedFile) {
        const uploaded = await uploadPdf(
          selectedFile,
          form.title.trim(),
          form.periodDate
        );

        filePath = uploaded.filePath;
        fileUrl = uploaded.fileUrl;

        if (editingGazette?.file_path) {
          await supabase.storage
            .from("gazettes")
            .remove([editingGazette.file_path]);
        }
      }

      const status = form.status;

      const publishedAt =
        status === "published"
          ? editingGazette?.published_at || new Date().toISOString()
          : editingGazette?.published_at || null;

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        month: getMonthNameFromPeriodDate(form.periodDate),
        year: getYearFromPeriodDate(form.periodDate),
        period_date: form.periodDate,
        status,
        file_url: fileUrl,
        file_path: filePath,
        published_at: publishedAt,
      };

      if (editingGazette) {
        const updateResult = await supabase
          .from("gazettes")
          .update(payload)
          .eq("id", editingGazette.id);

        if (updateResult.error) {
          throw new Error(updateResult.error.message);
        }

        setMessage("Gazette modifiée ✅");
      } else {
        const insertResult = await supabase.from("gazettes").insert(payload);

        if (insertResult.error) {
          throw new Error(insertResult.error.message);
        }

        setMessage("Gazette ajoutée ✅");
      }

      setForm(emptyForm);
      setSelectedFile(null);
      setEditingGazette(null);

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Erreur : ${error.message}`
          : "Erreur inconnue."
      );
    }

    setSaving(false);
  }

  async function updateStatus(gazette: Gazette, status: GazetteStatus) {
    if (!isAdmin) {
      setMessage("Action réservée aux admins.");
      return;
    }

    const updateResult = await supabase
      .from("gazettes")
      .update({
        status,
        published_at:
          status === "published"
            ? gazette.published_at || new Date().toISOString()
            : gazette.published_at,
      })
      .eq("id", gazette.id);

    if (updateResult.error) {
      setMessage(`Erreur statut : ${updateResult.error.message}`);
      return;
    }

    setMessage("Statut modifié ✅");
    await loadData();
  }

  async function deleteGazette(gazette: Gazette) {
    if (!isAdmin) {
      setMessage("Action réservée aux admins.");
      return;
    }

    const confirmed = window.confirm(
      `Supprimer la gazette "${gazette.title}" ?`
    );

    if (!confirmed) return;

    setDeletingId(gazette.id);
    setMessage("");

    if (gazette.file_path) {
      await supabase.storage.from("gazettes").remove([gazette.file_path]);
    }

    const deleteResult = await supabase
      .from("gazettes")
      .delete()
      .eq("id", gazette.id);

    if (deleteResult.error) {
      setDeletingId(null);
      setMessage(`Erreur suppression : ${deleteResult.error.message}`);
      return;
    }

    setDeletingId(null);
    setMessage("Gazette supprimée ✅");

    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="text-[#D8C7A0]">Chargement de la gazette...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <AccessCard
        title="Connexion requise"
        text="Connecte-toi avec un compte admin."
      />
    );
  }

  if (!isAdmin) {
    return (
      <AccessCard
        title="Accès refusé"
        text="Cette page est réservée aux admins."
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-black text-[#F2D27A] transition hover:bg-[#160A12]"
          >
            ← Retour admin
          </Link>

          <Link
            href="/gazette"
            className="rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-black text-[#F2D27A] transition hover:bg-[#160A12]"
          >
            Vue publique gazette
          </Link>
        </div>

        <section className="rounded-[28px] border border-[#D9A441]/25 bg-gradient-to-br from-[#21070b] via-[#12040d] to-black p-6 shadow-2xl shadow-black/50">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#F2D27A]">
                Administration
              </p>

              <h1 className="mt-3 text-4xl font-black text-[#F7E9C5] md:text-5xl">
                Gestion gazette
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#D8C7A0]">
                Ajoute les PDF de la gazette, modifie les informations et gère
                leur publication.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <SummaryTile label="Total" value={gazettes.length} />
              <SummaryTile
                label="Publiées"
                value={gazettes.filter((item) => item.status === "published").length}
              />
              <SummaryTile
                label="Brouillons"
                value={gazettes.filter((item) => item.status === "draft").length}
              />
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-6 rounded-2xl border border-[#D9A441]/30 bg-[#160A12] px-4 py-3 text-sm font-black text-[#F2D27A]">
            {message}
          </div>
        )}

        <section className="mt-8 rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F2D27A]">
                Formulaire
              </p>

              <h2 className="mt-2 text-2xl font-black text-[#F7E9C5]">
                {editingGazette ? "Modifier une gazette" : "Ajouter une gazette"}
              </h2>

              <p className="mt-2 text-sm text-[#D8C7A0]">
                Renseigne la période, le statut et le fichier PDF.
              </p>
            </div>

            {editingGazette && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-[#D9A441]/30 px-4 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
              >
                Annuler modification
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[1fr_1fr_0.8fr_0.7fr_auto]">
            <FormInput
              label="Titre"
              value={form.title}
              onChange={(value) => updateForm("title", value)}
              placeholder="Ex : Guardian's Gazette Mag 3"
            />

            <label>
              <span className="mb-2 block text-sm font-black text-[#F2D27A]">
                Description
              </span>

              <input
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                placeholder="Court résumé..."
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-black text-[#F2D27A]">
                Date de période
              </span>

              <input
                type="date"
                value={form.periodDate}
                onChange={(event) =>
                  updateForm("periodDate", event.target.value)
                }
                className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-black text-[#F2D27A]">
                Statut
              </span>

              <select
                value={form.status}
                onChange={(event) =>
                  updateForm("status", event.target.value as GazetteStatus)
                }
                className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publiée</option>
                <option value="archived">Archivée</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-black text-[#F2D27A]">
                PDF
              </span>

              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
                className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-3 py-2.5 text-xs text-[#F7E9C5] file:mr-3 file:rounded-lg file:border-0 file:bg-[#F2C300] file:px-3 file:py-2 file:text-xs file:font-black file:text-black"
              />
            </label>

            <div className="xl:col-span-5 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#A61E22] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Enregistrement..."
                  : editingGazette
                    ? "Modifier la gazette"
                    : "Ajouter la gazette"}
              </button>

              {editingGazette && (
                <p className="text-xs text-[#8F7B5C]">
                  Laisse le champ PDF vide pour conserver le fichier actuel.
                </p>
              )}
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-[28px] border border-[#D9A441]/25 bg-[#160A12]/90 p-6 shadow-2xl shadow-black/40">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F2D27A]">
                Tableur
              </p>

              <h2 className="mt-2 text-2xl font-black text-[#F7E9C5]">
                Gazettes existantes
              </h2>

              <p className="mt-2 text-sm text-[#D8C7A0]">
                Gestion rapide des publications PDF.
              </p>
            </div>

            <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[#D9A441]/35 bg-black/30 px-3 text-sm font-black text-[#F2D27A]">
              {gazettes.length}
            </span>
          </div>

          {gazettes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D9A441]/20 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
              Aucune gazette créée.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#D9A441]/20 bg-black/20">
              <div className="max-h-[720px] overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[27%]" />
                    <col className="w-[13%]" />
                    <col className="w-[13%]" />
                    <col className="w-[13%]" />
                    <col className="w-[34%]" />
                  </colgroup>

                  <thead className="sticky top-0 z-10 bg-[#26070b] text-[10px] uppercase tracking-[0.18em] text-[#F2D27A]">
                    <tr>
                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Gazette
                      </th>

                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Période
                      </th>

                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Publication
                      </th>

                      <th className="border-b border-[#D9A441]/20 px-4 py-3">
                        Statut
                      </th>

                      <th className="border-b border-[#D9A441]/20 px-4 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {gazettes.map((gazette) => (
                      <tr
                        key={gazette.id}
                        className="border-b border-[#D9A441]/10 transition hover:bg-[#D9A441]/5"
                      >
                        <td className="px-4 py-4">
                          <p className="truncate font-black text-[#F7E9C5]">
                            {gazette.title}
                          </p>

                          <p className="mt-1 truncate text-xs text-[#8F7B5C]">
                            {gazette.description || "Aucune description."}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full border border-[#D9A441]/35 bg-[#D9A441]/10 px-3 py-1 text-xs font-black text-[#F2D27A]">
                            {formatPeriod(gazette)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-[#D8C7A0]">
                          {formatShortDate(gazette.published_at)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                              gazette.status
                            )}`}
                          >
                            {getStatusLabel(gazette.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <a
                              href={gazette.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-[#D9A441]/30 px-3 py-2 text-xs font-black text-[#F2D27A] transition hover:bg-[#0B0610]"
                            >
                              Lire
                            </a>

                            <button
                              type="button"
                              onClick={() => startEdit(gazette)}
                              className="rounded-lg border border-blue-400/35 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-300 transition hover:bg-blue-500/20"
                            >
                              Modifier
                            </button>

                            {gazette.status !== "published" && (
                              <button
                                type="button"
                                onClick={() => updateStatus(gazette, "published")}
                                className="rounded-lg border border-green-400/35 bg-green-500/10 px-3 py-2 text-xs font-black text-green-300 transition hover:bg-green-500/20"
                              >
                                Publier
                              </button>
                            )}

                            {gazette.status !== "archived" && (
                              <button
                                type="button"
                                onClick={() => updateStatus(gazette, "archived")}
                                className="rounded-lg border border-slate-400/35 bg-slate-500/10 px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-slate-500/20"
                              >
                                Archiver
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={deletingId === gazette.id}
                              onClick={() => deleteGazette(gazette)}
                              className="rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                            >
                              {deletingId === gazette.id ? "..." : "Supprimer"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function AccessCard({ title, text }: { title: string; text: string }) {
  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
          <h1 className="text-3xl font-black">{title}</h1>

          <p className="mt-3 text-[#D8C7A0]">{text}</p>

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

function FormInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-[#F2D27A]">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
        placeholder={placeholder}
      />
    </label>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/25 bg-black/30 px-5 py-4">
      <p className="text-2xl font-black text-[#F2D27A]">{value}</p>
      <p className="text-xs uppercase tracking-widest text-[#8F7B5C]">
        {label}
      </p>
    </div>
  );
}
