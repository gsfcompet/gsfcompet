"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  canManageRoles,
  normalizeRole,
  roleLabels,
  roleOptions,
  type AppRole,
} from "@/lib/roles";

type MemberRole = AppRole;
type RoleFilter = "all" | AppRole;

type Player = {
  id: string;
  user_id: string | null;
  name: string | null;
  ea_name: string | null;
  platform: string | null;
};

type Member = {
  id: string;
  email: string | null;
  username: string | null;
  role: MemberRole;
  pays: string | null;
  numero_maillot: number | null;
  created_at?: string | null;
  player: Player | null;
  banned_until: string | null;
  is_disabled: boolean;
  registrations_count: number;
};

type MemberForm = {
  username: string;
  role: MemberRole;
  pays: string;
  numero_maillot: string;
  player_name: string;
  ea_name: string;
  platform: string;
};

type CreateMemberForm = MemberForm & {
  email: string;
  password: string;
};

const emptyCreateForm: CreateMemberForm = {
  email: "",
  password: "",
  username: "",
  role: "member",
  pays: "France",
  numero_maillot: "0",
  player_name: "",
  ea_name: "",
  platform: "PC",
};

function memberToForm(member: Member): MemberForm {
  return {
    username: member.username || "",
    role: member.role || "member",
    pays: member.pays || "France",
    numero_maillot: String(member.numero_maillot ?? 0),
    player_name: member.player?.name || member.username || "",
    ea_name: member.player?.ea_name || member.username || "",
    platform: member.player?.platform || "PC",
  };
}

