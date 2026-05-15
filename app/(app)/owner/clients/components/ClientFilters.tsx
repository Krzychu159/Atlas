"use client";

import { Search } from "lucide-react";
import { CustomSelect } from "@/app/components/ui/custom-select";

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
  { label: "Saldo malejąco", value: "balance-desc" },
  { label: "Saldo rosnąco", value: "balance-asc" },
  { label: "Wykorzystanie pakietu", value: "package-usage" },
];

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
  const trainerSelectOptions = [
    { value: "all", label: "Wszyscy trenerzy" },
    ...trainerOptions.map((trainer) => ({ value: trainer, label: trainer })),
  ];

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

        <CustomSelect
          value={trainerFilter}
          options={trainerSelectOptions}
          onChange={onTrainerFilterChange}
          className="w-full shrink-0 lg:w-[250px]"
        />
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

        <CustomSelect
          value={sort}
          options={sortOptions}
          onChange={(value) => onSortChange(value as ClientSort)}
          className="w-full shrink-0 lg:w-[250px]"
        />
      </div>
    </div>
  );
}
