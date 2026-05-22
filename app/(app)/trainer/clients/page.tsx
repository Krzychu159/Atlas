"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  getClients,
  getClientSubscription,
  type Client,
} from "@/app/lib/owner/clients";
import { isForbiddenError } from "@/app/lib/backend";
import {
  getTrainerPortalClients,
  getTrainerPortalMe,
  type TrainerPortalMe,
} from "@/app/lib/trainer/portal";
import { trainerPortalClientsToClients } from "@/app/lib/trainer/portal-mappers";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function matchesPackageFilter(client: Client, filter: ClientPackageFilter) {
  if (filter === "active-package") return hasActiveClientPackage(client);
  if (filter === "inactive-package") return !hasActiveClientPackage(client);

  return true;
}

function getTime(value?: string | null) {
  if (!value) return 0;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getTrainerDisplayName(me: TrainerPortalMe | null) {
  return (me?.fullName || "").trim();
}

export default function TrainerClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [me, setMe] = useState<TrainerPortalMe | null>(null);
  const [search, setSearch] = useState("");
  const [packageFilter, setPackageFilter] =
    useState<ClientPackageFilter>("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [sort, setSort] = useState<ClientSort>("package-usage");
  const [isLoading, setIsLoading] = useState(true);
  const defaultFilterApplied = useRef(false);

  async function loadClients() {
    try {
      setIsLoading(true);
      const meData = await getTrainerPortalMe().catch(() => null);
      const { clients: clientsData, canUseOwnerClientEndpoints } =
        await getClientsForTrainerView(meData);
      const subscriptions = canUseOwnerClientEndpoints
        ? await Promise.allSettled(
            clientsData.map((client) => getClientSubscription(client.id)),
          )
        : [];

      setMe(meData);
      setClients(
        clientsData.map((client, index) => {
          const subscription = subscriptions[index];

          if (!subscription || subscription.status !== "fulfilled") {
            return client;
          }

          const cycle = subscription.value.currentCycle;

          return {
            ...client,
            subscriptionStatus: subscription.value.status,
            hasActivePackage: Boolean(cycle?.isActive),
            currentPackageName: cycle?.packageName ?? client.currentPackageName,
            packageSessionsLimit:
              cycle?.totalSessions ?? client.packageSessionsLimit,
            packageSessionsUsed:
              cycle?.usedSessions ?? client.packageSessionsUsed,
            remainingSessions:
              cycle?.remainingSessions ?? client.remainingSessions,
            balance: subscription.value.carryOverBalance ?? client.balance,
            currency: cycle?.currency ?? client.currency,
          };
        }),
      );

      const trainerName = getTrainerDisplayName(meData);

      if (trainerName && !defaultFilterApplied.current) {
        defaultFilterApplied.current = true;
        setTrainerFilter(trainerName);
      }
    } catch (err) {
      showOwnerError(err, "Nie udało się pobrać klientów.", {
        id: "trainer-clients-load-error",
      });
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function getClientsForTrainerView(meData: TrainerPortalMe | null) {
    try {
      return {
        clients: await getClients(),
        canUseOwnerClientEndpoints: true,
      };
    } catch (err) {
      if (!isForbiddenError(err)) throw err;

      const portalClients = await getTrainerPortalClients();

      return {
        clients: trainerPortalClientsToClients(portalClients, meData),
        canUseOwnerClientEndpoints: false,
      };
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClients();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const trainerOptions = useMemo(() => {
    const uniqueTrainers = new Set<string>();
    const currentTrainerName = getTrainerDisplayName(me);

    if (currentTrainerName) uniqueTrainers.add(currentTrainerName);

    clients.forEach((client) => {
      if (client.trainerFullName) uniqueTrainers.add(client.trainerFullName);
    });

    return Array.from(uniqueTrainers).sort((first, second) =>
      first.localeCompare(second, "pl"),
    );
  }, [clients, me]);

  const filteredClients = useMemo(() => {
    const query = normalize(search);

    const result = clients.filter((client) => {
      const fullName = normalize(getClientName(client));
      const email = normalize(client.email || "");
      const phoneNumber = normalize(client.phoneNumber || "");
      const trainerName = client.trainerFullName || "";

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        email.includes(query) ||
        phoneNumber.includes(query);
      const matchesTrainer =
        trainerFilter === "all" || trainerName === trainerFilter;

      return (
        matchesSearch &&
        matchesTrainer &&
        matchesPackageFilter(client, packageFilter)
      );
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
        return getClientBalance(second) - getClientBalance(first);
      }

      if (sort === "balance-asc") {
        return getClientBalance(first) - getClientBalance(second);
      }

      if (sort === "package-usage") {
        return (
          getClientPackageUsage(second).percent -
          getClientPackageUsage(first).percent
        );
      }

      return getTime(second.createdAt) - getTime(first.createdAt);
    });
  }, [clients, search, trainerFilter, packageFilter, sort]);

  const activeClientsCount = clients.filter(hasActiveClientPackage).length;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
              Klienci
            </h1>
            <span className="rounded-full bg-surface-container px-3 py-1 text-sm text-on-surface-variant">
              {clients.length} total
            </span>
          </div>

          <p className="mt-3 max-w-[760px] text-base text-on-surface-variant">
            Lista pokazuje wszystkich klientów. Domyślnie filtr jest ustawiony
            na zalogowanego trenera, ale możesz przełączyć go na wszystkich albo
            na innego trenera.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] bg-surface-container px-4 py-3">
          <p className="text-label text-on-surface-muted">Aktywny pakiet</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-on-surface">
            {activeClientsCount}
          </p>
        </div>
      </section>

      <ClientFilters
        search={search}
        packageFilter={packageFilter}
        trainerFilter={trainerFilter}
        sort={sort}
        trainerOptions={trainerOptions}
        onSearchChange={setSearch}
        onPackageFilterChange={setPackageFilter}
        onTrainerFilterChange={setTrainerFilter}
        onSortChange={setSort}
      />

      <section className="hidden flex-col gap-3 md:flex">
        {isLoading ? (
          <div className="card-shell p-5 text-on-surface-variant">
            Ładowanie klientów...
          </div>
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <ClientListRow
              key={client.id}
              client={client}
              detailsHref={`/trainer/clients/${client.id}`}
            />
          ))
        ) : (
          <div className="card-shell p-8 text-center text-on-surface-variant">
            Brak klientów dla wybranego filtra.
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 md:hidden">
        {isLoading ? (
          <div className="card-shell p-5 text-on-surface-variant">
            Ładowanie klientów...
          </div>
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => {
            const packageUsage = getClientPackageUsage(client);
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
                      Trener: {client.trainerFullName || "Nie przypisano"}
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
                        <div
                          className="h-full rounded-full bg-primary-gradient"
                          style={{ width: `${packageUsage.percent}%` }}
                        />
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
                      {formatClientBalance(client)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card-shell p-8 text-center text-on-surface-variant">
            Brak klientów.
          </div>
        )}
      </section>
    </div>
  );
}
