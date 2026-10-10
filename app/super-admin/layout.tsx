import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { CurrentUserProvider } from "@/app/components/current-user-provider";
import { SuperAdminShell } from "./components/super-admin-shell";
import { normalizeUser, type CurrentUser } from "@/app/lib/auth/user";
import { verifyBackendSession, VERIFIED_USER_HEADER } from "@/app/lib/server/session";

const geist = Geist({ subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-super-admin-mono" });

export const metadata: Metadata = { title: "Administracja platformy | ATLAS" };

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const accessToken = cookieStore.get("accessToken")?.value;
  const currentPath = headerStore.get("x-atlas-current-path") || "/super-admin";
  if (!accessToken) redirect(`/login?next=${encodeURIComponent(currentPath)}`);

  // The protected-route proxy replaces the browser header after /Auth/me verification.
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
      return (
        <main className="min-h-dvh bg-[#121416] p-8 text-on-surface">
          <h1 className="text-xl font-semibold">Nie możemy teraz potwierdzić dostępu</h1>
          <p className="mt-3 text-on-surface-variant">Spróbuj ponownie za chwilę.</p>
          <a href="/super-admin" className="mt-6 inline-block text-primary-light">Spróbuj ponownie</a>
        </main>
      );
    }
    if (session.state !== "authenticated") {
      redirect(`/logout?reason=session-expired&next=${encodeURIComponent(currentPath)}`);
    }
    user = session.user;
  }
  if (!user.roles.includes("super-admin")) redirect(`/${user.role}`);

  return (
    <div lang="pl" className={`${geist.className} ${geistMono.variable}`}>
      <CurrentUserProvider key={`${user.id}:${user.role}`} initialUser={user}>
        <SuperAdminShell>{children}</SuperAdminShell>
      </CurrentUserProvider>
    </div>
  );
}
