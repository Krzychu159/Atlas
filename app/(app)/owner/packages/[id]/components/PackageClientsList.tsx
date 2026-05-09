import { MoreVertical, RotateCcw } from "lucide-react";
import type { PackageClient } from "@/app/lib/owner/packages";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function PackageClientsList({
  clients,
}: {
  clients: PackageClient[];
}) {
  const visibleClients = clients.slice(0, 3);

  return (
    <div className="card-shell p-6 overflow-hidden min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-section-title">Przypisani Klienci</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Zarządzaj aktywnymi uczestnikami tego pakietu.
          </p>
        </div>

        <button className="hidden md:flex h-11 px-5 rounded-full bg-surface-container-high text-label text-primary-light items-center">
          Dodaj klienta
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {visibleClients.length > 0 ? (
          visibleClients.map((client) => {
            const progress = Math.min(
              100,
              Math.round((client.usedSessions / client.sessionsLimit) * 100),
            );

            return (
              <div
                key={client.id}
                className="bg-surface-container-low rounded-[var(--radius-lg)] px-4 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center text-primary-light font-semibold shrink-0 overflow-hidden">
                    {client.avatarUrl ? (
                      <img
                        src={client.avatarUrl}
                        alt={client.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(client.fullName)
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-base font-semibold truncate">
                      {client.fullName}
                    </p>
                    <p className="text-label text-on-surface-muted mt-1">
                      Od {formatDate(client.joinedAt)}
                    </p>
                  </div>
                </div>

                <div className="hidden md:block w-[210px] shrink-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-label text-on-surface-variant">
                      Wykorzystane
                    </p>
                    <p className="text-xs font-semibold text-primary-light">
                      {client.usedSessions}/{client.sessionsLimit}
                    </p>
                  </div>

                  <div className="mt-2 h-1.5 rounded-full bg-surface-container-lowest overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-light"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button className="hidden md:flex h-10 w-10 rounded-[var(--radius-md)] bg-surface-container-high items-center justify-center text-on-surface-variant">
                    <RotateCcw size={16} />
                  </button>

                  <button className="h-10 w-10 rounded-[var(--radius-md)] bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-surface-container-low rounded-[var(--radius-lg)] px-4 py-5 text-sm text-on-surface-variant">
            Brak klientów przypisanych do tego pakietu.
          </div>
        )}
      </div>

      {clients.length > 3 ? (
        <button className="mt-5 h-12 w-full rounded-[var(--radius-lg)] border border-dashed border-white/15 text-on-surface-variant hover:text-on-surface transition-colors">
          Pokaż wszystkich {clients.length} klientów
        </button>
      ) : null}
    </div>
  );
}
