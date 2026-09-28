"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArrowLeft, ArrowRight, Mail, MapPin } from "lucide-react";
import { getArchivedClients, type Client } from "@/app/lib/owner/clients";
import { getClientName, getPortalAccessLabel } from "../components/client-display";
import { showOwnerError } from "../../components/owner-toast";

export default function ArchivedClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadArchivedClients() {
      try {
        setIsLoading(true);
        setClients(await getArchivedClients());
      } catch (err) {
        showOwnerError(err, "Nie udało się pobrać archiwum klientów.", {
          id: "owner-archived-clients-load-error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    void loadArchivedClients();
  }, []);

  const sortedClients = useMemo(
    () =>
      [...clients].sort(
        (first, second) =>
          getTime(second.archivedAt) - getTime(first.archivedAt),
      ),
    [clients],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/owner/clients"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-light"
          >
            <ArrowLeft size={18} />
            Aktywni klienci
          </Link>
          <div className="mt-5 flex items-center gap-3">
            <h1 className="font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
              Archiwum klientów
            </h1>
            <span className="rounded-full bg-surface-container px-3 py-1 text-sm text-on-surface-variant">
              {clients.length}
            </span>
          </div>
          <p className="mt-3 text-base text-on-surface-variant">
            Kartoteki usunięte z aktywnej listy klientów.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="card-shell p-5 text-on-surface-variant">
            Ładowanie archiwum...
          </div>
        ) : sortedClients.length ? (
          sortedClients.map((client) => (
            <ArchivedClientRow key={client.id} client={client} />
          ))
        ) : (
          <div className="card-shell p-8 text-center text-on-surface-variant">
            <Archive className="mx-auto mb-3 text-primary-light" />
            Archiwum klientów jest puste.
          </div>
        )}
      </div>
    </div>
  );
}

function ArchivedClientRow({ client }: { client: Client }) {
  const fullName = getClientName(client);

  return (
    <article className="card-shell flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-lg font-semibold">{fullName}</h2>
          <span className="rounded-full bg-error-container/40 px-2.5 py-1 text-[10px] font-semibold text-error-light">
            Archiwalny
          </span>
          {client.portalAccessStatus ? (
            <span className="rounded-full bg-surface-container-lowest px-2.5 py-1 text-[10px] font-semibold text-primary-light">
              {getPortalAccessLabel(client.portalAccessStatus)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-on-surface-variant">
          {client.email ? (
            <span className="inline-flex items-center gap-2">
              <Mail size={15} className="text-primary-light" />
              {client.email}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2">
            <MapPin size={15} className="text-primary-light" />
            {client.locationName || "Brak lokalizacji"}
          </span>
          <span>Zarchiwizowano: {formatArchivedAt(client.archivedAt)}</span>
        </div>
      </div>

      <Link
        href={`/owner/clients/${client.id}`}
        prefetch={false}
        aria-label={`Otwórz archiwalny profil klienta ${fullName}`}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm font-semibold text-primary-light transition hover:bg-surface-container-high"
      >
        Zobacz profil
        <ArrowRight size={16} />
      </Link>
    </article>
  );
}

function formatArchivedAt(value?: string | null) {
  if (!value) return "Brak daty";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function getTime(value?: string | null) {
  if (!value) return 0;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
