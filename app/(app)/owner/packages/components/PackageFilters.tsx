"use client";

import { Search, SlidersHorizontal } from "lucide-react";

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

        <Select
          icon={<SlidersHorizontal size={16} />}
          label="Uczestnicy"
          value={participantsFilter}
          onChange={(value) =>
            onParticipantsFilterChange(value as ParticipantsFilter)
          }
          options={[
            ["all", "Dowolnie"],
            ["solo", "1 osoba"],
            ["duo", "2 osoby"],
            ["group", "Grupowe"],
          ]}
        />
        <Select
          label="Sesje"
          value={sessionsFilter}
          onChange={(value) => onSessionsFilterChange(value as SessionsFilter)}
          options={[
            ["all", "Dowolnie"],
            ["short", "1-4"],
            ["medium", "5-10"],
            ["long", "11+"],
          ]}
        />
        <Select
          label="Czas"
          value={durationFilter}
          onChange={(value) => onDurationFilterChange(value as DurationFilter)}
          options={[
            ["all", "Dowolnie"],
            ["monthly", "do 31 dni"],
            ["quarterly", "32-90 dni"],
            ["long", "90+ dni"],
          ]}
        />
        <Select
          label="Sortuj"
          value={sort}
          onChange={(value) => onSortChange(value as PackageSort)}
          options={[
            ["newest", "Najnowsze"],
            ["price-asc", "Cena rosnąco"],
            ["price-desc", "Cena malejąco"],
            ["sessions-desc", "Najwięcej sesji"],
            ["duration-desc", "Najdłuższe"],
            ["participants-asc", "Uczestnicy"],
          ]}
        />
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <label className="rounded-[var(--radius-lg)] bg-surface-container-lowest px-3 py-2">
      <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {icon}
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent text-sm font-semibold text-on-surface outline-none"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
