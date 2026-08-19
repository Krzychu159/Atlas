"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import {
  createPackage,
  deletePackage,
  getPackages,
  type CreatePackagePayload,
  type Package,
} from "@/app/lib/owner/packages";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import {
  matchesOwnerLocationId,
  useOwnerLocationFilter,
} from "@/app/lib/owner/location-filter";
import PackageCard from "@/app/components/packages/PackageCard";
import PackageFilters, {
  type DurationFilter,
  type PackageSort,
  type ParticipantsFilter,
  type SessionsFilter,
} from "@/app/components/packages/PackageFilters";
import AddPackageModal from "./components/AddPackageModal";
import { showOwnerError, showOwnerSuccess } from "../components/owner-toast";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function matchesParticipants(item: Package, filter: ParticipantsFilter) {
  const count = item.participantsCount || 1;

  if (filter === "solo") return count <= 1;
  if (filter === "duo") return count === 2;
  if (filter === "group") return count > 2;
  return true;
}

function matchesSessions(item: Package, filter: SessionsFilter) {
  if (filter === "short") return item.sessionsLimit <= 4;
  if (filter === "medium") return item.sessionsLimit >= 5 && item.sessionsLimit <= 10;
  if (filter === "long") return item.sessionsLimit > 10;
  return true;
}

function matchesDuration(item: Package, filter: DurationFilter) {
  if (filter === "monthly") return item.durationDays <= 31;
  if (filter === "quarterly") return item.durationDays > 31 && item.durationDays <= 90;
  if (filter === "long") return item.durationDays > 90;
  return true;
}

