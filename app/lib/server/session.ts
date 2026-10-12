import type { AppRole } from "@/app/components/navigation";
import { normalizeUser, parseOrganizationContext, type CurrentUser } from "@/app/lib/auth/user";

const backendUrl = process.env.BACKEND_API_URL;
const validRoles = ["owner", "trainer", "client"] as const;

export function isValidAppRole(role: string | undefined): role is AppRole {
  return Boolean(role && validRoles.includes(role as AppRole));
}

export type VerifiedSession =
  | { state: "authenticated"; user: CurrentUser }
  | { state: "unauthorized" | "forbidden" | "unavailable" };

export const VERIFIED_USER_HEADER = "x-atlas-verified-user";

export async function verifyBackendSession(accessToken: string, tokenResponse?: unknown): Promise<VerifiedSession> {
  if (!backendUrl) return { state: "unavailable" };

  try {
    const response = await fetch(`${backendUrl}/api/Auth/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });

    if (response.status === 401) return { state: "unauthorized" };
    if (response.status === 403) return { state: "forbidden" };
    if (!response.ok) return { state: "unavailable" };
    const user = normalizeUser(await response.json());
    // /me is authoritative, including explicit null. Only legacy /me may
    // use context supplied by the same backend's token response.
    const context = Object.prototype.hasOwnProperty.call(user, "organizationId")
      ? {} : parseOrganizationContext(tokenResponse);
    return { state: "authenticated", user: { ...user, ...context } };
  } catch {
    return { state: "unavailable" };
  }
}
