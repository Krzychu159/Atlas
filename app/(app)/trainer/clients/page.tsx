"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchX, UsersRound } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ListSection } from "@/app/components/ui/list/ListSection";
import { ListState } from "@/app/components/ui/list/ListState";
import ClientList from "@/app/components/clients/ClientList";
import ClientListRow from "@/app/components/clients/ClientListRow";
import { clientBalance, pluralizeClients, type ClientPackageFilter } from "@/app/components/clients/client-list-display";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { listUrlKey, readPositiveInt, useListScrollRestoration, useListUrlSync } from "@/app/(app)/owner/components/list-url-state";
import type { ClientListItem } from "@/app/lib/owner/clients";
import { isForbiddenError } from "@/app/lib/backend";
import { getTrainerClientsPage, type TrainerClientsQuery } from "@/app/lib/trainer/optimized";
import { trainerPortalClientsToListItems } from "@/app/lib/trainer/portal-mappers";
import TrainerClientFilters, {
  defaultTrainerClientFilters,
  type TrainerClientFiltersValue,
  type TrainerClientSort,
} from "./components/TrainerClientFilters";

const PAGE_SIZE = 25;
const SERVER_SORTS: Record<TrainerClientSort, NonNullable<TrainerClientsQuery["Sort"]>> = {
  "package-usage": "packageUsageDesc",
  newest: "createdDesc",
  name: "name",
  "balance-desc": "balanceDesc",
  "balance-asc": "balance",
};
const CLIENT_URL_KEYS = ["q", "package", "sort", "page"] as const;
const PACKAGE_FILTERS: readonly ClientPackageFilter[] = ["all", "active-package", "inactive-package"];

function filtersFromUrl(params: URLSearchParams): TrainerClientFiltersValue {
  const sort = params.get("sort") ?? "";
  return {
    search: (params.get("q") ?? "").slice(0, 100),
    packageFilter: PACKAGE_FILTERS.find((value) => value === params.get("package")) ?? defaultTrainerClientFilters.packageFilter,
    sort: Object.hasOwn(SERVER_SORTS, sort) ? sort as TrainerClientSort : defaultTrainerClientFilters.sort,
  };
}

function filtersToUrl(filters: TrainerClientFiltersValue, page: number) {
  return {
    q: filters.search.trim() || null,
    package: filters.packageFilter === defaultTrainerClientFilters.packageFilter ? null : filters.packageFilter,
    sort: filters.sort === defaultTrainerClientFilters.sort ? null : filters.sort,
    page: page > 1 ? String(page) : null,
  };
}

export default function TrainerClientsPage() {
  return <Suspense><TrainerClientsContent /></Suspense>;
}

function TrainerClientsContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<TrainerClientFiltersValue>(() => filtersFromUrl(searchParams));
  const { search, packageFilter, sort } = filters;
  const [page, setPage] = useState(() => readPositiveInt(searchParams.get("page")) ?? 1);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [activeClientsCount, setActiveClientsCount] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(() => search.trim());
  const [loadedKey, setLoadedKey] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const queryKey = JSON.stringify([search.trim(), packageFilter, sort, page, attempt]);
  const isLoading = loadedKey !== queryKey;
  const hasFilters = Boolean(search.trim()) || packageFilter !== defaultTrainerClientFilters.packageFilter;
  const urlParams = filtersToUrl(filters, page);
  useListUrlSync(urlParams, CLIENT_URL_KEYS);
  useListScrollRestoration(listUrlKey("trainer-clients", urlParams), !isLoading && !loadError);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    getTrainerClientsPage({ Page: 1, PageSize: 1, HasActivePackage: true }, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setActiveClientsCount(data.totalCount); })
      .catch(() => { /* Do not replace an unavailable count with zero. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (search.trim() !== debouncedSearch) return;
    const controller = new AbortController();
    getTrainerClientsPage({
      Page: page,
      PageSize: PAGE_SIZE,
      Search: debouncedSearch || undefined,
      HasActivePackage: packageFilter === "all" ? undefined : packageFilter === "active-package",
      Sort: SERVER_SORTS[sort],
    }, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      if (page > Math.max(1, data.totalPages)) { setPage(Math.max(1, data.totalPages)); return; }
      setClients(trainerPortalClientsToListItems(data.items || []));
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
      setLoadError(null);
      setLoadedKey(queryKey);
    }).catch((error) => {
      if (controller.signal.aborted) return;
      setClients([]);
      setLoadedKey(queryKey);
      setLoadError(isForbiddenError(error) ? "Nie masz uprawnień do przeglądania tej listy klientów." : "Sprawdź połączenie i spróbuj ponownie.");
    });
    return () => controller.abort();
  }, [search, debouncedSearch, packageFilter, sort, page, queryKey]);

  function changeFilters(next: TrainerClientFiltersValue) {
    setFilters(next);
    setPage(1);
  }

  function renderList() {
    if (isLoading) {
      return <ListState variant="loading" label="Ładowanie klientów..." />;
    }

    if (loadError) {
      return (
        <ListState
          variant="error"
          icon={<UsersRound size={28} />}
          title="Nie udało się wczytać klientów"
          message={loadError}
          action={
            <Button variant="secondary" size="sm" onClick={() => setAttempt((value) => value + 1)}>
              Spróbuj ponownie
            </Button>
          }
        />
      );
    }

    if (clients.length === 0 && !hasFilters) {
      return (
        <ListState
          variant="empty"
          icon={<UsersRound size={28} />}
          title="Nie masz jeszcze przypisanych klientów"
          message="Klienci przypisani do Ciebie przez studio pojawią się tutaj."
        />
      );
    }

    if (clients.length === 0) {
      return (
        <ListState
          variant="empty"
          icon={<SearchX size={28} />}
          title="Brak klientów spełniających wybrane kryteria"
          message="Zmień lub wyczyść filtry, aby zobaczyć więcej wyników."
          action={
            <Button variant="secondary" size="sm" onClick={() => changeFilters(defaultTrainerClientFilters)}>
              Wyczyść filtry
            </Button>
          }
        />
      );
    }

    return (
      <ClientList amountLabel="Saldo" showTrainer={false}>
        {clients.map((client) => (
          <ClientListRow
            key={client.id}
            client={client}
            detailsHref={`/trainer/clients/${client.id}`}
            amountLabel="Saldo"
            amount={clientBalance(client)}
            showTrainer={false}
          />
        ))}
      </ClientList>
    );
  }

  const countsReady = !isLoading && !loadError;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[560px]">
          <p className="text-label text-primary-light">Twoi klienci</p>
          <h1 className="mt-2 font-display text-[1.75rem] md:text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Klienci
          </h1>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Klienci przypisani do Ciebie — aktywni i nieaktywni.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container px-4 py-3 sm:flex-none">
            <p className="text-2xl font-semibold leading-none">
              {countsReady ? totalCount : "–"}
            </p>
            <p className="text-sm text-on-surface-variant">{hasFilters ? "znalezionych" : "łącznie"}</p>
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container px-4 py-3 sm:flex-none">
            <p className="text-2xl font-semibold leading-none text-tertiary-light">
              {activeClientsCount ?? "–"}
            </p>
            <p className="text-sm text-on-surface-variant">z aktywnym pakietem</p>
          </div>
        </div>
      </div>

      <TrainerClientFilters value={filters} onChange={changeFilters} />

      <ListSection
        title="Lista klientów"
        description="Pakiet, saldo i status klienta w jednym wierszu."
        meta={countsReady ? pluralizeClients(totalCount) : null}
        busy={isLoading}
      >
        {renderList()}
        {countsReady && totalPages > 1 ? (
          <PaymentPagination page={page} pageSize={PAGE_SIZE} totalItems={totalCount} totalPages={totalPages} onPageChange={setPage} itemLabel="klientów" ariaLabel="Strony klientów" />
        ) : null}
      </ListSection>
    </div>
  );
}
