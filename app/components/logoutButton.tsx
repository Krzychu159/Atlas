"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
    });

    router.replace("/login");
    router.refresh();
  }

  return <button onClick={handleLogout}>Wyloguj się</button>;
}