export default function AdminMembersPage() {
  const currentUserRole = "owner";

  const supabase = useMemo(() => createClient(), []);

  const [members, setMembers] = useState<Member[]>([]);
  const [editForms, setEditForms] = useState<Record<string, MemberForm>>({});
  const [createForm, setCreateForm] =
    useState<CreateMemberForm>(emptyCreateForm);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editModalMemberId, setEditModalMemberId] = useState<string | null>(
    null
  );
  const [actionMemberId, setActionMemberId] = useState<string | null>(null);
  const [openActionsMemberId, setOpenActionsMemberId] = useState<string | null>(
    null
  );

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getAccessToken() {
    const sessionResult = await supabase.auth.getSession();
    return sessionResult.data.session?.access_token ?? null;
  }

  async function loadMembers() {
    setLoading(true);
    setMessage("");

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/members", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const result: {
      error?: string;
      message?: string;
      members?: Member[];
    } = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Erreur chargement membres.");
      setLoading(false);
      return;
    }

    const loadedMembers = (result.members ?? []) as Member[];
    const nextForms: Record<string, MemberForm> = {};

    loadedMembers.forEach((member) => {
      nextForms[member.id] = memberToForm(member);
    });

    setMembers(loadedMembers);
    setEditForms(nextForms);
    setLoading(false);
  }

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) {
        return false;
      }

      if (!query) return true;

      const values = [
        member.email,
        member.username,
        member.pays,
        member.player?.name,
        member.player?.ea_name,
        member.player?.platform,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return values.includes(query);
    });
  }, [members, roleFilter, search]);

  const adminCount = members.filter((member) =>
    ["owner", "admin", "manager", "moderator"].includes(
      normalizeRole(member.role)
    )
  ).length;

  const memberCount = members.filter(
    (member) => member.role === "member"
  ).length;

  const editModalMember = useMemo(() => {
    return members.find((member) => member.id === editModalMemberId) ?? null;
  }, [members, editModalMemberId]);

  function updateCreateForm<K extends keyof CreateMemberForm>(
    key: K,
    value: CreateMemberForm[K]
  ) {
    setCreateForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateEditForm<K extends keyof MemberForm>(
    memberId: string,
    key: K,
    value: MemberForm[K]
  ) {
    setEditForms((current) => ({
      ...current,
      [memberId]: {
        ...current[memberId],
        [key]: value,
      },
    }));
  }

  async function createMember() {
    setMessage("");

    if (!createForm.email.trim()) {
      setMessage("Email obligatoire.");
      return;
    }

    if (createForm.password.length < 6) {
      setMessage("Mot de passe obligatoire, minimum 6 caractères.");
      return;
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return;
    }

    setCreating(true);

    const response = await fetch("/api/admin/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: "create",
        ...createForm,
      }),
    });

    const result: { error?: string; message?: string } = await response.json();

    if (!response.ok) {
      setCreating(false);
      setMessage(result.error || "Erreur création membre.");
      return;
    }

    setCreating(false);
    setCreateForm(emptyCreateForm);
    setMessage(result.message || "Membre créé avec succès ✅");

    await loadMembers();
  }

  async function saveMember(member: Member) {
    const form = editForms[member.id];

    if (!form) {
      setMessage("Formulaire membre introuvable.");
      return;
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return;
    }

    setSavingMemberId(member.id);
    setMessage("");

    const response = await fetch("/api/admin/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: "update",
        member_id: member.id,
        ...form,
      }),
    });

    const result: { error?: string; message?: string } = await response.json();

    if (!response.ok) {
      setSavingMemberId(null);
      setMessage(result.error || "Erreur modification membre.");
      return;
    }

    setSavingMemberId(null);
    setEditingMemberId(null);
    setEditModalMemberId(null);
    setMessage(result.message || "Membre modifié avec succès ✅");

    await loadMembers();
  }

  async function runSensitiveMemberAction(
    member: Member,
    action: "disable" | "enable" | "reset_password" | "delete",
    payload: Record<string, unknown> = {}
  ) {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      setMessage("Session admin introuvable. Reconnecte-toi.");
      return false;
    }

    setActionMemberId(member.id);
    setMessage("");

    const response = await fetch("/api/admin/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action,
        member_id: member.id,
        ...payload,
      }),
    });

    const result: { error?: string; message?: string } = await response.json();

    if (!response.ok) {
      setActionMemberId(null);
      setMessage(result.error || "Erreur action membre.");
      return false;
    }

    setActionMemberId(null);
    setOpenActionsMemberId(null);
    setMessage(result.message || "Action effectuée ✅");

    await loadMembers();

    return true;
  }

  async function disableMember(member: Member) {
    const confirmed = window.confirm(
      `Désactiver le compte de ${member.username || member.email} ? Il ne pourra plus se connecter.`
    );

    if (!confirmed) return;

    await runSensitiveMemberAction(member, "disable");
  }

  async function enableMember(member: Member) {
    const confirmed = window.confirm(
      `Réactiver le compte de ${member.username || member.email} ?`
    );

    if (!confirmed) return;

    await runSensitiveMemberAction(member, "enable");
  }

  async function resetMemberPassword(member: Member) {
    const password = window.prompt(
      `Nouveau mot de passe temporaire pour ${member.username || member.email} :`
    );

    if (password === null) return;

    if (password.length < 6) {
      setMessage("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    await runSensitiveMemberAction(member, "reset_password", {
      password,
    });
  }

  async function deleteMember(member: Member) {
    const label = member.username || member.email || "ce membre";

    const firstConfirm = window.confirm(
      `Supprimer définitivement ${label} ? Cette action supprimera aussi sa fiche joueur, ses inscriptions et les matchs liés.`
    );

    if (!firstConfirm) return;

    const typed = window.prompt(
      `Pour confirmer la suppression définitive de ${label}, écris SUPPRIMER :`
    );

    if (typed !== "SUPPRIMER") {
      setMessage('Suppression annulée. Tu dois écrire exactement "SUPPRIMER".');
      return;
    }

    await runSensitiveMemberAction(member, "delete");
  }

  const inputClassName =
    "rounded-xl border border-[#C99B4B]/30 bg-[#0B1B31] px-4 py-3 text-[#F1E9D2] outline-none transition focus:border-[#D8C79F]";

  return (
    <main className="min-h-screen bg-[#0B1B31] px-4 py-10 text-[#F1E9D2]">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-xl border border-[#C99B4B]/40 px-4 py-2 text-sm font-black text-[#D8C79F] transition hover:bg-[#C99B4B]/10"
          >
            ← Retour admin
          </Link>

          <Link
            href="/membre"
            className="rounded-xl border border-[#C99B4B]/40 px-4 py-2 text-sm font-black text-[#D8C79F] transition hover:bg-[#C99B4B]/10"
          >
            Espace membre
          </Link>
        </div>

        <section className="rounded-[28px] border border-[#C99B4B]/30 bg-gradient-to-br from-[#10223C] via-[#0D1E35] to-[#0B1B31] p-6 shadow-2xl shadow-black/50">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#C99B4B]">
                Guardian's Family
              </p>

              <h1 className="mt-3 text-4xl font-black text-[#F1E9D2] md:text-5xl">
                Gestion des membres
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#F1E9D2]/70">
                Administre les comptes, les rôles, les fiches joueur et les
                informations affichées sur les cartes membres.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-[#C99B4B]/25 bg-black/30 px-5 py-4">
                <p className="text-2xl font-black text-[#D8C79F]">
                  {members.length}
                </p>
                <p className="text-xs uppercase tracking-widest text-[#F1E9D2]/45">
                  Total
                </p>
              </div>

              <div className="rounded-2xl border border-[#C99B4B]/25 bg-black/30 px-5 py-4">
                <p className="text-2xl font-black text-[#D8C79F]">
                  {adminCount}
                </p>
                <p className="text-xs uppercase tracking-widest text-[#F1E9D2]/45">
                  Admins
                </p>
              </div>

              <div className="rounded-2xl border border-[#C99B4B]/25 bg-black/30 px-5 py-4">
                <p className="text-2xl font-black text-[#D8C79F]">
                  {memberCount}
                </p>
                <p className="text-xs uppercase tracking-widest text-[#F1E9D2]/45">
                  Membres
                </p>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-6 rounded-2xl border border-[#C99B4B]/30 bg-[#10223C] px-4 py-3 text-sm font-black text-[#D8C79F]">
            {message}
          </div>
        )}

        <section className="mt-8 rounded-[28px] border border-[#C99B4B]/30 bg-[#10223C]/95 p-6 shadow-2xl shadow-black/40">
          <h2 className="text-2xl font-black text-[#F1E9D2]">
            Créer un membre
          </h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <input
              value={createForm.email}
              onChange={(event) => updateCreateForm("email", event.target.value)}
              className={inputClassName}
              placeholder="Email"
            />

            <input
              type="password"
              value={createForm.password}
              onChange={(event) =>
                updateCreateForm("password", event.target.value)
              }
              className={inputClassName}
              placeholder="Mot de passe"
            />

            <input
              value={createForm.username}
              onChange={(event) =>
                updateCreateForm("username", event.target.value)
              }
              className={inputClassName}
              placeholder="Pseudo membre"
            />

            <select
              value={createForm.role}
              onChange={(event) =>
                updateCreateForm("role", event.target.value as AppRole)
              }
              className={inputClassName}
            >
              {roleOptions
                .filter((option) => {
                  if (option.value === "owner") {
                    return canManageRoles(currentUserRole);
                  }

                  return true;
                })
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>

            <input
              value={createForm.pays}
              onChange={(event) => updateCreateForm("pays", event.target.value)}
              className={inputClassName}
              placeholder="Pays membre"
            />

            <input
              type="number"
              min="0"
              max="99"
              value={createForm.numero_maillot}
              onChange={(event) =>
                updateCreateForm("numero_maillot", event.target.value)
              }
              className={inputClassName}
              placeholder="N° maillot"
            />

            <input
              value={createForm.player_name}
              onChange={(event) =>
                updateCreateForm("player_name", event.target.value)
              }
              className={inputClassName}
              placeholder="Nom joueur"
            />

            <input
              value={createForm.ea_name}
              onChange={(event) =>
                updateCreateForm("ea_name", event.target.value)
              }
              className={inputClassName}
              placeholder="Pseudo EA FC"
            />

            <select
              value={createForm.platform}
              onChange={(event) =>
                updateCreateForm("platform", event.target.value)
              }
              className={`${inputClassName} lg:col-span-2`}
            >
              <option value="PC">PC</option>
              <option value="PS5">PS5</option>
              <option value="Xbox Series">Xbox Series</option>
              <option value="Switch">Switch</option>
            </select>

            <button
              type="button"
              disabled={creating}
              onClick={createMember}
              className="rounded-xl bg-[#C99B4B] px-5 py-3 font-black text-[#0B1B31] shadow-lg shadow-black/20 transition hover:bg-[#D8C79F] disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-2"
            >
              {creating ? "Création..." : "Créer le membre"}
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-[#C99B4B]/30 bg-[#10223C]/95 p-6 shadow-2xl shadow-black/40">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#F1E9D2]">
                Membres existants
              </h2>

              <p className="mt-2 text-sm text-[#F1E9D2]/60">
                Recherche, filtre et modification rapide.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={inputClassName}
                placeholder="Rechercher..."
              />

              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value as RoleFilter)
                }
                className={inputClassName}
              >
                <option value="all">Tous les rôles</option>

                {roleOptions
                  .filter((option) => {
                    if (option.value === "owner") {
                      return canManageRoles(currentUserRole);
                    }

                    return true;
                  })
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[#C99B4B]/25 bg-black/25 p-6 text-[#F1E9D2]/60">
              Chargement des membres...
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#C99B4B]/25 bg-black/25">
              <div className="max-h-[620px] overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[23%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[18%]" />
                    <col className="w-[9%]" />
                    <col className="w-[9%]" />
                    <col className="w-[19%]" />
                  </colgroup>

                  <thead className="sticky top-0 z-10 bg-[#10223C] text-[10px] uppercase tracking-[0.18em] text-[#D8C79F]">
                    <tr>
                      <th className="border-b border-[#C99B4B]/30 px-4 py-3">
                        Membre
                      </th>
                      <th className="border-b border-[#C99B4B]/30 px-4 py-3">
                        Rôle
                      </th>
                      <th className="border-b border-[#C99B4B]/30 px-4 py-3">
                        Pays / N°
                      </th>
                      <th className="border-b border-[#C99B4B]/30 px-4 py-3">
                        Joueur
                      </th>
                      <th className="border-b border-[#C99B4B]/30 px-4 py-3">
                        Plateforme
                      </th>
                      <th className="border-b border-[#C99B4B]/30 px-4 py-3 text-center">
                        Inscriptions
                      </th>
                      <th className="border-b border-[#C99B4B]/30 px-4 py-3 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-[#F1E9D2]/55"
                        >
                          Aucun membre trouvé.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => {
                        const isEditing = editingMemberId === member.id;
                        const form =
                          editForms[member.id] ?? memberToForm(member);
                        const isSaving = savingMemberId === member.id;

                        return (
                          <tr
                            key={member.id}
                            className="border-b border-[#C99B4B]/15 align-middle transition hover:bg-[#C99B4B]/5"
                          >
                            <td className="px-4 py-4">
                              <p className="font-black text-[#F1E9D2]">
                                {member.username || "Sans pseudo"}
                              </p>
                              <p className="mt-1 truncate text-xs text-[#F1E9D2]/45">
                                {member.email || "Email inconnu"}
                              </p>

                              {member.is_disabled && (
                                <span className="mt-2 inline-flex rounded-full border border-red-400/40 bg-red-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-red-300">
                                  Désactivé
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {isEditing ? (
                                <select
                                  value={form.role}
                                  onChange={(event) =>
                                    updateEditForm(
                                      member.id,
                                      "role",
                                      event.target.value as AppRole
                                    )
                                  }
                                  className="w-full rounded-lg border border-[#C99B4B]/30 bg-[#0B1B31] px-3 py-2 text-[#F1E9D2]"
                                >
                                  {roleOptions
                                    .filter((option) => {
                                      if (option.value === "owner") {
                                        return canManageRoles(currentUserRole);
                                      }

                                      return true;
                                    })
                                    .map((option) => (
                                      <option
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </option>
                                    ))}
                                </select>
                              ) : (
                                <span
                                  className={
                                    normalizeRole(member.role) !== "member"
                                      ? "rounded-full border border-[#C99B4B]/40 bg-[#C99B4B]/15 px-3 py-1 text-xs font-black uppercase text-[#D8C79F]"
                                      : "rounded-full border border-[#F1E9D2]/25 bg-[#F1E9D2]/10 px-3 py-1 text-xs font-black uppercase text-[#F1E9D2]"
                                  }
                                >
                                  {roleLabels[normalizeRole(member.role)]}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {isEditing ? (
                                <div className="grid gap-2">
                                  <input
                                    value={form.pays}
                                    onChange={(event) =>
                                      updateEditForm(
                                        member.id,
                                        "pays",
                                        event.target.value
                                      )
                                    }
                                    className="rounded-lg border border-[#C99B4B]/30 bg-[#0B1B31] px-3 py-2 text-[#F1E9D2]"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={form.numero_maillot}
                                    onChange={(event) =>
                                      updateEditForm(
                                        member.id,
                                        "numero_maillot",
                                        event.target.value
                                      )
                                    }
                                    className="rounded-lg border border-[#C99B4B]/30 bg-[#0B1B31] px-3 py-2 text-[#F1E9D2]"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <p className="font-bold text-[#F1E9D2]">
                                    {member.pays || "France"}
                                  </p>
                                  <p className="text-xs text-[#F1E9D2]/45">
                                    N° {member.numero_maillot ?? 0}
                                  </p>
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {isEditing ? (
                                <div className="grid gap-2">
                                  <input
                                    value={form.username}
                                    onChange={(event) =>
                                      updateEditForm(
                                        member.id,
                                        "username",
                                        event.target.value
                                      )
                                    }
                                    className="rounded-lg border border-[#C99B4B]/30 bg-[#0B1B31] px-3 py-2 text-[#F1E9D2]"
                                    placeholder="Pseudo membre"
                                  />
                                  <input
                                    value={form.player_name}
                                    onChange={(event) =>
                                      updateEditForm(
                                        member.id,
                                        "player_name",
                                        event.target.value
                                      )
                                    }
                                    className="rounded-lg border border-[#C99B4B]/30 bg-[#0B1B31] px-3 py-2 text-[#F1E9D2]"
                                    placeholder="Nom joueur"
                                  />
                                  <input
                                    value={form.ea_name}
                                    onChange={(event) =>
                                      updateEditForm(
                                        member.id,
                                        "ea_name",
                                        event.target.value
                                      )
                                    }
                                    className="rounded-lg border border-[#C99B4B]/30 bg-[#0B1B31] px-3 py-2 text-[#F1E9D2]"
                                    placeholder="Pseudo EA FC"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <p className="font-bold text-[#F1E9D2]">
                                    {member.player?.name || "Aucun joueur"}
                                  </p>
                                  <p className="text-xs text-[#F1E9D2]/45">
                                    EA :{" "}
                                    {member.player?.ea_name || "Non renseigné"}
                                  </p>
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {isEditing ? (
                                <select
                                  value={form.platform}
                                  onChange={(event) =>
                                    updateEditForm(
                                      member.id,
                                      "platform",
                                      event.target.value
                                    )
                                  }
                                  className="w-full rounded-lg border border-[#C99B4B]/30 bg-[#0B1B31] px-3 py-2 text-[#F1E9D2]"
                                >
                                  <option value="PC">PC</option>
                                  <option value="PS5">PS5</option>
                                  <option value="Xbox Series">Xbox Series</option>
                                  <option value="Switch">Switch</option>
                                </select>
                              ) : (
                                <span className="font-black text-[#F1E9D2]">
                                  {member.player?.platform || "PC"}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[#C99B4B]/35 bg-black/40 px-2 text-sm font-black text-[#D8C79F] shadow-inner shadow-black/30">
                                {member.registrations_count}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-right">
                              {isEditing ? (
                                <div className="flex flex-col gap-2">
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => saveMember(member)}
                                    className="rounded-lg bg-[#C99B4B] px-4 py-2 text-xs font-black text-[#0B1B31] transition hover:bg-[#D8C79F] disabled:opacity-60"
                                  >
                                    {isSaving ? "..." : "Enregistrer"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setEditingMemberId(null)}
                                    className="rounded-lg border border-[#C99B4B]/30 px-4 py-2 text-xs font-black text-[#D8C79F] transition hover:bg-[#C99B4B]/10"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              ) : (
                                <div className="relative flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditModalMemberId(member.id);
                                      setOpenActionsMemberId(null);
                                    }}
                                    className="rounded-lg border border-[#C99B4B]/35 bg-black/20 px-3 py-2 text-xs font-black text-[#D8C79F] transition hover:border-[#D8C79F]/60 hover:bg-[#C99B4B]/10"
                                  >
                                    Modifier
                                  </button>

                                  <button
                                    type="button"
                                    aria-label="Actions sensibles"
                                    title="Actions sensibles"
                                    onClick={() =>
                                      setOpenActionsMemberId(
                                        openActionsMemberId === member.id
                                          ? null
                                          : member.id
                                      )
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C99B4B]/35 bg-black/30 text-base font-black leading-none text-[#D8C79F] transition hover:border-[#D8C79F]/60 hover:bg-[#C99B4B]/10"
                                  >
                                    ⋯
                                  </button>

                                  {openActionsMemberId === member.id && (
                                    <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-[#C99B4B]/30 bg-[#0B1B31] p-2 shadow-2xl shadow-black/70">
                                      <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#F1E9D2]/45">
                                        Actions sensibles
                                      </p>

                                      {member.is_disabled ? (
                                        <button
                                          type="button"
                                          disabled={actionMemberId === member.id}
                                          onClick={() => enableMember(member)}
                                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-black text-green-300 transition hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          <span>
                                            {actionMemberId === member.id
                                              ? "Action..."
                                              : "Réactiver"}
                                          </span>
                                          <span className="text-green-300/50">
                                            ↻
                                          </span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={actionMemberId === member.id}
                                          onClick={() => disableMember(member)}
                                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-black text-orange-300 transition hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          <span>
                                            {actionMemberId === member.id
                                              ? "Action..."
                                              : "Désactiver"}
                                          </span>
                                          <span className="text-orange-300/50">
                                            ⏸
                                          </span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        disabled={actionMemberId === member.id}
                                        onClick={() =>
                                          resetMemberPassword(member)
                                        }
                                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-black text-[#D8C79F] transition hover:bg-[#C99B4B]/10 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <span>Réinitialiser MDP</span>
                                        <span className="text-[#D8C79F]/50">
                                          🔑
                                        </span>
                                      </button>

                                      <div className="my-2 border-t border-[#C99B4B]/20" />

                                      <button
                                        type="button"
                                        disabled={actionMemberId === member.id}
                                        onClick={() => deleteMember(member)}
                                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-black text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <span>Supprimer</span>
                                        <span className="text-red-300/50">
                                          ✕
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </section>

      {editModalMember &&
        (() => {
          const form =
            editForms[editModalMember.id] ?? memberToForm(editModalMember);
          const isSaving = savingMemberId === editModalMember.id;

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm">
              <section className="w-full max-w-4xl rounded-[28px] border border-[#C99B4B]/40 bg-[#10223C] p-6 shadow-2xl shadow-black/70">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#C99B4B]">
                      Modification membre
                    </p>

                    <h2 className="mt-3 text-3xl font-black text-[#F1E9D2]">
                      {editModalMember.username || editModalMember.email}
                    </h2>

                    <p className="mt-2 text-sm text-[#F1E9D2]/55">
                      {editModalMember.email || "Email inconnu"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditModalMemberId(null)}
                    className="rounded-xl border border-[#C99B4B]/35 px-4 py-2 text-sm font-black text-[#D8C79F] transition hover:bg-[#C99B4B]/10"
                  >
                    Fermer
                  </button>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[#C99B4B]/25 bg-black/25 p-5">
                    <h3 className="mb-4 text-lg font-black text-[#F1E9D2]">
                      Profil membre
                    </h3>

                    <div className="grid gap-4">
                      <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#F1E9D2]/60">
                          Pseudo membre
                        </span>

                        <input
                          value={form.username}
                          onChange={(event) =>
                            updateEditForm(
                              editModalMember.id,
                              "username",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-[#C99B4B]/30 bg-[#0B1B31] px-4 py-3 text-[#F1E9D2] outline-none transition focus:border-[#D8C79F]"
                          placeholder="Pseudo membre"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#F1E9D2]/60">
                          Rôle
                        </span>

                        <select
                          value={form.role}
                          onChange={(event) =>
                            updateEditForm(
                              editModalMember.id,
                              "role",
                              event.target.value as AppRole
                            )
                          }
                          className="w-full rounded-xl border border-[#C99B4B]/30 bg-[#0B1B31] px-4 py-3 text-[#F1E9D2] outline-none transition focus:border-[#D8C79F]"
                        >
                          {roleOptions
                            .filter((option) => {
                              if (option.value === "owner") {
                                return canManageRoles(currentUserRole);
                              }

                              return true;
                            })
                            .map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                        </select>
                      </label>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#F1E9D2]/60">
                            Pays membre
                          </span>

                          <input
                            value={form.pays}
                            onChange={(event) =>
                              updateEditForm(
                                editModalMember.id,
                                "pays",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-[#C99B4B]/30 bg-[#0B1B31] px-4 py-3 text-[#F1E9D2] outline-none transition focus:border-[#D8C79F]"
                            placeholder="France"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#F1E9D2]/60">
                            Numéro de maillot
                          </span>

                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={form.numero_maillot}
                            onChange={(event) =>
                              updateEditForm(
                                editModalMember.id,
                                "numero_maillot",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-[#C99B4B]/30 bg-[#0B1B31] px-4 py-3 text-[#F1E9D2] outline-none transition focus:border-[#D8C79F]"
                            placeholder="0"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#C99B4B]/25 bg-black/25 p-5">
                    <h3 className="mb-4 text-lg font-black text-[#F1E9D2]">
                      Fiche joueur
                    </h3>

                    <div className="grid gap-4">
                      <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#F1E9D2]/60">
                          Nom joueur
                        </span>

                        <input
                          value={form.player_name}
                          onChange={(event) =>
                            updateEditForm(
                              editModalMember.id,
                              "player_name",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-[#C99B4B]/30 bg-[#0B1B31] px-4 py-3 text-[#F1E9D2] outline-none transition focus:border-[#D8C79F]"
                          placeholder="Nom joueur"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#F1E9D2]/60">
                          Pseudo EA FC
                        </span>

                        <input
                          value={form.ea_name}
                          onChange={(event) =>
                            updateEditForm(
                              editModalMember.id,
                              "ea_name",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-[#C99B4B]/30 bg-[#0B1B31] px-4 py-3 text-[#F1E9D2] outline-none transition focus:border-[#D8C79F]"
                          placeholder="Pseudo EA FC"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#F1E9D2]/60">
                          Plateforme
                        </span>

                        <select
                          value={form.platform}
                          onChange={(event) =>
                            updateEditForm(
                              editModalMember.id,
                              "platform",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-[#C99B4B]/30 bg-[#0B1B31] px-4 py-3 text-[#F1E9D2] outline-none transition focus:border-[#D8C79F]"
                        >
                          <option value="PC">PC</option>
                          <option value="PS5">PS5</option>
                          <option value="Xbox Series">Xbox Series</option>
                          <option value="Switch">Switch</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#C99B4B]/20 pt-5">
                  <button
                    type="button"
                    onClick={() => setEditModalMemberId(null)}
                    className="rounded-xl border border-[#C99B4B]/35 px-5 py-3 text-sm font-black text-[#D8C79F] transition hover:bg-[#C99B4B]/10"
                  >
                    Annuler
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => saveMember(editModalMember)}
                    className="rounded-xl bg-[#C99B4B] px-5 py-3 text-sm font-black text-[#0B1B31] shadow-lg shadow-black/20 transition hover:bg-[#D8C79F] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving
                      ? "Enregistrement..."
                      : "Enregistrer les modifications"}
                  </button>
                </div>
              </section>
            </div>
          );
        })()}
    </main>
  );
}