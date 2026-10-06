"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { showAppError } from "@/app/components/ui/app-toast";
import {
  getTrainerPackages,
  type TrainerPackage,
} from "@/app/lib/trainer/packages";
import { filterPackages } from "@/app/lib/packageFilters";
import PackageCard from "@/app/components/packages/PackageCard";
import PackageFilters, {
  type DurationFilter,
  type PackageSort,
  type ParticipantsFilter,
  type SessionsFilter,
} from "@/app/components/packages/PackageFilters";

export default function TrainerPackagesPage() {
  const [packages, setPackages] = useState<TrainerPackage[]>([]);
  const [search, setSearch] = useState("");
  const [participantsFilter, setParticipantsFilter] =
    useState<ParticipantsFilter>("all");
  const [sessionsFilter, setSessionsFilter] = useState<SessionsFilter>("all");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  const [sort, setSort] = useState<PackageSort>("newest");
  const [isLoading, setIsLoading] = useState(true);

  async function loadPackages() {
    try {
      setIsLoading(true);
      const data = await getTrainerPackages();
      setPackages(data.filter((item) => item.isActive));
    } catch (err) {
      showAppError(err, "Nie udało się pobrać pakietów.", {
        id: "trainer-packages-load-error",
      });
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPackages();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredPackages = useMemo(
    () => filterPackages(packages, {
      search, participantsFilter, sessionsFilter, durationFilter, sort,
    }),
    [packages, search, participantsFilter, sessionsFilter, durationFilter, sort],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Pakiety</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Katalog pakietów
          </h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
            Katalog ofert dostępnych dla klientów studia.
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container-low text-primary-light">
          <Wallet size={20} />
        </div>
      </section>

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

      {isLoading ? (
        <div className="card-shell p-5 text-on-surface-variant">
          Ładowanie pakietów...
        </div>
      ) : filteredPackages.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredPackages.map((item) => (
            <PackageCard key={item.id} item={item} detailsHref="" />
          ))}
        </div>
      ) : (
        <div className="card-shell p-8 text-center text-on-surface-variant">
          Brak pakietów spełniających wybrane kryteria.
        </div>
      )}
    </div>
  );
}
