"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { showAppError } from "@/app/components/ui/app-toast";
import {
  getTrainerPackages,
  type TrainerPackage,
} from "@/app/lib/trainer/packages";
import PackageCard from "@/app/components/packages/PackageCard";
import PackageFilters, {
  type DurationFilter,
  type PackageSort,
  type ParticipantsFilter,
  type SessionsFilter,
} from "@/app/components/packages/PackageFilters";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function matchesParticipants(item: TrainerPackage, filter: ParticipantsFilter) {
  const count = item.participantsCount || 1;

  if (filter === "solo") return count <= 1;
  if (filter === "duo") return count === 2;
  if (filter === "group") return count > 2;
  return true;
}

function matchesSessions(item: TrainerPackage, filter: SessionsFilter) {
  if (filter === "short") return item.sessionsLimit <= 4;
  if (filter === "medium") {
    return item.sessionsLimit >= 5 && item.sessionsLimit <= 10;
  }
  if (filter === "long") return item.sessionsLimit > 10;
  return true;
}

function matchesDuration(item: TrainerPackage, filter: DurationFilter) {
  if (filter === "monthly") return item.durationDays <= 31;
  if (filter === "quarterly") {
    return item.durationDays > 31 && item.durationDays <= 90;
  }
  if (filter === "long") return item.durationDays > 90;
  return true;
}

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

  const filteredPackages = useMemo(() => {
    const query = normalize(search);
    const result = packages.filter((item) => {
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
      if (sort === "sessions-desc") {
        return second.sessionsLimit - first.sessionsLimit;
      }
      if (sort === "duration-desc") {
        return second.durationDays - first.durationDays;
      }
      if (sort === "participants-asc") {
        return (first.participantsCount || 1) - (second.participantsCount || 1);
      }

      return (
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime()
      );
    });
  }, [durationFilter, packages, participantsFilter, search, sessionsFilter, sort]);

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
          Brak pakietów dla wybranych kryteriów.
        </div>
      )}
    </div>
  );
}
