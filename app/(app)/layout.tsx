import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import type { AppRole } from "@/app/components/navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const rawRole = cookieStore.get("role")?.value;

  if (!rawRole) {
    redirect("/login");
  }

  const role = rawRole as AppRole;

  if (!["owner", "trainer", "client"].includes(role)) {
    redirect("/login");
  }

  return <AppShell role={role}>{children}</AppShell>;
}
