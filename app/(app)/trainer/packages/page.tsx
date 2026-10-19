"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageOpen, SearchX } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ListSection } from "@/app/components/ui/list/ListSection";
import { ListState } from "@/app/components/ui/list/ListState";
import { showAppError } from "@/app/components/ui/app-toast";
import PackageList from "@/app/components/packages/PackageList";
import PackageListFilters, {
  defaultPackageListFilters,
  type PackageListFiltersValue,
} from "@/app/components/packages/PackageListFilters";
import { pluralizePackages } from "@/app/components/packages/package-list-display";
import { filterPackages } from "@/app/lib/packageFilters";
import { getTrainerPackages, type TrainerPackage } from "@/app/lib/trainer/packages";
import { trainerPaymentError } from "@/app/lib/trainer/payment-errors";

export default function TrainerPackagesPage() {
  const [packages, setPackages] = useState<TrainerPackage[]>([]);
  const [filters, setFilters] = useState<PackageListFiltersValue>(defaultPackageListFilters);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadPackages() {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await getTrainerPackages();
      // The trainer sees only the offer currently available to clients.
      setPackages(data.filter((item) => item.isActive));
    } catch (err) {
      setLoadError(trainerPaymentError(err, "Nie udało się pobrać pakietów."));
      showAppError(err, "Nie udało się pobrać pakietów.", {
        id: "trainer-packages-load-error",
      });
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadPackages());
  }, []);

  const filteredPackages = useMemo(
    () => filterPackages(packages, filters),
    [packages, filters],
  );

  function renderList() {
    if (isLoading && packages.length === 0) {
      return <ListState variant="loading" label="Ładowanie pakietów..." />;
    }

    if (loadError) {
      return (
        <ListState
          variant="error"
          icon={<PackageOpen size={28} />}
          title="Nie udało się wczytać pakietów"
          message={loadError}
          action={
            <Button variant="secondary" size="sm" onClick={() => void loadPackages()} disabled={isLoading}>
              Spróbuj ponownie
            </Button>
          }
        />
      );
    }

    if (packages.length === 0) {
      return (
        <ListState
          variant="empty"
          icon={<PackageOpen size={28} />}
          title="Obecnie nie ma pakietów w ofercie"
          message="Pakiety i usługi dodane przez studio pojawią się tutaj."
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

    return <PackageList packages={filteredPackages} getDetailsHref={(item) => `/trainer/packages/${item.id}`} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="max-w-[560px]">
        <p className="text-label text-primary-light">Katalog pakietów</p>
        <h1 className="mt-2 font-display text-[1.75rem] md:text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
          Pakiety <span className="text-primary-light">i usługi</span>
        </h1>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          Pakiety treningowe i usługi okresowe dostępne dla klientów studia.
        </p>
      </div>

      <PackageListFilters value={filters} onChange={setFilters} showActivityFilter={false} />

      <ListSection
        title="Lista pakietów"
        description="Rodzaj, limit, cena i status oferty w jednym wierszu."
        meta={!isLoading && !loadError ? pluralizePackages(filteredPackages.length) : null}
        busy={isLoading}
      >
        {renderList()}
      </ListSection>
    </div>
  );
}