export default function PackagesPage() {
  const { selectedLocationId } = useOwnerLocationFilter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState("");
  const [participantsFilter, setParticipantsFilter] =
    useState<ParticipantsFilter>("all");
  const [sessionsFilter, setSessionsFilter] = useState<SessionsFilter>("all");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  const [sort, setSort] = useState<PackageSort>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<Package | null>(null);

  async function loadPackages() {
    try {
      setIsLoading(true);
      const [packagesResult, locationsResult] = await Promise.allSettled([
        getPackages(),
        getLocations(),
      ]);

      if (packagesResult.status !== "fulfilled") {
        throw packagesResult.reason;
      }

      setPackages(packagesResult.value);
      setLocations(
        locationsResult.status === "fulfilled"
          ? locationsResult.value.filter((location) => location.isActive)
          : [],
      );
    } catch (err) {
      showOwnerError(err, "Błąd ładowania pakietów", {
        id: "owner-packages-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadPackages());
  }, []);

  const locationPackages = useMemo(
    () =>
      packages.filter((item) =>
        matchesOwnerLocationId(item, selectedLocationId),
      ),
    [packages, selectedLocationId],
  );

  const filteredPackages = useMemo(() => {
    const query = normalize(search);

    const result = locationPackages.filter((item) => {
      const name = normalize(item.name || "");
      const description = normalize(item.description || "");

      const matchesSearch =
        !query || name.includes(query) || description.includes(query);

      return (
        matchesSearch &&
        matchesParticipants(item, participantsFilter) &&
        matchesSessions(item, sessionsFilter) &&
        matchesDuration(item, durationFilter)
      );
    });

    return [...result].sort((first, second) => {
      if (sort === "price-asc") return first.price - second.price;
      if (sort === "price-desc") return second.price - first.price;
      if (sort === "sessions-desc") return second.sessionsLimit - first.sessionsLimit;
      if (sort === "duration-desc") return second.durationDays - first.durationDays;
      if (sort === "participants-asc") {
        return (first.participantsCount || 1) - (second.participantsCount || 1);
      }

      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    });
  }, [
    locationPackages,
    search,
    participantsFilter,
    sessionsFilter,
    durationFilter,
    sort,
  ]);

  const handleCreatePackage = async (payload: CreatePackagePayload) => {
    try {
      setIsSubmitting(true);
      await createPackage({
        ...payload,
        locationId:
          payload.locationId === undefined
            ? selectedLocationId
            : payload.locationId,
      });
      await loadPackages();
      setIsModalOpen(false);
      showOwnerSuccess("Pakiet został dodany.", {
        id: "owner-package-create-success",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się dodać pakietu", {
        id: "owner-package-create-error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  async function handleDeletePackage(id: number) {
    try {
      await deletePackage(id);

      setPackages((current) => current.filter((item) => item.id !== id));
      setPackageToDelete(null);

      showOwnerSuccess("Pakiet został usunięty.", {
        id: "owner-package-delete-success",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się usunąć pakietu.", {
        id: "owner-package-delete-error",
      });
    }
  }

  return (
    <>
      <div className="max-w-[1400px] mx-auto">
        <div className="hidden md:block">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-[560px]">
                <p className="text-label text-primary-light">
                  Zarządzanie pakietami
                </p>
                <h1 className="mt-2 text-[2.25rem] leading-[0.95] font-semibold font-display tracking-tight">
                  Pakiety <span className="text-primary-light">Treningowe</span>
                </h1>
                <p className="mt-3 text-base text-on-surface-variant">
                  Definiuj i optymalizuj ofertę treningową swojego studia.
                </p>
              </div>

              <Button
                variant="primary"
                icon={<Plus size={16} />}
                className="h-14"
                onClick={() => setIsModalOpen(true)}
              >
                Dodaj nowy pakiet
              </Button>
            </div>

            <PackageFilters
              search={search}
              participantsFilter={participantsFilter}
              sessionsFilter={sessionsFilter}
              durationFilter={durationFilter}
              sort={sort}
              onSearchChange={setSearch}
              onParticipantsFilterChange={setParticipantsFilter}
              onSessionsFilterChange={setSessionsFilter}
              onDurationFilterChange={setDurationFilter}
              onSortChange={setSort}
            />

            <div className="flex items-center justify-between">
              <p className="text-section-title">Lista Pakietów</p>
              <p className="text-label text-on-surface-variant">
                Wyświetlono {filteredPackages.length} pakietów
              </p>
            </div>

            {isLoading ? (
              <div className="card-shell p-5 text-on-surface-variant">
                Ładowanie pakietów...
              </div>
            ) : filteredPackages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredPackages.map((item) => (
                  <PackageCard
                    key={item.id}
                    item={item}
                    onDeleteRequest={setPackageToDelete}
                  />
                ))}

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="min-h-[260px] rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:border-primary/40 transition-colors flex flex-col items-center justify-center text-center p-6"
                >
                  <span className="h-16 w-16 rounded-full bg-surface-container flex items-center justify-center">
                    <Plus size={28} />
                  </span>
                  <span className="mt-6 text-base font-semibold">
                    Utwórz nową ofertę
                  </span>
                  <span className="mt-2 text-sm leading-6 max-w-[220px]">
                    Zdefiniuj unikalny pakiet treningowy dla swoich klientów.
                  </span>
                </button>
              </div>
            ) : (
              <div className="card-shell p-8 text-center text-on-surface-variant">
                Brak pakietów dla wybranych kryteriów.
              </div>
            )}
          </div>
        </div>

        <div className="md:hidden px-1 pb-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-page-title">Pakiety</p>
                <p className="mt-3 text-label text-primary-light">
                  Zarządzaj ofertą treningową
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="h-14 w-14 rounded-[var(--radius-lg)] bg-primary text-on-primary flex items-center justify-center shadow-soft"
              >
                <Plus size={24} />
              </button>
            </div>

            <PackageFilters
              search={search}
              participantsFilter={participantsFilter}
              sessionsFilter={sessionsFilter}
              durationFilter={durationFilter}
              sort={sort}
              onSearchChange={setSearch}
              onParticipantsFilterChange={setParticipantsFilter}
              onSessionsFilterChange={setSessionsFilter}
              onDurationFilterChange={setDurationFilter}
              onSortChange={setSort}
            />

            <div className="flex items-center justify-between">
              <p className="text-section-title">Lista Pakietów</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-label text-primary-light"
              >
                Dodaj nowy pakiet
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {isLoading ? (
                <div className="card-shell p-5 text-on-surface-variant">
                  Ładowanie pakietów...
                </div>
              ) : filteredPackages.length > 0 ? (
                filteredPackages.map((item) => (
                  <PackageCard
                    key={item.id}
                    item={item}
                    onDeleteRequest={setPackageToDelete}
                  />
                ))
              ) : (
                <div className="card-shell p-8 text-center text-on-surface-variant">
                  Brak pakietów.
                </div>
              )}

              <button
                onClick={() => setIsModalOpen(true)}
                className="min-h-[180px] rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest text-on-surface-variant flex flex-col items-center justify-center text-center p-6"
              >
                <span className="h-14 w-14 rounded-full bg-surface-container flex items-center justify-center">
                  <Plus size={24} />
                </span>
                <span className="mt-5 text-base font-semibold">
                  Brakuje pakietu?
                </span>
                <span className="mt-2 text-sm leading-6 max-w-[260px]">
                  Stwórz nową ofertę dopasowaną do potrzeb klientów.
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddPackageModal
        key={selectedLocationId ?? "all"}
        open={isModalOpen}
        isSubmitting={isSubmitting}
        locations={locations}
        defaultLocationId={selectedLocationId}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePackage}
      />

      {packageToDelete ? (
        <ModalOverlay
          onClose={() => setPackageToDelete(null)}
          className="p-4"
        >
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container shadow-ambient">
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <ModalHeader
                title="Usunąć pakiet?"
                onClose={() => setPackageToDelete(null)}
              />
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Tej akcji nie da się szybko cofnąć. Pakiet:{" "}
                <span className="font-semibold text-on-surface">
                  {packageToDelete.name}
                </span>
                .
              </p>
            </div>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => setPackageToDelete(null)}
              >
                Anuluj
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDeletePackage(packageToDelete.id)}
              >
                Usuń pakiet
              </Button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      ) : null}
    </>
  );
}
