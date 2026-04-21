"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Menu, X, Dumbbell, CircleUserRound } from "lucide-react";
import { SidebarNav } from "@/app/components/sidebar-nav";
import { Header } from "@/app/components/header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <div className="min-h-screen md:grid md:grid-cols-[280px_1fr]">
        {/* MOBILE */}
        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-surface-container-low p-4 transition-transform duration-300 md:hidden",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="mb-10 mt-4 flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="rounded bg-primary p-3 text-on-primary">
                <Dumbbell className="h-6 w-6" />
              </div>
              <div className="flex flex-col justify-between">
                <h1 className="font-display text-headline-sm font-bold leading-tight tracking-widest text-primary-light">
                  Atlas
                </h1>
                <p className="text-label text-on-surface-muted">
                  Studio Manage
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-default bg-surface-container text-on-surface transition hover:bg-surface-container-high"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          </div>

          <div className="px-3 pb-2 pt-6">
            <div className="rounded-xl bg-surface-container p-4 shadow-soft">
              <p className="text-label text-on-surface-muted">Status</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                System w budowie
              </p>
            </div>
          </div>
        </aside>

        {/* DESKTOP */}
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
                <p className="text-label text-on-surface-muted">
                  Studio Management
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNav />
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
          {/* MOBILE HEADER */}
          <header className="sticky top-0 z-30 mb-6 flex max-w-full items-center justify-between bg-surface-container-low px-4 py-4 md:hidden">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
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
            <CircleUserRound width={32} height={32} />
          </header>

          {/* DESKTOP HEADER */}
          <div className="hidden md:block">
            <Header />
          </div>

          <main className="min-w-0 bg-surface px-4 pb-6 pt-4 md:px-8 md:pb-8 md:pt-0">
            {children}
          </main>
        </div>
      </div>

      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}
    </div>
  );
}
