import type { AppRole } from "@/app/components/navigation";

const backendUrl = process.env.BACKEND_API_URL;
const validRoles = ["owner", "trainer", "client"] as const;

export function isValidAppRole(role: string | undefined): role is AppRole {
  return Boolean(role && validRoles.includes(role as AppRole));
}

export async function isBackendSessionValid(accessToken: string) {
  if (!backendUrl) return true;

  try {
    const response = await fetch(`${backendUrl}/api/Auth/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    return response.status !== 401 && response.status !== 403;
  } catch {
    return true;
  }
}
