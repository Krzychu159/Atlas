"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { CustomSelect } from "@/app/components/ui/custom-select";

export type ParticipantsFilter = "all" | "solo" | "duo" | "group";
export type SessionsFilter = "all" | "short" | "medium" | "long";
export type DurationFilter = "all" | "monthly" | "quarterly" | "long";
export type PackageSort =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "sessions-desc"
  | "duration-desc"
  | "participants-asc";

type PackageFiltersProps = {
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
      <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px_190px_190px]">
        <label className="flex h-12 items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4">
          <Search size={18} className="shrink-0 text-on-surface-muted" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Szukaj pakietu..."
            className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
          />
        </label>

        <CustomSelect
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
            { value: "group", label: "Grupowe" },
          ]}
        />
        <CustomSelect
          label="Sesje"
          value={sessionsFilter}
          onChange={(value) => onSessionsFilterChange(value as SessionsFilter)}
          options={[
            { value: "all", label: "Dowolnie" },
            { value: "short", label: "1-4" },
            { value: "medium", label: "5-10" },
            { value: "long", label: "11+" },
          ]}
        />
        <CustomSelect
          label="Czas"
          value={durationFilter}
          onChange={(value) => onDurationFilterChange(value as DurationFilter)}
          options={[
            { value: "all", label: "Dowolnie" },
            { value: "monthly", label: "do 31 dni" },
            { value: "quarterly", label: "32-90 dni" },
            { value: "long", label: "90+ dni" },
          ]}
        />
        <CustomSelect
          label="Sortuj"
          value={sort}
          onChange={(value) => onSortChange(value as PackageSort)}
          options={[
            { value: "newest", label: "Najnowsze" },
            { value: "price-asc", label: "Cena rosnąco" },
            { value: "price-desc", label: "Cena malejąco" },
            { value: "sessions-desc", label: "Najwięcej sesji" },
            { value: "duration-desc", label: "Najdłuższe" },
            { value: "participants-asc", label: "Uczestnicy" },
          ]}
        />
      </div>
    </div>
  );
}
