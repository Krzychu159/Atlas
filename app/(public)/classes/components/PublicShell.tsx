"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { PublicActionModal, type PublicAction } from "./PublicActionModal";

type PublicUser = { userId: number | string; role: string };
type PublicContextValue = {
  user: PublicUser | null; authReady: boolean; revision: number;
  act: (action: PublicAction) => void; refresh: () => void;
};
const PublicContext = createContext<PublicContextValue | null>(null);
export function usePublicContext() {
  const value = useContext(PublicContext);
  if (!value) throw new Error("PublicShell is required");
  return value;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<PublicAction | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (active) setUser(response.ok ? data.user : null);
    }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);
  function refresh() { setRevision((value) => value + 1); }
  const role = user?.role.toLowerCase();
  const accountHref = role && ["owner", "trainer", "client"].includes(role) ? `/${role}` : "/login";
  return (
    <PublicContext.Provider value={{ user, authReady, revision, act: setAction, refresh }}>
      <div lang="pl" className="flex min-h-screen flex-col">
        <header className="mx-auto flex min-h-20 w-full max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/classes" className="flex items-center gap-2.5 text-xl font-bold tracking-tight"><span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-primary text-on-primary"><Dumbbell size={20} /></span>ATLAS</Link>
          <span className="hidden items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1 text-xs text-on-surface-variant xl:flex"><MapPin size={13} />Studio Fitness</span>
          <nav aria-label="Nawigacja publiczna" className="hidden flex-1 items-center justify-center gap-7 text-sm md:flex"><Link className="border-b border-primary-light pb-2 text-primary-light" href="/classes">Grafik</Link><PublicSectionLink section="packages">Pakiety</PublicSectionLink><PublicSectionLink section="locations">Lokalizacje</PublicSectionLink></nav>
          {user ? <Link href={accountHref} className="flex min-h-11 items-center gap-2 text-sm"><CalendarDays size={17} />Moje konto</Link> : <Button size="sm" disabled={!authReady} className="rounded-full" onClick={() => setAction({ type: "auth" })}>Zaloguj się</Button>}
        </header>
        <main className="mx-auto w-full max-w-[1140px] flex-1 px-4 pb-24 pt-8 sm:px-6 md:pt-12 lg:px-8">{children}</main>
        <footer className="bg-surface-container-lowest px-4 py-10 sm:px-6"><div className="mx-auto flex max-w-[1140px] flex-col gap-6 text-xs text-on-surface-variant sm:flex-row sm:items-center sm:justify-between"><Link href="/classes" className="text-lg font-bold text-on-surface">ATLAS <span className="text-xs font-normal">Fitness Studio</span></Link><span>ATLAS Fitness Studio</span><nav className="flex gap-6"><Link href="/classes">Grafik</Link><PublicSectionLink section="packages">Pakiety</PublicSectionLink><PublicSectionLink section="locations">Lokalizacje</PublicSectionLink></nav></div></footer>
        {action && <PublicActionModal action={action} user={user} onUser={(next) => { setUser(next); refresh(); }} onClose={() => setAction(null)} onRefresh={refresh} />}
      </div>
    </PublicContext.Provider>
  );
}

function PublicSectionLink({ section, children }: { section: "packages" | "locations"; children: React.ReactNode }) {
  const pathname = usePathname();
  return <a href={pathname === "/classes" ? `#${section}` : `/classes#${section}`}
    title={section === "packages" ? "Przejdź do pakietów na stronie grafiku" : "Przejdź do wyboru lokalizacji"}
    onClick={(event) => {
      if (pathname !== "/classes" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const target = document.getElementById(section);
      if (!target) return;
      event.preventDefault();
      const url = new URL(window.location.href);
      url.hash = section;
      window.history.replaceState(null, "", url);
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }}>{children}</a>;
}
