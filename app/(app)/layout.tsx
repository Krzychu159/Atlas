import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import type { AppRole } from "@/app/components/navigation";

const BACKEND_URL = process.env.BACKEND_API_URL;
const validRoles = ["owner", "trainer", "client"] as const;

async function isTokenAcceptedByBackend(accessToken: string) {
  if (!BACKEND_URL) return true;

  try {
    const response = await fetch(`${BACKEND_URL}/api/Auth/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const rawRole = cookieStore.get("role")?.value;
  const accessToken = cookieStore.get("accessToken")?.value;
  const userId = cookieStore.get("userId")?.value;
  const currentPath = headerStore.get("x-atlas-current-path");
  const nextQuery = currentPath ? `&next=${encodeURIComponent(currentPath)}` : "";

  if (!rawRole || !accessToken || !userId) {
    redirect(currentPath ? `/login?next=${encodeURIComponent(currentPath)}` : "/login");
  }

  const role = rawRole as AppRole;

  if (!validRoles.includes(role)) {
    redirect("/login");
  }

  const sessionValid = await isTokenAcceptedByBackend(accessToken);

  if (!sessionValid) {
    redirect(`/logout?reason=session-expired${nextQuery}`);
  }

  return <AppShell role={role}>{children}</AppShell>;
}
