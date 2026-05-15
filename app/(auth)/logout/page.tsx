"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";

function getLogoutCopy(reason: string) {
  if (reason === "session-expired") {
    return {
      eyebrow: "Sesja wygasła",
      title: "Odświeżamy dostęp",
      description:
        "Czyścimy nieaktualne dane logowania. Za chwilę wrócisz do ekranu logowania.",
      icon: <ShieldAlert size={22} />,
    };
  }

  return {
    eyebrow: "Atlas",
    title: "Wylogowywanie",
    description:
      "Kończymy bieżącą sesję i zabezpieczamy dostęp do panelu.",
    icon: <LogOut size={22} />,
  };
}

export default function LogoutPage() {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const copy = getLogoutCopy(reason);

  useEffect(() => {
    let cancelled = false;

    async function logout() {
      const params = new URLSearchParams(window.location.search);
      const logoutReason = params.get("reason") || "";
      const nextPath = params.get("next");
      const loginParams = new URLSearchParams();

      if (logoutReason) {
        loginParams.set("reason", logoutReason);
        setReason(logoutReason);
      }

      if (nextPath) {
        loginParams.set("next", nextPath);
      }

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
        });
      } catch (error) {
        console.error("Logout error:", error);
      } finally {
        if (!cancelled) {
          const query = loginParams.toString();
          router.replace(query ? `/login?${query}` : "/login");
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 text-on-surface">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(183,196,255,0.16),transparent_34%)]" />
      <div className="pointer-events-none absolute bottom-[-120px] left-[-80px] h-[360px] w-[360px] bg-[radial-gradient(circle,rgba(0,118,51,0.14),transparent_62%)]" />

      <section className="relative w-full max-w-[430px] overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container p-8 shadow-ambient">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-light/50 to-transparent" />

        <div className="flex items-start gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container-low text-primary-light">
            <Loader2 className="absolute h-14 w-14 animate-spin rounded-[var(--radius-lg)] p-3 text-primary-light/30" />
            {copy.icon}
          </div>

          <div className="min-w-0">
            <p className="text-label text-primary-light">{copy.eyebrow}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-none">
              {copy.title}
            </h1>
            <p className="mt-4 text-sm leading-6 text-on-surface-variant">
              {copy.description}
            </p>
          </div>
        </div>

        <div className="mt-8 h-2 overflow-hidden rounded-full bg-surface-container-low">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-primary-gradient" />
        </div>
      </section>
    </div>
  );
}
