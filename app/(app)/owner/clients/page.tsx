"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, UserPlus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  getClients,
  getClientSubscription,
  type Client,
} from "@/app/lib/owner/clients";
import AddClientModal from "@/app/(app)/owner/clients/components/AddClientModal";
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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [packageFilter, setPackageFilter] =
    useState<ClientPackageFilter>("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [sort, setSort] = useState<ClientSort>("package-usage");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadClients() {
    try {
      setIsLoading(true);
      const data = await getClients();
      const subscriptions = await Promise.allSettled(
        data.map((client) => getClientSubscription(client.id)),
      );

      setClients(
        data.map((client, index) => {
          const subscription = subscriptions[index];

          if (subscription.status !== "fulfilled") return client;

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
    } catch (err) {
      showOwnerError(err, "Błąd ładowania klientów", {
        id: "owner-clients-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const trainerOptions = useMemo(() => {
    const uniqueTrainers = new Set<string>();

    clients.forEach((client) => {
      if (client.trainerFullName) uniqueTrainers.add(client.trainerFullName);
    });

    return Array.from(uniqueTrainers).sort((first, second) =>
      first.localeCompare(second, "pl"),
    );
  }, [clients]);

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
    <>
      <div className="max-w-[1400px] mx-auto">
        {/* Desktop */}
        <div className="hidden md:block">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[2.25rem] leading-[0.95] font-semibold font-display tracking-tight">
                    Klienci
                  </h1>
                  <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-sm">
                    {clients.length} total
                  </span>
                </div>

                <p className="mt-3 text-base text-on-surface-variant">
                  Zarządzaj bazą klientów, trenerami i aktywnymi pakietami.
                </p>
              </div>

              <Button
                variant="primary"
                icon={<UserPlus size={16} />}
                className="h-16"
                onClick={() => setIsModalOpen(true)}
              >
                Dodaj klienta
              </Button>
            </div>

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

            <div className="flex flex-col gap-3">
              {isLoading ? (
                <div className="card-shell p-5 text-on-surface-variant">
                  Ładowanie klientów...
                </div>
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <ClientListRow key={client.id} client={client} />
                ))
              ) : (
                <div className="card-shell p-8 text-center text-on-surface-variant">
                  Brak klientów dla wybranego filtra.
                </div>
              )}
            </div>

            <div className="grid grid-cols-[330px_1fr] gap-4">
              <div className="card-shell p-5">
                <p className="text-label text-on-surface-variant">
                  Ostatnia aktywność
                </p>

                <div className="mt-5 flex flex-col gap-4">
                  <div className="flex gap-3">
                    <div className="w-1 rounded-full bg-tertiary-light" />
                    <div>
                      <p className="text-sm">
                        Aktywni klienci: {activeClientsCount}
                      </p>
                      <p className="text-label text-on-surface-muted mt-1">
                        Z aktywnym pakietem
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-shell p-5 flex items-center justify-between gap-6">
                <div>
                  <p className="text-label text-on-surface-variant">
                    Wydajność bazy
                  </p>
                  <p className="mt-4 text-[2.6rem] leading-none font-semibold text-primary-light">
                    {clients.length}
                  </p>
                  <p className="mt-3 text-sm text-on-surface-variant">
                    Łączna liczba klientów w systemie.
                  </p>
                </div>

                <div className="flex items-end gap-2 shrink-0">
                  <div className="w-4 h-8 rounded-full bg-primary/40" />
                  <div className="w-4 h-12 rounded-full bg-primary/50" />
                  <div className="w-4 h-16 rounded-full bg-primary/65" />
                  <div className="w-4 h-20 rounded-full bg-primary/80" />
                  <div className="w-4 h-24 rounded-full bg-primary-light" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden px-1 pb-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-page-title">Klienci</p>
                <div className="mt-3 h-1 w-24 rounded-full bg-primary" />
              </div>

              <p className="pt-3 text-label text-on-surface-variant">
                {activeClientsCount} aktywnych
              </p>
            </div>

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

            <div className="flex flex-col gap-4">
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
                          <p className="text-lg font-semibold truncate">
                            {fullName}
                          </p>
                          <p className="mt-2 text-sm text-on-surface-variant truncate">
                            {client.email || "Brak adresu e-mail"}
                          </p>
                          <p className="mt-4 text-label text-primary-light">
                            Trener: {client.trainerFullName || "Nie przypisano"}
                          </p>
                        </div>

                        <Link
                          href={`/owner/clients/${client.id}`}
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
                          <p className="text-label text-on-surface-variant">
                            Balance
                          </p>
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
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="fixed right-5 bottom-24 h-16 w-16 rounded-full bg-primary-gradient text-white shadow-ambient flex items-center justify-center z-20"
            >
              <Plus size={30} />
            </button>
          </div>
        </div>
      </div>

      <AddClientModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
