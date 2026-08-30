import { backendGet, backendPatch } from "../backend";

export const CURRENT_USER_CHANGED_EVENT = "atlas:current-user-changed";

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
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

export type UpdateCurrentUserProfilePayload = {
  firstName: string;
  lastName: string;
  email: string;
};

export async function getCurrentUser() {
  try {
    const backendUser = await backendGet<AuthMeResponse>("Auth/me");
    return normalizeUser(backendUser);
  } catch {
    const response = await fetch("/api/auth/me", { cache: "no-store" });

    if (!response.ok) throw new Error("Nie udało się pobrać profilu.");

    const localUser = (await response.json()) as AuthMeResponse;
    return normalizeUser(localUser);
  }
}

export async function updateCurrentUserProfile(
  payload: UpdateCurrentUserProfilePayload,
) {
  const updated = await backendPatch<AuthMeResponse | null>("Auth/me", payload);
  const user = updated ? normalizeUser(updated) : await getCurrentUser();
  notifyCurrentUserChanged();
  return user;
}

export function notifyCurrentUserChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CURRENT_USER_CHANGED_EVENT));
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
    firstName,
    lastName,
    fullName,
    email: source.email || "Brak e-maila",
    role: source.role || "user",
    avatarUrl: source.avatarUrl || null,
  };
}
