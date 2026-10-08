"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ClientFilters, {
  type ClientPackageFilter,
  type ClientSort,
} from "@/app/(app)/owner/clients/components/ClientFilters";
import ClientListRow from "@/app/(app)/owner/clients/components/ClientListRow";
import {
  formatClientBalance,
  getClientBalance,
  getClientName,
  getClientPackageUsage,
  hasActiveClientPackage,
} from "@/app/(app)/owner/clients/components/client-display";
import { showOwnerError } from "@/app/(app)/owner/components/owner-toast";
import type { ClientListItem } from "@/app/lib/owner/clients";
import { isForbiddenError } from "@/app/lib/backend";
import { getTrainerPortalClients } from "@/app/lib/trainer/portal";
import { trainerPortalClientsToListItems } from "@/app/lib/trainer/portal-mappers";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function matchesPackageFilter(client: ClientListItem, filter: ClientPackageFilter) {
  if (filter === "active-package") return hasActiveClientPackage(client, true) === true;
  if (filter === "inactive-package") return hasActiveClientPackage(client, true) === false;

  return true;
}

function getTime(value?: string | null) {
  if (!value) return 0;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export default function TrainerClientsPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [search, setSearch] = useState("");
  const [packageFilter, setPackageFilter] =
    useState<ClientPackageFilter>("all");
  const [sort, setSort] = useState<ClientSort>("package-usage");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const clientsData = await getTrainerPortalClients();
      setClients(trainerPortalClientsToListItems(clientsData));
    } catch (err) {
      const message = isForbiddenError(err)
        ? "Nie masz uprawnień do przeglądania tej listy klientów."
        : "Nie udało się pobrać klientów. Spróbuj ponownie.";
      setLoadError(message);
      showOwnerError(new Error(message), message, {
        id: "trainer-clients-load-error",
      });
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClients();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    const query = normalize(search);

    const result = clients.filter((client) => {
      const fullName = normalize(getClientName(client));
      const email = normalize(client.email || "");
      const phoneNumber = normalize(client.phoneNumber || "");

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        email.includes(query) ||
        phoneNumber.includes(query);
      return matchesSearch && matchesPackageFilter(client, packageFilter);
    });

    return [...result].sort((first, second) => {
      if (sort === "name") {
        return getClientName(first).localeCompare(getClientName(second), "pl");
      }

      if (sort === "trainer") {
        return (first.trainerFullName || "").localeCompare(
          second.trainerFullName || "",
          "pl",
        );
      }

      if (sort === "balance-desc") {
        return compareOptionalNumbers(
          getClientBalance(first, true),
          getClientBalance(second, true),
          true,
        );
      }

      if (sort === "balance-asc") {
        return compareOptionalNumbers(
          getClientBalance(first, true),
          getClientBalance(second, true),
        );
      }

      if (sort === "package-usage") {
        return compareOptionalNumbers(
          getClientPackageUsage(first, true).sortPercent,
          getClientPackageUsage(second, true).sortPercent,
          true,
        );
      }

      return getTime(second.createdAt) - getTime(first.createdAt);
    });
  }, [clients, search, packageFilter, sort]);

  const activeClientsCount = clients.filter(
    (client) => hasActiveClientPackage(client, true) === true,
  ).length;
  const hasMissingPackageData = clients.some(
    (client) => hasActiveClientPackage(client, true) === null,
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
              Klienci
            </h1>
            <span className="rounded-full bg-surface-container px-3 py-1 text-sm text-on-surface-variant">
              {isLoading ? "Ładowanie..." : loadError ? "Niedostępne" : `${clients.length} łącznie`}
            </span>
          </div>

          <p className="mt-3 max-w-[760px] text-base text-on-surface-variant">
            Klienci przypisani do Ciebie — aktywni i nieaktywni.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] bg-surface-container px-4 py-3">
          <p className="text-label text-on-surface-muted">Aktywny pakiet</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-on-surface">
            {isLoading || loadError ? "—" : hasMissingPackageData ? "Brak danych" : activeClientsCount}
          </p>
        </div>
      </section>

      <ClientFilters
        showTrainerFilter={false}
        search={search}
        packageFilter={packageFilter}
        sort={sort}
        onSearchChange={setSearch}
        onPackageFilterChange={setPackageFilter}
        onSortChange={setSort}
      />

      <section className="hidden flex-col gap-3 md:flex">
        {isLoading ? (
          <div className="card-shell p-5 text-on-surface-variant">
            Ładowanie klientów...
          </div>
        ) : loadError ? (
          <div role="alert" className="card-shell p-5 text-on-surface-variant">
            {loadError}
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
    </div>
  );
}

function compareOptionalNumbers(
  first: number | null,
  second: number | null,
  descending = false,
) {
  if (first === null) return second === null ? 0 : 1;
  if (second === null) return -1;
  return descending ? second - first : first - second;
}
