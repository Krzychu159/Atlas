"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CircleUserRound, LayoutDashboard, Menu, Plug, Settings, Shield, ShieldCheck, Users, X } from "lucide-react";
import { useCurrentUser } from "@/app/components/current-user-provider";
import { LogoutButton } from "@/app/components/logoutButton";

const navigation = [
  { label: "Przegląd", href: "/super-admin", icon: LayoutDashboard },
  { label: "Organizacje", href: "/super-admin/organizations", icon: Building2 },
  { label: "Użytkownicy", href: null, icon: Users },
  { label: "Integracje", href: null, icon: Plug },
  { label: "Audyt", href: null, icon: ShieldCheck },
  { label: "Ustawienia", href: null, icon: Settings },
];

export function SuperAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[#121416] text-on-surface">
      <a href="#super-admin-content" className="sr-only z-50 rounded-lg bg-[#0052FF] p-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Przejdź do treści</a>
      <header className="flex h-16 items-center justify-between bg-[#0e1012] px-5 md:hidden">
        <Link href="/super-admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 font-semibold tracking-wider">
          <Shield aria-hidden="true" className="h-8 w-8 rounded-lg bg-[#0052FF] p-1.5" />ATLAS
        </Link>
        <button type="button" aria-expanded={menuOpen} aria-controls="super-admin-navigation" aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"} onClick={() => setMenuOpen(!menuOpen)} className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 focus-visible:outline-2 focus-visible:outline-primary-light">
          {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
        </button>
      </header>

      <aside id="super-admin-navigation" className={`${menuOpen ? "flex" : "hidden"} flex-col bg-[#151719] p-4 md:fixed md:inset-y-0 md:left-0 md:flex md:w-[260px] md:overflow-y-auto`}>
        <Link href="/super-admin" className="mb-10 hidden items-center gap-3 rounded-lg px-2 py-3 focus-visible:outline-2 focus-visible:outline-primary-light md:flex">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0052FF]"><Shield aria-hidden="true" size={23} /></span>
          <span><span className="block text-2xl font-semibold tracking-wide">ATLAS</span><span className="mt-1 block text-[10px] uppercase leading-4 tracking-[0.13em] text-on-surface-variant">Administracja platformy</span></span>
        </Link>

        <nav aria-label="Panel SuperAdmina" className="space-y-1">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = href === "/super-admin" ? pathname === href : Boolean(href && (pathname === href || pathname.startsWith(`${href}/`)));
            const content = <><Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" /><span>{label}</span></>;
            return href ? (
              <Link key={label} href={href} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary-light ${active ? "bg-[#0052FF]/15 text-primary-light" : "text-on-surface-variant hover:bg-white/5 hover:text-white"}`}>
                {content}
              </Link>
            ) : (
              <button key={label} type="button" disabled className="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 text-left text-sm text-on-surface-muted">
                {content}<span className="ml-auto rounded bg-white/5 px-1.5 py-1 text-[9px] uppercase tracking-wider">Wkrótce</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-8 pt-6 md:mt-auto">
          <div className="rounded-xl bg-white/[0.035] p-3">
            <div className="flex items-center gap-3">
              <CircleUserRound aria-hidden="true" className="h-9 w-9 shrink-0 rounded-full bg-white/5 p-1.5 text-primary-light" />
              <div className="min-w-0"><p className="text-sm font-medium">SuperAdmin</p><p className="mt-1 truncate text-xs text-on-surface-variant" title={user?.fullName}>{user?.fullName}</p></div>
            </div>
            <p className="mt-3 truncate font-[family-name:var(--font-super-admin-mono)] text-[11px] text-on-surface-muted" title={user?.email}>{user?.email}</p>
            <div className="mt-3 text-xs text-on-surface-variant [&_button]:min-h-11 [&_button]:w-full [&_button]:rounded-lg [&_button]:bg-white/5 [&_button]:px-3 [&_button]:text-left [&_button:hover]:bg-white/10 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-primary-light"><LogoutButton /></div>
          </div>
        </div>
      </aside>

      <div className="md:ml-[260px]">
        <div className="hidden h-16 items-center justify-between bg-[#0e1012] px-8 md:flex">
          <p className="text-xs text-on-surface-muted">Panel platformy</p>
          <span className="flex items-center gap-2 text-xs text-on-surface-variant"><Shield size={15} aria-hidden="true" />SuperAdmin</span>
        </div>
        <main id="super-admin-content" tabIndex={-1} className="mx-auto max-w-[1440px] px-5 py-8 outline-none sm:px-8 md:py-10 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
