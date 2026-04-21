"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function logout() {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
        });
      } catch (error) {
        console.error("Logout error:", error);
      } finally {
        if (!cancelled) {
          router.replace("/login");
          router.refresh();
        }
      }
    }

    logout();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 text-on-surface">
      <div className="rounded-2xl bg-surface-container px-8 py-6 shadow-soft">
        <p className="text-label text-on-surface-muted">Atlas</p>
        <h1 className="mt-2 font-display text-2xl">Wylogowywanie...</h1>
      </div>
    </div>
  );
}
