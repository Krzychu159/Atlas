"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageOpen, Plus, SearchX } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { ListSection } from "@/app/components/ui/list/ListSection";
import { ListState } from "@/app/components/ui/list/ListState";
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
import { filterPackages } from "@/app/lib/packageFilters";
import { ApiError } from "@/app/lib/backend";
import { periodPackageError } from "@/app/lib/period-packages";
import AddPackageModal from "./components/AddPackageModal";
import PackageList from "./components/PackageList";
import PackageListFilters, {
  defaultPackageListFilters,
  type PackageListFiltersValue,
} from "./components/PackageListFilters";
import { pluralizePackages } from "./package-list-display";
import { showOwnerError, showOwnerSuccess } from "../components/owner-toast";

export default function PackagesPage() {
  const { selectedLocationId } = useOwnerLocationFilter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filters, setFilters] = useState<PackageListFiltersValue>(defaultPackageListFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<Package | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      setLoadFailed(false);
      setLocations(
        locationsResult.status === "fulfilled"
          ? locationsResult.value.filter((location) => location.isActive)
          : [],
      );
    } catch (err) {
      setLoadFailed(true);
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

  const filteredPackages = useMemo(
    () => filterPackages(locationPackages, filters),
    [locationPackages, filters],
  );

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
      showOwnerSuccess(payload.billingMode === "PeriodBased" ? "Oferta usługi jest dostępna w katalogu." : "Pakiet został dodany.", {
        id: "owner-package-create-success",
      });
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) await loadPackages();
      showOwnerError(payload.billingMode === "PeriodBased" ? new Error(periodPackageError(err)) : err, "Nie udało się dodać pakietu", {
        id: "owner-package-create-error",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  async function handleDeletePackage(id: number) {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
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
    } finally {
      setIsDeleting(false);
    }
  }

  function renderList() {
    if (isLoading && packages.length === 0) {
      return <ListState variant="loading" label="Ładowanie pakietów..." />;
    }

    if (loadFailed && packages.length === 0) {
      return (
        <ListState
          variant="error"
          icon={<PackageOpen size={28} />}
          title="Nie udało się wczytać pakietów"
          message="Sprawdź połączenie i spróbuj ponownie."
          action={
            <Button variant="secondary" size="sm" onClick={() => void loadPackages()} disabled={isLoading}>
              Spróbuj ponownie
            </Button>
          }
        />
      );
    }

    if (locationPackages.length === 0) {
      return (
        <ListState
          variant="empty"
          icon={<PackageOpen size={28} />}
          title="Nie masz jeszcze pakietów"
          message="Dodaj pakiet treningowy lub usługę okresową, aby klienci mogli z nich korzystać."
          action={
            <Button size="sm" icon={<Plus size={15} />} onClick={() => setIsModalOpen(true)}>
              Dodaj nowy pakiet
            </Button>
          }
        />
      );
    }

    if (filteredPackages.length === 0) {
      return (
        <ListState
          variant="empty"
          icon={<SearchX size={28} />}
          title="Brak pakietów spełniających wybrane kryteria"
          message="Zmień lub wyczyść filtry, aby zobaczyć więcej wyników."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFilters(defaultPackageListFilters)}>
              Wyczyść filtry
            </Button>
          }
        />
      );
    }

    return <PackageList packages={filteredPackages} onDeleteRequest={setPackageToDelete} />;
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[560px]">
            <p className="text-label text-primary-light">Zarządzanie pakietami</p>
            <h1 className="mt-2 font-display text-[1.75rem] md:text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
              Pakiety <span className="text-primary-light">i usługi</span>
            </h1>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Zarządzaj pakietami treningowymi i usługami okresowymi studia.
            </p>
          </div>

          <Button
            variant="primary"
            icon={<Plus size={16} />}
            className="w-full sm:w-auto"
            onClick={() => setIsModalOpen(true)}
          >
            Dodaj nowy pakiet
          </Button>
        </div>

        <PackageListFilters value={filters} onChange={setFilters} />

        <ListSection
          title="Lista pakietów"
          description="Rodzaj, limit, cena i status oferty w jednym wierszu."
          meta={!isLoading && !loadFailed ? pluralizePackages(filteredPackages.length) : null}
        >
          {renderList()}
        </ListSection>
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
                disabled={isDeleting}
                onClick={() => handleDeletePackage(packageToDelete.id)}
              >
                {isDeleting ? "Usuwanie..." : "Usuń pakiet"}
              </Button>
            </ModalFooter>
          </div>
        </ModalOverlay>
      ) : null}
    </>
  );
}
