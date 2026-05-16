import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import {
  isBackendSessionValid,
  isValidAppRole,
} from "@/app/lib/server/session";

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

  if (!isValidAppRole(rawRole)) {
    redirect("/login");
  }

  const sessionValid = await isBackendSessionValid(accessToken);

  if (!sessionValid) {
    redirect(`/logout?reason=session-expired${nextQuery}`);
  }

  return <AppShell role={rawRole}>{children}</AppShell>;
}
