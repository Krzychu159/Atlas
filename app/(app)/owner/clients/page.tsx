"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Archive, SearchX, UserPlus, UsersRound } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ListSection } from "@/app/components/ui/list/ListSection";
import { ListState } from "@/app/components/ui/list/ListState";
import {
  getOwnerClients,
  type OwnerClientsQuery,
} from "@/app/lib/owner/clients";
import {
  useOwnerLocationFilter,
} from "@/app/lib/owner/location-filter";
import AddClientModal from "@/app/(app)/owner/clients/components/AddClientModal";
import OwnerClientFilters, {
  defaultOwnerClientFilters,
  type OwnerClientFiltersValue,
} from "@/app/(app)/owner/clients/components/OwnerClientFilters";
import ClientList from "@/app/components/clients/ClientList";
import ClientListRow from "@/app/components/clients/ClientListRow";
import { clientAmountDue, pluralizeClients, type ClientPackageFilter } from "@/app/components/clients/client-list-display";
import { useOwnerRead } from "../components/use-owner-read";
import { OwnerReadState } from "../components/OwnerReadState";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { listUrlKey, readPositiveInt, useListScrollRestoration, useListUrlSync } from "../components/list-url-state";

const CLIENT_SORTS: Record<string, NonNullable<OwnerClientsQuery["sort"]>> = { newest: "createdDesc", name: "name", "package-usage": "packageUsageDesc", trainer: "trainer", "amount-due-desc": "amountDueDesc", "amount-due-asc": "amountDue" };

const CLIENT_URL_KEYS = ["q", "package", "trainer", "due", "sort", "page"] as const;
const PACKAGE_FILTERS: readonly ClientPackageFilter[] = ["all", "active-package", "inactive-package"];

function clientFiltersFromUrl(params: URLSearchParams): OwnerClientFiltersValue {
  const trainerId = readPositiveInt(params.get("trainer"));
  return {
    search: (params.get("q") ?? "").slice(0, 100),
    packageFilter: PACKAGE_FILTERS.find((value) => value === params.get("package")) ?? defaultOwnerClientFilters.packageFilter,
    trainerFilter: trainerId ? String(trainerId) : defaultOwnerClientFilters.trainerFilter,
    amountDueOnly: params.get("due") === "1",
    // Restore only documented server sorts.
    sort: Object.hasOwn(CLIENT_SORTS, params.get("sort") ?? "") ? params.get("sort") as OwnerClientFiltersValue["sort"] : defaultOwnerClientFilters.sort,
  };
}

function clientFiltersToUrl(filters: OwnerClientFiltersValue, page: number) {
  return {
    q: filters.search.trim() || null,
    package: filters.packageFilter === defaultOwnerClientFilters.packageFilter ? null : filters.packageFilter,
    trainer: filters.trainerFilter === defaultOwnerClientFilters.trainerFilter ? null : filters.trainerFilter,
    due: filters.amountDueOnly ? "1" : null,
    sort: filters.sort === defaultOwnerClientFilters.sort ? null : filters.sort,
    page: page > 1 ? String(page) : null,
  };
}

export default function ClientsPage() {
  return <Suspense><ClientsContent /></Suspense>;
}

function ClientsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showInvitations = searchParams.get("invitations") === "true";
  const { selectedLocationId } = useOwnerLocationFilter();
  const [filters, setFilters] = useState<OwnerClientFiltersValue>(() => clientFiltersFromUrl(searchParams));
  const { search, packageFilter, trainerFilter, amountDueOnly, sort } = filters;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pagination, setPagination] = useState(() => ({ page: readPositiveInt(searchParams.get("page")) ?? 1, locationId: selectedLocationId }));
  const page = pagination.locationId === selectedLocationId ? pagination.page : 1;
  const setPage = (next: number) => setPagination({ page: next, locationId: selectedLocationId });
  useEffect(() => { let active = true; if (showInvitations) void Promise.resolve().then(() => { if (active) setIsModalOpen(true); }); return () => { active = false; }; }, [showInvitations]);
  const unsupportedSort = !Object.hasOwn(CLIENT_SORTS, sort);
  const invalidSearch = search.trim().length > 100;
  const query = useMemo<OwnerClientsQuery>(() => ({ page, pageSize: 25, isArchived: false, search: search.trim() || undefined,
    trainerId: trainerFilter === "all" ? undefined : Number(trainerFilter), locationId: selectedLocationId,
    packageStatus: packageFilter === "active-package" ? "active" : packageFilter === "inactive-package" ? "none" : undefined,
    hasAmountDue: amountDueOnly ? true : undefined,
    sort: CLIENT_SORTS[sort],
  }), [page, search, trainerFilter, selectedLocationId, packageFilter, amountDueOnly, sort]);
  const load = useCallback((signal: AbortSignal) => getOwnerClients(query, signal), [query]);
  const list = useOwnerRead(JSON.stringify(query), load, "Nie udało się pobrać klientów.", 0, 250, !unsupportedSort && !invalidSearch);
  const lastPage = list.data?.totalPages;
  useEffect(() => {
    if (lastPage == null || lastPage <= 0 || page <= lastPage) return;
    let live = true;
    void Promise.resolve().then(() => { if (live) setPagination({ page: lastPage, locationId: selectedLocationId }); });
    return () => { live = false; };
  }, [lastPage, page, selectedLocationId]);
  const urlParams = clientFiltersToUrl(filters, page);
  useListUrlSync(urlParams, CLIENT_URL_KEYS);
  useListScrollRestoration(listUrlKey("clients", urlParams), Boolean(list.data) && !list.loading);
  const readError = unsupportedSort ? "To sortowanie nie jest jeszcze dostępne. Wybierz Najnowsi lub Alfabetycznie." : invalidSearch ? "Wpisz maksymalnie 100 znaków wyszukiwania." : list.error;
  const clients = list.data?.items ?? [];
  const filteredClients = clients;
  const hasLocalFilters = Boolean(search.trim()) || packageFilter !== "all" || trainerFilter !== "all" || amountDueOnly;
  const hasFilters = hasLocalFilters || selectedLocationId !== null;
  const isLoading = list.loading;
  const loadFailed = Boolean(readError);
  const packageCount = list.data?.summary?.withActivePackageCount;
  const activeClientsCount = typeof packageCount === "number" && Number.isSafeInteger(packageCount) && packageCount >= 0 ? packageCount : undefined;
  async function loadClients() { try { await list.reload(); } catch { /* Visible read error. */ } }
  function changeFilters(next: OwnerClientFiltersValue) { setFilters(next); setPage(1); }

  function renderList() {
    if (isLoading && clients.length === 0) {
      return <ListState variant="loading" label="Ładowanie klientów..." />;
    }

    if (loadFailed && clients.length === 0) {
      return (
        <ListState
          variant="error"
          icon={<UsersRound size={28} />}
          title="Nie udało się wczytać klientów"
          message="Sprawdź połączenie i spróbuj ponownie."
          action={
            <Button variant="secondary" size="sm" onClick={() => void loadClients()} disabled={isLoading}>
              Spróbuj ponownie
            </Button>
          }
        />
      );
    }

    if (clients.length === 0 && (list.data?.totalCount ?? 0) > 0) {
      return <ListState variant="empty" title="Brak klientów na tej stronie" message="Lista klientów zmieniła się. Wróć na pierwszą stronę." action={<Button variant="secondary" size="sm" onClick={() => setPage(1)}>Przejdź na pierwszą stronę</Button>} />;
    }

    if (clients.length === 0 && !hasFilters) {
      return (
        <ListState
          variant="empty"
          icon={<UsersRound size={28} />}
          title="Brak klientów"
          message="Dodaj pierwszego klienta lub wyślij mu zaproszenie do panelu."
          action={
            <Button size="sm" icon={<UserPlus size={15} />} onClick={() => setIsModalOpen(true)}>
              Dodaj klienta
            </Button>
          }
        />
      );
    }

    if (filteredClients.length === 0 && amountDueOnly && !search.trim() && packageFilter === "all" && trainerFilter === "all") {
      return (
        <ListState
          variant="empty"
          icon={<SearchX size={28} />}
          title="Nikt nie ma nic do zapłaty"
          message={selectedLocationId !== null ? "Wszyscy klienci w tej lokalizacji mają opłacone pakiety." : "Wszyscy klienci mają opłacone pakiety."}
          action={
            <Button variant="secondary" size="sm" onClick={() => changeFilters({ ...filters, amountDueOnly: false })}>
              Pokaż wszystkich klientów
            </Button>
          }
        />
      );
    }

    if (filteredClients.length === 0) {
      return (
        <ListState
          variant="empty"
          icon={<SearchX size={28} />}
          title="Brak klientów spełniających wybrane kryteria"
          message={selectedLocationId !== null ? "Zmień lokalizację lub pozostałe filtry, aby zobaczyć więcej wyników." : "Zmień lub wyczyść filtry, aby zobaczyć więcej wyników."}
          action={hasLocalFilters ? (
            <Button variant="secondary" size="sm" onClick={() => changeFilters(defaultOwnerClientFilters)}>
              Wyczyść filtry
            </Button>
          ) : undefined}
        />
      );
    }

    return (
      <ClientList amountLabel="Do zapłaty">
        {filteredClients.map((client) => (
          <ClientListRow key={client.id} client={client} detailsHref={`/owner/clients/${client.id}`} amountLabel="Do zapłaty" amount={clientAmountDue(client)} />
        ))}
      </ClientList>
    );
  }

  const countsReady = list.data !== undefined && !loadFailed;

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[560px]">
            <p className="text-label text-primary-light">Baza klientów</p>
            <h1 className="mt-2 font-display text-[1.75rem] md:text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
              Klienci
            </h1>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Zarządzaj bazą klientów, trenerami i aktywnymi pakietami.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="flex gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container px-4 py-3 sm:flex-none">
                <p className="text-2xl font-semibold leading-none">
                  {countsReady ? list.data?.totalCount : "–"}
                </p>
                <p className="text-sm text-on-surface-variant">łącznie</p>
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container px-4 py-3 sm:flex-none">
                <p className="text-2xl font-semibold leading-none text-tertiary-light">
                  {countsReady ? activeClientsCount ?? "—" : "–"}
                </p>
                <p className="text-sm text-on-surface-variant">z aktywnym pakietem</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/owner/clients/archived"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low px-5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high sm:flex-none"
              >
                <Archive size={16} />
                Archiwum
              </Link>
              <Button
                variant="primary"
                icon={<UserPlus size={16} />}
                className="flex-1 sm:flex-none"
                onClick={() => setIsModalOpen(true)}
              >
                Dodaj klienta
              </Button>
            </div>
          </div>
        </div>

        <OwnerClientFilters value={filters} locationId={selectedLocationId} onChange={changeFilters} />
        <OwnerReadState loading={false} error={readError} retry={list.retry} label="Ładowanie klientów..." />
        {countsReady && activeClientsCount === undefined ? <p role="status" className="text-sm text-on-surface-muted">Podsumowanie klientów z aktywnym pakietem jest chwilowo niedostępne.</p> : null}

        <ListSection
          title="Lista klientów"
          description="Trener, pakiet, kwota do zapłaty i status klienta w jednym wierszu."
          meta={countsReady ? pluralizeClients(list.data?.totalCount ?? 0) : null}
        >
          {!readError || list.data ? renderList() : null}
          {list.data && list.data.totalPages > 1 && !isLoading && !readError ? <PaymentPagination page={list.data.page} pageSize={list.data.pageSize} totalItems={list.data.totalCount} totalPages={list.data.totalPages} onPageChange={setPage} itemLabel="klientów" ariaLabel="Strony klientów" /> : null}
        </ListSection>
      </div>

      <AddClientModal
        open={isModalOpen}
        initialMode={showInvitations ? "invitation" : "record"}
        onClose={() => {
          setIsModalOpen(false);
          if (showInvitations) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("invitations");
            router.replace(`/owner/clients${params.size ? `?${params}` : ""}`, { scroll: false });
          }
        }}
        onCreated={loadClients}
      />
    </>
  );
}
