import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import type { Client } from "@/app/lib/owner/clients";

function getClientName(client: Client) {
  const name = client.fullName || `${client.firstName} ${client.lastName}`;

  return name.trim() || "Klient bez nazwy";
}

function getInitials(client: Client) {
  return getClientName(client)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TrainerProfileClients({
  clients,
}: {
  clients: Client[];
}) {
  const activeClients = clients.filter((client) => {
    if (typeof client.hasActivePackage === "boolean") return client.hasActivePackage;
    if (typeof client.isPackageActive === "boolean") return client.isPackageActive;

    return typeof client.activePackageId === "number" && client.activePackageId > 0;
  });

  return (
    <section className="card-shell p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-section-title">Aktywni klienci</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Obecnie pod opieką: {activeClients.length || clients.length} osób
          </p>
        </div>
        <Link
          href="/owner/clients"
          className="inline-flex items-center gap-2 text-label text-primary-light"
          prefetch={false}
        >
          Zobacz wszystkich
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {clients.length > 0 ? (
          clients.slice(0, 5).map((client) => {
            const fullName = getClientName(client);
            const progress = Math.max(0, Math.min(client.progressPercent ?? 0, 100));

            return (
              <Link
                key={client.id}
                href={`/owner/clients/${client.id}`}
                prefetch={false}
                className="grid grid-cols-[56px_1fr_auto] items-center gap-4 rounded-[var(--radius-lg)] bg-surface-container-low p-4 transition hover:bg-surface-container-high"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-surface-container-lowest">
                  {client.avatarUrl ? (
                    <img
                      src={client.avatarUrl}
                      alt={fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-primary-light">
                      {getInitials(client)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-on-surface">
                    {fullName}
                  </p>
                  <p className="mt-1 truncate text-xs text-on-surface-muted">
                    {client.goal || client.email || "Brak celu"}
                  </p>
                </div>

                <div className="hidden min-w-[120px] sm:block">
                  <p className="text-xs font-semibold text-tertiary-light">
                    Postęp {progress}%
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-lowest">
                    <div
                      className="h-full rounded-full bg-tertiary-light"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <ArrowRight size={18} className="text-primary-light sm:hidden" />
              </Link>
            );
          })
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-8 text-center text-on-surface-variant">
            <Users className="mx-auto mb-3 text-primary-light" />
            Ten trener nie ma jeszcze przypisanych klientów.
          </div>
        )}
      </div>
    </section>
  );
}
