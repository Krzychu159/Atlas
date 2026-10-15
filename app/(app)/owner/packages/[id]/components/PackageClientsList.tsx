"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import type { PackageClient } from "@/app/lib/owner/packages";
import { userStatus } from "@/app/lib/user-messages";

const PAGE_SIZE = 8;

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "K";
}

function statusLabel(status: string) {
  if (status === "active") return "Aktywny";
  if (status === "suspended") return "Wstrzymany";
  if (status === "new") return "Nowy";
  return userStatus(status);
}

export default function PackageClientsList({ clients, packageId, periodBased = false }: { clients: PackageClient[]; packageId: number; periodBased?: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const visibleClients = showAll ? clients : clients.slice(0, PAGE_SIZE);

  return (
    <section className="card-shell min-w-0 p-4 md:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-lowest text-primary-light">
          <Users size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-on-surface">Przypisani klienci</h2>
          <p className="text-xs text-on-surface-muted">{clients.length ? `Liczba klientów: ${clients.length}` : "Nikt jeszcze nie korzysta z tej oferty"}</p>
        </div>
      </div>

      {visibleClients.length ? (
        <ul className="mt-3 grid gap-1 lg:grid-cols-2 lg:gap-x-4">
          {visibleClients.map(client => {
            const name = client.fullName || "Klient bez nazwy";
            const matchesPackage = client.activePackageId === packageId;
            const used = matchesPackage ? client.activePackageUsedSessions : null;
            const total = matchesPackage ? client.activePackageTotalSessions : null;
            const knownUsage = typeof used === "number" && Number.isFinite(used) && used >= 0 && typeof total === "number" && Number.isFinite(total) && total > 0;
            const progress = knownUsage ? Math.max(0, Math.min(100, (used / total) * 100)) : null;

            return (
              <li key={client.id}>
                <Link
                  href={`/owner/clients/${client.id}`}
                  prefetch={false}
                  className="group flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 transition hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:outline-none"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-[11px] font-semibold text-primary-light">
                    {client.avatarUrl ? <img src={client.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-on-surface">{name}</span>
                    {client.email ? <span className="block truncate text-xs text-on-surface-muted">{client.email}</span> : null}
                  </span>
                  {!periodBased ? (
                    <span className="hidden w-28 shrink-0 sm:block">
                      <span className={`block text-right text-xs ${knownUsage ? "font-semibold text-on-surface" : "text-on-surface-muted"}`}>
                        {knownUsage ? `${used}/${total} wejść` : "Brak danych"}
                      </span>
                      {progress !== null ? (
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-surface-container-lowest">
                          <span className="block h-full rounded-full bg-primary-light" style={{ width: `${progress}%` }} />
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  <span className="shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                    {statusLabel(client.status)}
                  </span>
                  <ChevronRight size={15} className="shrink-0 text-on-surface-muted transition group-hover:translate-x-0.5 group-hover:text-primary-light" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-[var(--radius-md)] bg-surface-container-low px-3 py-4 text-sm text-on-surface-variant">Brak klientów przypisanych do tego pakietu.</p>
      )}

      {clients.length > PAGE_SIZE ? (
        <button type="button" onClick={() => setShowAll(value => !value)} className="mt-3 text-xs font-semibold text-primary-light hover:underline">
          {showAll ? "Pokaż mniej" : `Pokaż wszystkich (${clients.length})`}
        </button>
      ) : null}
    </section>
  );
}
