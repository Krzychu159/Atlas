import type { ReactNode } from "react";
import { SidebarNav } from "@/app/components/sidebar-nav";
import { Dumbbell } from "lucide-react";
import { Header } from "../components/header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="flex flex-col bg-surface-container-low px-4 py-4">
          <div className="mb-10 mt-4 px-3 pt-2 flex items-center gap-3">
            <div className="bg-primary p-3 rounded">
              <Dumbbell className="h-6 w-6 " />
            </div>
            <div className="flex flex-col justify-between">
              <h1 className="font-display text-headline-sm leading-tight text-on-surface">
                Atlas CRM
              </h1>
              <p className="text-label text-on-surface-muted">
                Studio Managment
              </p>
            </div>
          </div>

          <SidebarNav />

          <div className="mt-auto px-3 pb-2 pt-6">
            <div className="rounded-xl bg-surface-container p-4 shadow-soft">
              <p className="text-label text-on-surface-muted">Status</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                System w budowie
              </p>
            </div>
          </div>
        </aside>

        <div>
          <Header />
          <main className="min-w-0 bg-surface px-8 pb-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
