export type SessionRole = "super-admin" | "owner" | "trainer" | "client";

const rolePriority: SessionRole[] = ["super-admin", "owner", "trainer", "client"];

function normalizeRole(value: unknown): SessionRole | null {
  if (typeof value !== "string") return null;
  const role = value.trim().toLowerCase();
  if (role === "superadmin" || role === "super-admin") return "super-admin";
  return rolePriority.includes(role as SessionRole) ? role as SessionRole : null;
}

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: SessionRole;
  roles: SessionRole[];
  avatarUrl: string | null;
};

export function normalizeUser(data: unknown): CurrentUser {
  if (!data || typeof data !== "object") throw new Error("Nie udało się potwierdzić profilu.");
  const outer = data as Record<string, unknown>;
  const source = outer.user && typeof outer.user === "object"
    ? outer.user as Record<string, unknown> : outer;
  const text = (value: unknown) => typeof value === "string" ? value : "";
  const firstName = text(source.firstName);
  const lastName = text(source.lastName);
  const id = source.id ?? source.userId;
  // roles[] is authoritative when supplied; role supports older responses.
  const roles = Array.isArray(source.roles)
    ? [...new Set(source.roles.map(normalizeRole).filter((role): role is SessionRole => role !== null))]
    : [normalizeRole(source.role)].filter((role): role is SessionRole => role !== null);
  const legacyRole = normalizeRole(source.role);
  const role = roles.includes("super-admin") ? "super-admin"
    : legacyRole && roles.includes(legacyRole) ? legacyRole
    : rolePriority.find((candidate) => roles.includes(candidate));
  if ((typeof id !== "string" && typeof id !== "number") || !String(id).trim() || !role) {
    throw new Error("Nie udało się potwierdzić profilu.");
  }
  return {
    id: String(id), firstName, lastName, role, roles,
    fullName: text(source.fullName) || `${firstName} ${lastName}`.trim() || text(source.email) || "Użytkownik",
    email: text(source.email) || "Brak e-maila",
    avatarUrl: text(source.avatarUrl) || null,
  };
}
