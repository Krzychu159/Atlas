export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
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
  const role = text(source.role).toLowerCase();
  if ((typeof id !== "string" && typeof id !== "number") || !String(id).trim() || !["owner", "trainer", "client"].includes(role)) {
    throw new Error("Nie udało się potwierdzić profilu.");
  }
  return {
    id: String(id), firstName, lastName, role,
    fullName: text(source.fullName) || `${firstName} ${lastName}`.trim() || text(source.email) || "Użytkownik",
    email: text(source.email) || "Brak e-maila",
    avatarUrl: text(source.avatarUrl) || null,
  };
}
