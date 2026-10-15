"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Archive, SearchX, UserPlus, UsersRound } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ListSection } from "@/app/components/ui/list/ListSection";
import { ListState } from "@/app/components/ui/list/ListState";
import {
  getClients,
  type Client,
} from "@/app/lib/owner/clients";
import {
  matchesOwnerLocationId,
  useOwnerLocationFilter,
} from "@/app/lib/owner/location-filter";
import AddClientModal from "@/app/(app)/owner/clients/components/AddClientModal";
import type { ClientPackageFilter } from "@/app/(app)/owner/clients/components/ClientFilters";
import OwnerClientFilters, {
  defaultOwnerClientFilters,
  type OwnerClientFiltersValue,
} from "@/app/(app)/owner/clients/components/OwnerClientFilters";
import OwnerClientList from "@/app/(app)/owner/clients/components/OwnerClientList";
import OwnerClientListRow from "@/app/(app)/owner/clients/components/OwnerClientListRow";
import { pluralizeClients } from "@/app/(app)/owner/clients/components/client-list-display";
import {
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
  return <Suspense><ClientsContent /></Suspense>;
}

function ClientsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showInvitations = searchParams.get("invitations") === "true";
  const [clients, setClients] = useState<Client[]>([]);
  const { selectedLocationId } = useOwnerLocationFilter();
  const [filters, setFilters] = useState<OwnerClientFiltersValue>(defaultOwnerClientFilters);
  const { search, packageFilter, trainerFilter, sort } = filters;
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const loadRequestRef = useRef(0);

  useEffect(() => {
    if (showInvitations) void Promise.resolve().then(() => setIsModalOpen(true));
  }, [showInvitations]);

  async function loadClients() {
    const requestId = ++loadRequestRef.current;

    try {
      setIsLoading(true);
      const data = await getClients();
      if (requestId !== loadRequestRef.current) return;
      setClients(data);
      setLoadFailed(false);
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      setLoadFailed(true);
      showOwnerError(err, "Błąd ładowania klientów", {
        id: "owner-clients-load-error",
      });
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadClients());
  }, []);

  const scopedClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          !client.isArchived &&
          matchesOwnerLocationId(client, selectedLocationId),
      ),
    [clients, selectedLocationId],
  );

  const trainerOptions = useMemo(() => {
    const uniqueTrainers = new Set<string>();

    scopedClients.forEach((client) => {
      if (client.trainerFullName) uniqueTrainers.add(client.trainerFullName);
    });

    return Array.from(uniqueTrainers).sort((first, second) =>
      first.localeCompare(second, "pl"),
    );
  }, [scopedClients]);

  useEffect(() => {
    if (trainerFilter === "all") return;

    if (!trainerOptions.includes(trainerFilter)) {
      void Promise.resolve().then(() =>
        setFilters((current) => ({ ...current, trainerFilter: "all" })),
      );
    }
  }, [trainerFilter, trainerOptions]);

  const filteredClients = useMemo(() => {
    const query = normalize(search);

    const result = scopedClients.filter((client) => {
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
  }, [scopedClients, search, trainerFilter, packageFilter, sort]);

  const activeClientsCount = scopedClients.filter(hasActiveClientPackage).length;

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

    if (scopedClients.length === 0) {
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

    if (filteredClients.length === 0) {
      return (
        <ListState
          variant="empty"
          icon={<SearchX size={28} />}
          title="Brak klientów spełniających wybrane kryteria"
          message="Zmień lub wyczyść filtry, aby zobaczyć więcej wyników."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFilters(defaultOwnerClientFilters)}>
              Wyczyść filtry
            </Button>
          }
        />
      );
    }

    return (
      <OwnerClientList>
        {filteredClients.map((client) => (
          <OwnerClientListRow key={client.id} client={client} />
        ))}
      </OwnerClientList>
    );
  }

  const countsReady = !(isLoading && clients.length === 0) && !(loadFailed && clients.length === 0);

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
                  {countsReady ? scopedClients.length : "–"}
                </p>
                <p className="text-sm text-on-surface-variant">łącznie</p>
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container px-4 py-3 sm:flex-none">
                <p className="text-2xl font-semibold leading-none text-tertiary-light">
                  {countsReady ? activeClientsCount : "–"}
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

        <OwnerClientFilters value={filters} trainerOptions={trainerOptions} onChange={setFilters} />

        <ListSection
          title="Lista klientów"
          description="Trener, pakiet, saldo i status klienta w jednym wierszu."
          meta={countsReady ? pluralizeClients(filteredClients.length) : null}
        >
          {renderList()}
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
