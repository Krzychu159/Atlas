import type { ReactNode } from "react";
import { SidebarNav } from "@/app/components/sidebar-nav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="flex flex-col bg-surface-container-low px-4 py-4">
          <div className="mb-8 px-3 pt-2">
            <p className="text-label text-on-surface-muted">Atlas CRM</p>
            <h1 className="font-display text-headline-sm leading-tight text-on-surface">
              Owner Dashboard
            </h1>
          </div>

          <SidebarNav />

          <div className="mt-auto px-3 pb-2 pt-6">
            <div className="rounded-xl bg-surface-container p-4 shadow-soft">
              <p className="text-label text-on-surface-muted">Status</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                System gotowy do budowy dashboardu i auth.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 bg-surface px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
