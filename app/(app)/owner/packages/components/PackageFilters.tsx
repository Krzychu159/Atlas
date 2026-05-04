"use client";

import { Search, SlidersHorizontal } from "lucide-react";

export type PackageFilter = "all" | "active" | "archived";

type PackageFiltersProps = {
  search: string;
  activeFilter: PackageFilter;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: PackageFilter) => void;
};

const filters: { label: string; value: PackageFilter }[] = [
  { label: "Wszystkie", value: "all" },
  { label: "Aktywne", value: "active" },
  { label: "Archiwalne", value: "archived" },
];

export default function PackageFilters({
  search,
  activeFilter,
  onSearchChange,
  onFilterChange,
}: PackageFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="card-shell p-3 flex items-center gap-3 flex-1">
          <Search size={18} className="text-on-surface-variant shrink-0" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Szukaj pakietu..."
            className="w-full bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-muted"
          />
        </div>

        <button className="hidden md:flex h-14 px-5 rounded-[var(--radius-lg)] bg-surface-container text-on-surface-variant items-center gap-2">
          <SlidersHorizontal size={15} />
          Kategorie
        </button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`h-11 px-5 rounded-full text-label whitespace-nowrap transition-colors ${
              activeFilter === filter.value
                ? "bg-primary-light text-primary-container"
                : "bg-surface-container text-on-surface-variant"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
