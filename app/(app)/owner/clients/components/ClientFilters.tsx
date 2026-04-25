"use client";

import { Search } from "lucide-react";

export type ClientFilter = "active" | "suspended" | "new";

type ClientFiltersProps = {
  search: string;
  activeFilter: ClientFilter;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: ClientFilter) => void;
};

const filters: { label: string; value: ClientFilter }[] = [
  { label: "Aktywni", value: "active" },
  { label: "Zawieszeni", value: "suspended" },
  { label: "Nowi", value: "new" },
];

export default function ClientFilters({
  search,
  activeFilter,
  onSearchChange,
  onFilterChange,
}: ClientFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="card-shell p-3 flex items-center gap-3 flex-1">
        <Search size={18} className="text-on-surface-variant shrink-0" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Szukaj po nazwisku, mailu lub celu..."
          className="w-full bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-muted"
        />
      </div>

      <div className="hidden lg:flex items-center gap-3 shrink-0">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`h-14 px-6 rounded-[var(--radius-lg)] text-label transition-colors ${
              activeFilter === filter.value
                ? "bg-surface-container-low text-on-primary ghost-border"
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
