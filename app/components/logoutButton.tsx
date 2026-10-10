"use client";

import { clearBackendRequests, clearClientSession } from "@/app/lib/backend";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    clearBackendRequests();
    await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    }).catch(() => undefined);
    clearClientSession();

    router.replace("/login");
    router.refresh();
  }

  return <button onClick={handleLogout}>Wyloguj się</button>;
}
