"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, Dumbbell, CircleUserRound, Bell, LogOut, Settings } from "lucide-react";
import { getUnreadNotificationCount, NOTIFICATIONS_CHANGED_EVENT } from "@/app/lib/notifications";
import { SidebarNav } from "@/app/components/sidebar-nav";
import { Header } from "@/app/components/header";
import { navigationByRole, type AppRole } from "@/app/components/navigation";
import {
  CURRENT_USER_CHANGED_EVENT,
  getCurrentUser,
  type CurrentUser,
} from "@/app/lib/auth/current-user";

type AppShellProps = {
  children: ReactNode;
  role: AppRole;
};

function getRoleSubtitle(role: AppRole) {
  switch (role) {
    case "owner":
      return "Studio Management";
    case "trainer":
      return "Trainer Panel";
    case "client":
      return "Client Portal";
    default:
      return "Atlas";
  }
}

export function AppShell({ children, role }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const subtitle = getRoleSubtitle(role);
  const navItems = navigationByRole[role];
  const [unreadCount, setUnreadCount] = useState(0);
  const drawerRef = useRef<HTMLElement>(null);
  const settingsHref = `/${role}/settings`;

  useEffect(() => {
    let active = true;
    const refreshUnreadCount = () => {
      getUnreadNotificationCount()
        .then(data => { if (active) setUnreadCount(data.unreadCount); })
        .catch(() => { if (active) setUnreadCount(0); });
    };
    refreshUnreadCount();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshUnreadCount);
    return () => {
      active = false;
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshUnreadCount);
    };
  }, [role]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
      previousFocus?.focus();
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let active = true;

    const refreshUser = () => {
      getCurrentUser()
        .then((data) => {
          if (active) setUser(data);
        })
        .catch(() => {
          if (active) setUser(null);
        });
    };

    refreshUser();
    window.addEventListener(CURRENT_USER_CHANGED_EVENT, refreshUser);

    return () => {
      active = false;
      window.removeEventListener(CURRENT_USER_CHANGED_EVENT, refreshUser);
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <div className="min-h-screen md:grid md:grid-cols-[280px_1fr]">
        <aside
          id="mobile-navigation"
          ref={drawerRef}
          role="dialog"
          aria-label="Menu nawigacji"
          aria-modal={mobileMenuOpen || undefined}
          aria-hidden={!mobileMenuOpen}
          inert={!mobileMenuOpen}
          onKeyDown={event => {
            if (event.key === "Escape") setMobileMenuOpen(false);
            if (event.key !== "Tab") return;
            const controls = drawerRef.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)");
            if (!controls?.length) return;
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault(); last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault(); first.focus();
            }
          }}
          className={[
            "fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] max-w-[calc(100%-1rem)] flex-col bg-surface-container-low p-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-300 md:hidden",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="rounded bg-primary p-3 text-on-primary">
                <Dumbbell className="h-6 w-6" />
              </div>
              <div className="flex flex-col justify-between">
                <h1 className="font-display text-headline-sm font-bold leading-tight tracking-widest text-primary-light">
                  Atlas
                </h1>
                <p className="text-label text-on-surface-muted">{subtitle}</p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Zamknij menu"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-default bg-surface-container text-on-surface transition hover:bg-surface-container-high"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNav
              items={navItems.filter(item => item.href !== settingsHref)}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </div>

          <div className="shrink-0 pt-3">
            <Link href={settingsHref} onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-on-surface-variant hover:bg-surface-container">
              <Settings size={20} /> Profil i ustawienia
            </Link>
            <Link href="/logout" prefetch={false} onClick={() => setMobileMenuOpen(false)} className="mb-2 flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-on-surface-variant hover:bg-surface-container">
              <LogOut size={20} /> Wyloguj się
            </Link>
            <div className="rounded-xl bg-surface-container p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <MobileUserAvatar user={user} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-on-surface">
                    {user?.fullName || "Użytkownik"}
                  </p>
                  <p className="truncate text-xs text-on-surface-muted">
                    {getRoleSubtitle(role)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <aside className="hidden md:block">
          <div className="sticky top-0 flex h-screen flex-col bg-surface-container-low px-4 py-4">
            <div className="mb-10 mt-4 flex items-center gap-3 pt-2">
              <div className="rounded bg-primary p-3 text-on-primary">
                <Dumbbell className="h-6 w-6" />
              </div>
              <div className="flex flex-col justify-between">
                <h1 className="font-display text-2xl font-bold leading-tight tracking-widest text-primary-light">
                  Atlas
                </h1>
                <p className="text-label text-on-surface-muted">{subtitle}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNav items={navItems} />
            </div>

            <div className="px-3 pb-2 pt-6">
              <div className="rounded-xl bg-surface-container p-4 shadow-soft">
                <p className="text-label text-on-surface-muted">Status</p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  System w budowie
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 mb-3 flex max-w-full items-center justify-between gap-2 bg-surface-container-low px-3 py-2 md:hidden">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Zamknij menu" : "Otwórz menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-default text-primary-light transition hover:bg-surface-container-high"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-7 w-7" />
                )}
              </button>
              <p className="text-2xl font-bold uppercase tracking-widest text-primary-light">
                Atlas
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link href={`/${role}/notifications`} aria-label={unreadCount > 0 ? `Powiadomienia, nieprzeczytane: ${unreadCount}` : "Powiadomienia"} className="relative flex h-11 w-11 items-center justify-center rounded-full text-primary-light hover:bg-surface-container-high">
                <Bell size={21} />
                {unreadCount > 0 && <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-tertiary-light px-1 text-[0.625rem] font-bold text-on-tertiary">{unreadCount > 99 ? "99+" : unreadCount}</span>}
              </Link>
              <Link href={settingsHref} aria-label="Profil i ustawienia" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-container-high">
                <MobileUserAvatar user={user} />
              </Link>
            </div>
          </header>

          <div className="hidden px-4 md:block md:px-8">
            <Header role={role} unreadNotificationCount={unreadCount} onUnreadCountChange={setUnreadCount} />
          </div>

          <main className="min-w-0 bg-surface px-4 pb-6 pt-4 md:px-8 md:pb-8 md:pt-0">
            {children}
          </main>
        </div>
      </div>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Zamknij menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}
    </div>
  );
}

function MobileUserAvatar({ user }: { user: CurrentUser | null }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container text-primary-light">
      {user?.avatarUrl ? (
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${user.avatarUrl})` }}
          aria-label={user.fullName}
        />
      ) : (
        <CircleUserRound width={28} height={28} />
      )}
    </div>
  );
}
