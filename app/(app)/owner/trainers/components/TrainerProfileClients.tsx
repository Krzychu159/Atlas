import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { PanelEmpty, PanelHeader } from "./TrainerProfilePanel";
import type { Client } from "@/app/lib/owner/clients";
import { formatTrainingStartDate } from "@/app/lib/formatters/date";

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
    <section className="card-shell min-w-0 p-4 md:p-5">
      <PanelHeader
        icon={<Users size={15} />}
        title="Klienci"
        meta={`${activeClients.length} z aktywnym pakietem · ${clients.length} łącznie`}
        href="/owner/clients"
        linkLabel="Wszyscy klienci"
      />

      {clients.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1">
          {clients.slice(0, 5).map((client) => {
            const fullName = getClientName(client);
            const detail = client.goal || client.email;

            return (
              <li key={client.id}>
                <Link
                  href={`/owner/clients/${client.id}`}
                  prefetch={false}
                  className="group flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 transition hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:outline-none"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-lowest ring-1 ring-white/5">
                    {client.avatarUrl ? (
                      <img src={client.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[11px] font-semibold text-primary-light">{getInitials(client)}</span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-on-surface">{fullName}</span>
                    <span className="block truncate text-xs text-on-surface-muted">{detail || "Brak celu"}</span>
                  </span>

                  <span className="hidden shrink-0 text-right sm:block">
                    <span className="block text-[10px] uppercase tracking-wide text-on-surface-muted">Start</span>
                    <span className="block text-xs font-semibold text-on-surface-variant">{formatTrainingStartDate(client.trainingStartDate)}</span>
                  </span>

                  <ChevronRight size={15} className="shrink-0 text-on-surface-muted transition group-hover:translate-x-0.5 group-hover:text-primary-light" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <PanelEmpty icon={<Users size={16} />}>Ten trener nie ma jeszcze przypisanych klientów.</PanelEmpty>
      )}
    </section>
  );
}
