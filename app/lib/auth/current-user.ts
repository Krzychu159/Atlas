import { backendFetch } from "../backend";

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl: string | null;
};

type AuthMeResponse = Partial<CurrentUser> & {
  userId?: string | number;
  firstName?: string | null;
  lastName?: string | null;
  user?: Partial<CurrentUser> & {
    userId?: string | number;
    firstName?: string | null;
    lastName?: string | null;
  };
};

export async function getCurrentUser() {
  try {
    const backendUser = await backendFetch<AuthMeResponse>("Auth/me");
    return normalizeUser(backendUser);
  } catch {
    const response = await fetch("/api/auth/me", { cache: "no-store" });

    if (!response.ok) throw new Error("Nie udało się pobrać profilu.");

    const localUser = (await response.json()) as AuthMeResponse;
    return normalizeUser(localUser);
  }
}

function normalizeUser(data: AuthMeResponse): CurrentUser {
  const source = data.user ?? data;
  const firstName = source.firstName || "";
  const lastName = source.lastName || "";
  const fullName =
    source.fullName ||
    `${firstName} ${lastName}`.trim() ||
    source.email ||
    `Użytkownik ${source.userId || source.id || ""}`.trim();

  return {
    id: String(source.id || source.userId || ""),
    fullName,
    email: source.email || "Brak e-maila",
    role: source.role || "user",
    avatarUrl: source.avatarUrl || null,
  };
}
