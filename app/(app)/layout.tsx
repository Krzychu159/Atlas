import type { ReactNode } from "react";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { CurrentUserProvider } from "@/app/components/current-user-provider";
import { getOrganizationIcons, getOrganizationTheme } from "@/app/lib/organization-theme";
import { normalizeUser, type CurrentUser } from "@/app/lib/auth/user";
import {
  verifyBackendSession,
  VERIFIED_USER_HEADER,
  isValidAppRole,
} from "@/app/lib/server/session";

// Uses only the proxy-verified header; without it the default ATLAS icon stays.
export async function generateMetadata(): Promise<Metadata> {
  const forwardedUser = (await headers()).get(VERIFIED_USER_HEADER);
  if (!forwardedUser) return {};
  try {
    const user = normalizeUser(JSON.parse(decodeURIComponent(forwardedUser)));
    return { icons: getOrganizationIcons(getOrganizationTheme(user)) };
  } catch {
    return {};
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const accessToken = cookieStore.get("accessToken")?.value;
  const currentPath = headerStore.get("x-atlas-current-path");
  const nextQuery = currentPath ? `&next=${encodeURIComponent(currentPath)}` : "";

  if (!accessToken) {
    redirect(currentPath ? `/login?next=${encodeURIComponent(currentPath)}` : "/login");
  }

  // proxy.ts overwrites this header after verification on every protected request.
  // Fallback verification covers rendering without the protected-route proxy.
  const forwardedUser = headerStore.get(VERIFIED_USER_HEADER);
  let user: CurrentUser | null;
  try {
    user = forwardedUser ? normalizeUser(JSON.parse(decodeURIComponent(forwardedUser))) : null;
  } catch {
    user = null;
  }
  if (!user) {
    const session = await verifyBackendSession(accessToken);
    if (session.state === "unavailable") {
      return <main className="p-8"><h1>Nie możemy teraz potwierdzić dostępu</h1><p>Spróbuj ponownie za chwilę.</p></main>;
    }
    if (session.state !== "authenticated") redirect(`/logout?reason=session-expired${nextQuery}`);
    user = session.user;
  }
  if (user.role === "super-admin") redirect("/super-admin");
  if (!isValidAppRole(user.role)) redirect("/login");
  const pathRole = currentPath?.split(/[/?]/)[1];
  if (!pathRole || pathRole !== user.role) redirect(`/${user.role}`);
  return <CurrentUserProvider key={JSON.stringify([user.id, user.role, user.organizationId])} initialUser={user}><AppShell role={user.role} theme={getOrganizationTheme(user)}>{children}</AppShell></CurrentUserProvider>;
}
