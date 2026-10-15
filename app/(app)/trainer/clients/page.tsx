"use client";
import { formatTrainingStartDate } from "@/app/lib/formatters/date";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ClientFilters, {
  type ClientPackageFilter,
  type ClientSort,
} from "@/app/(app)/owner/clients/components/ClientFilters";
import ClientListRow from "@/app/(app)/owner/clients/components/ClientListRow";
import {
  formatClientBalance,
  getClientName,
  getClientPackageUsage,
} from "@/app/(app)/owner/clients/components/client-display";
import type { ClientListItem } from "@/app/lib/owner/clients";
import { isForbiddenError } from "@/app/lib/backend";
import { getTrainerClientsPage, type TrainerClientsQuery } from "@/app/lib/trainer/optimized";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { trainerPortalClientsToListItems } from "@/app/lib/trainer/portal-mappers";

const PAGE_SIZE = 25;
const serverSort: Record<ClientSort, TrainerClientsQuery["Sort"]> = {
  newest: "createdDesc", name: "name", trainer: "name",
  "balance-desc": "balanceDesc", "balance-asc": "balance", "package-usage": "packageUsageDesc",
};

export default function TrainerClientsPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [search, setSearch] = useState("");
  const [packageFilter, setPackageFilter] =
    useState<ClientPackageFilter>("all");
  const [sort, setSort] = useState<ClientSort>("package-usage");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeClientsCount, setActiveClientsCount] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const queryKey = JSON.stringify([search.trim(), packageFilter, sort, page, attempt]);
  const isLoading = loadedKey !== queryKey;
  const filteredClients = isLoading ? [] : clients;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    getTrainerClientsPage({ Page: 1, PageSize: 1, HasActivePackage: true }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setActiveClientsCount(data.totalCount); })
      .catch(() => { /* Do not replace an unavailable count with zero. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (search.trim() !== debouncedSearch) return;
    const controller = new AbortController();
    getTrainerClientsPage({ Page: page, PageSize: PAGE_SIZE, Search: debouncedSearch || undefined,
      HasActivePackage: packageFilter === "all" ? undefined : packageFilter === "active-package",
      Sort: serverSort[sort],
    }, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (page > Math.max(1, data.totalPages)) { setPage(Math.max(1, data.totalPages)); return; }
      setClients(trainerPortalClientsToListItems(data.items || []));
      setTotalCount(data.totalCount); setLoadError(null); setLoadedKey(queryKey);
    }).catch(error => {
      if (controller.signal.aborted) return;
      setClients([]); setLoadedKey(queryKey);
      setLoadError(isForbiddenError(error) ? "Nie masz uprawnień do przeglądania tej listy klientów." : "Nie udało się pobrać klientów. Spróbuj ponownie.");
    });
    return () => controller.abort();
  }, [search, debouncedSearch, packageFilter, sort, page, queryKey]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[1.75rem] md:text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
              Klienci
            </h1>
            <span className="rounded-full bg-surface-container px-3 py-1 text-sm text-on-surface-variant">
              {isLoading ? "Ładowanie..." : loadError ? "Niedostępne" : `${totalCount} znalezionych`}
            </span>
          </div>

          <p className="mt-3 max-w-[760px] text-base text-on-surface-variant">
            Klienci przypisani do Ciebie — aktywni i nieaktywni.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] bg-surface-container px-4 py-3">
          <p className="text-label text-on-surface-muted">Aktywny pakiet</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-on-surface">
            {isLoading || loadError ? "—" : activeClientsCount === null ? "Brak danych" : activeClientsCount}
          </p>
        </div>
      </section>

      <ClientFilters
        showTrainerFilter={false}
        searchPlaceholder="Szukaj po nazwisku lub e-mailu..."
        searchMaxLength={100}
        search={search}
        packageFilter={packageFilter}
        sort={sort}
        onSearchChange={value => { setSearch(value); setPage(1); }}
        onPackageFilterChange={value => { setPackageFilter(value); setPage(1); }}
        onSortChange={value => { setSort(value); setPage(1); }}
      />

      <section className="hidden flex-col gap-3 md:flex">
        {isLoading ? (
          <div className="card-shell p-5 text-on-surface-variant">
            Ładowanie klientów...
          </div>
        ) : loadError ? (
          <div role="alert" className="card-shell p-5 text-on-surface-variant">
            {loadError}
            <button type="button" className="ml-3 font-semibold text-primary-light" onClick={() => setAttempt(value => value + 1)}>Spróbuj ponownie</button>
          </div>
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <ClientListRow
              key={client.id}
              client={client}
              preserveMissingData
              detailsHref={`/trainer/clients/${client.id}`}
            />
          ))
        ) : (
          <div className="card-shell p-8 text-center text-on-surface-variant">
            {clients.length ? "Brak klientów dla wybranych filtrów." : "Nie masz jeszcze przypisanych klientów."}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 md:hidden">
        {isLoading ? (
          <div className="card-shell p-5 text-on-surface-variant">
            Ładowanie klientów...
          </div>
        ) : loadError ? (
          <div role="alert" className="card-shell p-5 text-on-surface-variant">
            {loadError}
            <button type="button" className="ml-3 font-semibold text-primary-light" onClick={() => setAttempt(value => value + 1)}>Spróbuj ponownie</button>
          </div>
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => {
            const packageUsage = getClientPackageUsage(client, true);
            const fullName = getClientName(client);

            return (
              <div key={client.id} className="card-shell p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">
                      {fullName}
                    </p>
                    <p className="mt-2 truncate text-sm text-on-surface-variant">
                      {client.email || "Brak adresu e-mail"}
                    </p>
                    <p className="mt-4 text-label text-primary-light">
                      Trener: {client.trainerFullName || "Brak danych"}
                    </p>
                    <p className="mt-2 text-xs text-on-surface-muted">Rozpoczęcie treningów: {formatTrainingStartDate(client.trainingStartDate)}</p>
                  </div>

                  <Link
                    href={`/trainer/clients/${client.id}`}
                    prefetch={false}
                    aria-label={`Przejdź do profilu klienta ${fullName}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container-high text-primary-light"
                  >
                    <ArrowRight size={18} />
                  </Link>
                </div>

                <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4">
                  <div className="min-w-0">
                    <p className="text-label text-on-surface-variant">
                      Wykorzystanie pakietu
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-lowest">
                        {packageUsage.sortPercent !== null ? (
                          <div
                            className="h-full rounded-full bg-primary-gradient"
                            style={{ width: `${packageUsage.percent}%` }}
                          />
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold text-primary-light">
                        {packageUsage.label}
                      </p>
                    </div>
                    <p className="mt-2 truncate text-xs text-on-surface-muted">
                      {packageUsage.packageName}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-label text-on-surface-variant">Saldo</p>
                    <p className="mt-1 text-sm font-semibold text-tertiary-light">
                      {formatClientBalance(client, true)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card-shell p-8 text-center text-on-surface-variant">
            {clients.length ? "Brak klientów dla wybranych filtrów." : "Nie masz jeszcze przypisanych klientów."}
          </div>
        )}
      </section>
      {!isLoading && !loadError && totalCount > 0 ? <PaymentPagination page={page} pageSize={PAGE_SIZE} totalItems={totalCount} onPageChange={setPage} itemLabel="klientów" ariaLabel="Paginacja klientów" /> : null}
    </div>
  );
}
