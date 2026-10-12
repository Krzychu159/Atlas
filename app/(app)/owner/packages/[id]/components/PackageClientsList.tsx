"use client";

import { useState } from "react";
import type { PackageClient } from "@/app/lib/owner/packages";
import { userStatus } from "@/app/lib/user-messages";
import { Button } from "@/app/components/ui/button";

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "K";
}

export default function PackageClientsList({ clients, packageId }: { clients: PackageClient[]; packageId: number }) {
  const [showAll, setShowAll] = useState(false);
  const visibleClients = showAll ? clients : clients.slice(0, 3);

  return (
    <section className="card-shell min-w-0 p-5 sm:p-6">
      <h2 className="text-section-title">Przypisani klienci</h2>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">Klienci korzystający z tego pakietu.</p>
      <div className="mt-6 flex flex-col gap-3">
        {visibleClients.length ? visibleClients.map(client => {
          const name = client.fullName || "Klient bez nazwy";
          const matchesPackage = client.activePackageId === packageId;
          const used = matchesPackage ? client.activePackageUsedSessions : null;
          const total = matchesPackage ? client.activePackageTotalSessions : null;
          const knownUsage = typeof used === "number" && Number.isFinite(used) && used >= 0 && typeof total === "number" && Number.isFinite(total) && total > 0;
          const progress = knownUsage ? Math.max(0, Math.min(100, (used / total) * 100)) : null;
          return (
            <article key={client.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-4 rounded-[var(--radius-lg)] bg-surface-container-low p-4 2xl:grid-cols-[minmax(0,1fr)_minmax(160px,210px)_auto]">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-semibold text-primary-light">
                  {client.avatarUrl ? <img src={client.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(name)}
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{name}</p>
                  {client.email ? <p className="mt-1 break-all text-xs text-on-surface-muted">{client.email}</p> : null}
                </div>
              </div>
              <div className="col-span-2 min-w-0 border-t border-white/5 pt-3 2xl:col-span-1 2xl:col-start-2 2xl:row-start-1 2xl:border-0 2xl:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-on-surface-muted">Wykorzystane wejścia</span>
                  <span className={knownUsage ? "font-semibold text-primary-light" : "text-on-surface-muted"}>{knownUsage ? `${used}/${total}` : "Brak danych"}</span>
                </div>
                {progress !== null ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-lowest"><div className="h-full rounded-full bg-primary-light" style={{ width: `${progress}%` }} /></div> : null}
              </div>
              <span className="col-start-2 row-start-1 rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-medium text-on-surface-variant 2xl:col-start-3">{client.status === "active" ? "Aktywny" : client.status === "suspended" ? "Wstrzymany" : client.status === "new" ? "Nowy" : userStatus(client.status)}</span>
            </article>
          );
        }) : <p className="rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">Brak klientów przypisanych do tego pakietu.</p>}
      </div>
      {clients.length > 3 ? <Button type="button" variant="secondary" className="mt-5 w-full" onClick={() => setShowAll(value => !value)}>{showAll ? "Pokaż mniej" : `Pokaż wszystkich (${clients.length})`}</Button> : null}
    </section>
  );
}
