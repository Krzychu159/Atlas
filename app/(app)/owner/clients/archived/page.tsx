"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Archive, ArrowLeft, ArrowRight, Mail, MapPin } from "lucide-react";
import { getOwnerClients, type Client } from "@/app/lib/owner/clients";
import { useOwnerLocationFilter } from "@/app/lib/owner/location-filter";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { getClientName, getPortalAccessLabel } from "../components/client-display";
import { useOwnerRead } from "../../components/use-owner-read";
import { listUrlKey, readPositiveInt, useListScrollRestoration, useListUrlSync } from "../../components/list-url-state";

const URL_KEYS = ["q", "page"] as const;
export default function ArchivedClientsPage() {
  return <Suspense><ArchivedClientsContent /></Suspense>;
}
function ArchivedClientsContent() {
  const params = useSearchParams();
  const { selectedLocationId } = useOwnerLocationFilter();
  const [search, setSearch] = useState(() => (params.get("q") ?? "").slice(0, 100));
  const [pagination, setPagination] = useState(() => ({ page: readPositiveInt(params.get("page")) ?? 1, search, locationId: selectedLocationId }));
  const page = pagination.search === search && pagination.locationId === selectedLocationId ? pagination.page : 1;
  const setPage = useCallback((next: number) => setPagination({ page: next, search, locationId: selectedLocationId }), [search, selectedLocationId]);
  const query = useMemo(() => ({ page, pageSize: 25, search: search.trim() || undefined, locationId: selectedLocationId, isArchived: true, sort: "archivedAtDesc" as const }), [page, search, selectedLocationId]);
  const load = useCallback((signal: AbortSignal) => getOwnerClients(query, signal), [query]);
  const list = useOwnerRead(JSON.stringify(query), load, "Nie udało się pobrać archiwum klientów.", 0, 250);
  const result = list.data;
  const clients = result?.items ?? [];
  useEffect(() => {
    if (!result || result.totalPages <= 0 || page <= result.totalPages) return;
    let live = true;
    void Promise.resolve().then(() => { if (live) setPage(result.totalPages); });
    return () => { live = false; };
  }, [result, page, setPage]);
  const url = { q: search.trim() || null, page: page > 1 ? String(page) : null };
  useListUrlSync(url, URL_KEYS);
  useListScrollRestoration(listUrlKey("archived-clients", url), Boolean(result) && !list.loading);
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div>
        <Link href="/owner/clients" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-light"><ArrowLeft size={18} />Aktywni klienci</Link>
        <div className="mt-5 flex items-center gap-3">
          <h1 className="font-display text-[1.75rem] md:text-[2.25rem] font-semibold leading-[0.95] tracking-tight">Archiwum klientów</h1>
          <span className="rounded-full bg-surface-container px-3 py-1 text-sm text-on-surface-variant">{result?.totalCount ?? "—"}</span>
        </div>
        <p className="mt-3 text-base text-on-surface-variant">Kartoteki usunięte z aktywnej listy klientów.</p>
      </div>
      <label className="card-shell block p-4 text-sm font-semibold">Szukaj w archiwum
        <input type="search" maxLength={100} value={search} onChange={event => setSearch(event.target.value)} placeholder="Nazwisko, e-mail lub telefon" className="mt-2 h-11 w-full rounded-lg bg-surface-container-lowest px-3 font-normal" />
      </label>
      {list.error ? <div role="alert" className="card-shell p-5"><p>{list.error}</p><button type="button" onClick={list.retry} className="mt-2 font-semibold text-primary-light">Spróbuj ponownie</button></div> : null}
      <div className="flex flex-col gap-3" aria-busy={list.loading}>
        {list.loading ? <div role="status" className="card-shell p-5 text-on-surface-variant">Ładowanie archiwum…</div> : clients.length ? clients.map(client => <ArchivedClientRow key={client.id} client={client} />) : !list.error && result ? <div className="card-shell p-8 text-center text-on-surface-variant"><Archive className="mx-auto mb-3 text-primary-light" />{search.trim() || selectedLocationId !== null ? "Brak archiwalnych klientów dla wybranych filtrów." : "Archiwum klientów jest puste."}</div> : null}
      </div>
      {result && result.totalPages > 1 && !list.loading && !list.error && page <= result.totalPages ? <PaymentPagination page={result.page} pageSize={result.pageSize} totalItems={result.totalCount} totalPages={result.totalPages} onPageChange={setPage} itemLabel="klientów" ariaLabel="Strony archiwum klientów" /> : null}
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
