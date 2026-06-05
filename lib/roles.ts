export type AppRole = "owner" | "admin" | "manager" | "moderator" | "member";

export type AdminModule =
  | "admin"
  | "competitions"
  | "members"
  | "teams"
  | "gazette"
  | "scores"
  | "member_view";

export const roleLabels: Record<AppRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  moderator: "Modérateur",
  member: "Membre",
};

export const roleOptions: { value: AppRole; label: string; description: string }[] = [
  {
    value: "owner",
    label: "Owner",
    description: "Accès total, y compris gestion des rôles sensibles.",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Administration générale du site.",
  },
  {
    value: "manager",
    label: "Manager",
    description: "Gestion des teams esport et inscriptions teams.",
  },
  {
    value: "moderator",
    label: "Modérateur",
    description: "Gestion des matchs, scores et validations.",
  },
  {
    value: "member",
    label: "Membre",
    description: "Compte membre classique.",
  },
];

export function normalizeRole(role: string | null | undefined): AppRole {
  if (
    role === "owner" ||
    role === "admin" ||
    role === "manager" ||
    role === "moderator" ||
    role === "member"
  ) {
    return role;
  }

  return "member";
}

export function isAdminRole(role: string | null | undefined) {
  return canAccessAdminModule(role, "admin");
}

export function canManageRoles(role: string | null | undefined) {
  return normalizeRole(role) === "owner";
}

export function canManageMembers(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "owner" || normalizedRole === "admin";
}

export function canManageSensitiveMembers(role: string | null | undefined) {
  return canManageMembers(role);
}

export function canManageCompetitions(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "owner" || normalizedRole === "admin";
}

export function canManageTeams(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  return (
    normalizedRole === "owner" ||
    normalizedRole === "admin" ||
    normalizedRole === "manager"
  );
}

export function canManageScores(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  return (
    normalizedRole === "owner" ||
    normalizedRole === "admin" ||
    normalizedRole === "moderator"
  );
}

export function canManageGazette(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "owner" || normalizedRole === "admin";
}

export function canAccessAdminModule(
  role: string | null | undefined,
  module: AdminModule
) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "owner") return true;
  if (normalizedRole === "admin") return true;

  if (normalizedRole === "manager") {
    return module === "admin" || module === "teams";
  }

  if (normalizedRole === "moderator") {
    return module === "admin" || module === "scores";
  }

  return module === "member_view";
}
