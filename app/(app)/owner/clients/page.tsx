"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  createClient,
  getClients,
  type Client,
  type CreateClientPayload,
} from "@/app/lib/owner/clients";
import AddClientModal from "@/app/(app)/owner/clients/components/AddClientModal";
import ClientFilters, {
  type ClientFilter,
} from "@/app/(app)/owner/clients/components/ClientFilters";
import ClientListRow from "@/app/(app)/owner/clients/components/ClientListRow";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function matchesFilter(client: Client, filter: ClientFilter) {
  const status = normalize(client.status || "");

  if (filter === "active") {
    return status === "active" || status === "aktywny";
  }

  if (filter === "suspended") {
    return status === "suspended" || status === "zawieszony";
  }

  if (filter === "new") {
    const createdAt = client.createdAt ? new Date(client.createdAt) : null;
    if (!createdAt) return false;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return createdAt >= sevenDaysAgo;
  }

  return true;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ClientFilter>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadClients() {
    try {
      setError("");
      const data = await getClients();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania klientów");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const query = normalize(search);

    return clients.filter((client) => {
      const fullName = normalize(
        client.fullName || `${client.firstName} ${client.lastName}`,
      );
      const email = normalize(client.email || "");
      const goal = normalize(client.goal || "");

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        email.includes(query) ||
        goal.includes(query);

      return matchesSearch && matchesFilter(client, activeFilter);
    });
  }, [clients, search, activeFilter]);

  const activeClientsCount = clients.filter((client) =>
    matchesFilter(client, "active"),
  ).length;

  const handleCreateClient = async (payload: CreateClientPayload) => {
    try {
      setIsSubmitting(true);
      setError("");
      await createClient(payload);
      await loadClients();
      setIsModalOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się dodać klienta",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-[1000px] mx-auto">
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
                  Zarządzaj swoją bazą sportowców i ich celami.
                </p>
              </div>

              <Button
                variant="primary"
                icon={<UserPlus size={16} />}
                className="h-16"
                onClick={() => setIsModalOpen(true)}
              >
                Dodaj Klienta
              </Button>
            </div>

            <ClientFilters
              search={search}
              activeFilter={activeFilter}
              onSearchChange={setSearch}
              onFilterChange={setActiveFilter}
            />

            {error ? (
              <div className="card-shell p-4 text-error-light">{error}</div>
            ) : null}

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
                        Na podstawie backendu
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
              activeFilter={activeFilter}
              onSearchChange={setSearch}
              onFilterChange={setActiveFilter}
            />

            {error ? (
              <div className="card-shell p-4 text-error-light">{error}</div>
            ) : null}

            <div className="flex flex-col gap-4">
              {isLoading ? (
                <div className="card-shell p-5 text-on-surface-variant">
                  Ładowanie klientów...
                </div>
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <div key={client.id} className="card-shell p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold truncate">
                          {client.fullName ||
                            `${client.firstName} ${client.lastName}`}
                        </p>
                        <p className="mt-2 text-sm text-on-surface-variant truncate">
                          {client.goal || "Brak celu"}
                        </p>
                        <p className="mt-4 text-label text-primary-light">
                          Trener: {client.trainerFullName || "Nie przypisano"}
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">
                        {client.billingStatus || "Status"}
                      </span>
                    </div>
                  </div>
                ))
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
        isSubmitting={isSubmitting}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateClient}
      />
    </>
  );
}
