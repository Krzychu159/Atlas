"use client";

import { ChevronDown, Search } from "lucide-react";

export type ClientPackageFilter = "all" | "active-package" | "inactive-package";
export type ClientSort =
  | "newest"
  | "name"
  | "trainer"
  | "balance-desc"
  | "balance-asc"
  | "package-usage";

type ClientFiltersProps = {
  search: string;
  packageFilter: ClientPackageFilter;
  trainerFilter: string;
  sort: ClientSort;
  trainerOptions: string[];
  onSearchChange: (value: string) => void;
  onPackageFilterChange: (value: ClientPackageFilter) => void;
  onTrainerFilterChange: (value: string) => void;
  onSortChange: (value: ClientSort) => void;
};

const packageFilters: { label: string; value: ClientPackageFilter }[] = [
  { label: "Wszyscy", value: "all" },
  { label: "Aktywny pakiet", value: "active-package" },
  { label: "Bez aktywnego", value: "inactive-package" },
];

const sortOptions: { label: string; value: ClientSort }[] = [
  { label: "Najnowsi", value: "newest" },
  { label: "Alfabetycznie", value: "name" },
  { label: "Po trenerze", value: "trainer" },
  { label: "Balance malejąco", value: "balance-desc" },
  { label: "Balance rosnąco", value: "balance-asc" },
  { label: "Wykorzystanie pakietu", value: "package-usage" },
];

const selectClassName =
  "h-12 w-full appearance-none rounded-[var(--radius-lg)] bg-surface-container-low px-4 pr-10 text-sm text-on-surface outline-none transition-colors hover:bg-surface-container focus:bg-surface-container";

function SelectChevron() {
  return (
    <ChevronDown
      size={16}
      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-muted"
    />
  );
}

export default function ClientFilters({
  search,
  packageFilter,
  trainerFilter,
  sort,
  trainerOptions,
  onSearchChange,
  onPackageFilterChange,
  onTrainerFilterChange,
  onSortChange,
}: ClientFiltersProps) {
  return (
    <div className="card-shell p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-3">
          <Search size={18} className="shrink-0 text-on-surface-variant" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Szukaj po nazwisku, mailu lub telefonie..."
            className="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
          />
        </div>

        <div className="relative w-full shrink-0 lg:w-[250px]">
          <select
            value={trainerFilter}
            onChange={(event) => onTrainerFilterChange(event.target.value)}
            className={selectClassName}
          >
            <option value="all">Wszyscy trenerzy</option>
            {trainerOptions.map((trainer) => (
              <option key={trainer} value={trainer}>
                {trainer}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {packageFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onPackageFilterChange(filter.value)}
              className={`h-11 rounded-[var(--radius-lg)] px-4 text-label transition-colors ${
                packageFilter === filter.value
                  ? "bg-surface-container-low text-on-surface ghost-border"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="relative w-full shrink-0 lg:w-[250px]">
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as ClientSort)}
            className={selectClassName}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
      </div>
    </div>
  );
}
