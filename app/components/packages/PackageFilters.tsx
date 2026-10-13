"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { Input } from "@/app/components/ui/input";

import type { ParticipantsFilter, SessionsFilter, DurationFilter, PackageSort, PackageModeFilter } from "@/app/lib/packageFilters";
export type { ParticipantsFilter, SessionsFilter, DurationFilter, PackageSort } from "@/app/lib/packageFilters";

type PackageFiltersProps = {
  billingModeFilter?: PackageModeFilter;
  onBillingModeFilterChange?: (value: PackageModeFilter) => void;
  search: string;
  participantsFilter: ParticipantsFilter;
  sessionsFilter: SessionsFilter;
  durationFilter: DurationFilter;
  sort: PackageSort;
  onSearchChange: (value: string) => void;
  onParticipantsFilterChange: (value: ParticipantsFilter) => void;
  onSessionsFilterChange: (value: SessionsFilter) => void;
  onDurationFilterChange: (value: DurationFilter) => void;
  onSortChange: (value: PackageSort) => void;
};

export default function PackageFilters({
  billingModeFilter = "all",
  onBillingModeFilterChange,
  search,
  participantsFilter,
  sessionsFilter,
  durationFilter,
  sort,
  onSearchChange,
  onParticipantsFilterChange,
  onSessionsFilterChange,
  onDurationFilterChange,
  onSortChange,
}: PackageFiltersProps) {
  return (
    <div className="card-shell p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Szukaj pakietu..."
          icon={<Search size={18} />}
          className="h-12"
        />

        {onBillingModeFilterChange ? <CustomSelect label="Rodzaj oferty" value={billingModeFilter} onChange={value => onBillingModeFilterChange(value as PackageModeFilter)} options={[{ value: "all", label: "Wszystkie oferty" }, { value: "SessionBased", label: "Pakiety treningowe" }, { value: "PeriodBased", label: "Usługi okresowe" }]} /> : null}
        {billingModeFilter !== "PeriodBased" ? <CustomSelect
          icon={<SlidersHorizontal size={16} />}
          label="Uczestnicy"
          value={participantsFilter}
          onChange={(value) =>
            onParticipantsFilterChange(value as ParticipantsFilter)
          }
          options={[
            { value: "all", label: "Dowolnie" },
            { value: "solo", label: "1 osoba" },
            { value: "duo", label: "2 osoby" },
            { value: "trio", label: "3 osoby" },
            { value: "four", label: "4 osoby" },
            { value: "group", label: "Grupowe" },
          ]}
        /> : null}
        {billingModeFilter !== "PeriodBased" ? <CustomSelect
          label="Sesje"
          value={sessionsFilter}
          onChange={(value) => onSessionsFilterChange(value as SessionsFilter)}
          options={[
            { value: "all", label: "Dowolnie" },
            { value: "1-4", label: "1–4" },
            { value: "5-8", label: "5–8" },
            { value: "9-12", label: "9–12" },
            { value: "13+", label: "13+" },
          ]}
        /> : null}
        <CustomSelect
          label="Czas"
          value={durationFilter}
          onChange={(value) => onDurationFilterChange(value as DurationFilter)}
          options={[
            { value: "all", label: "Dowolnie" },
            { value: "up-to-30", label: "do 30 dni" },
            { value: "31-60", label: "31–60 dni" },
            { value: "61-90", label: "61–90 dni" },
            { value: "over-90", label: "90+ dni" },
          ]}
        />
        <CustomSelect
          label="Sortuj"
          value={sort}
          onChange={(value) => onSortChange(value as PackageSort)}
          options={[
            { value: "newest", label: "Najnowsze" },
            { value: "oldest", label: "Najstarsze" },
            { value: "price-asc", label: "Cena rosnąco" },
            { value: "price-desc", label: "Cena malejąco" },
            { value: "name-asc", label: "Nazwa A–Z" },
            { value: "name-desc", label: "Nazwa Z–A" },
          ]}
        />
      </div>
    </div>
  );
}
