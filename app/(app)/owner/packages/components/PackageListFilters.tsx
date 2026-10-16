"use client";

import { useState } from "react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { FilterSearchField, FilterToolbar } from "@/app/components/ui/list/FilterToolbar";
import type {
  DurationFilter,
  PackageActivityFilter,
  PackageModeFilter,
  PackageSort,
  ParticipantsFilter,
  SessionsFilter,
} from "@/app/lib/packageFilters";

export type PackageListFiltersValue = {
  search: string;
  billingModeFilter: PackageModeFilter;
  participantsFilter: ParticipantsFilter;
  sessionsFilter: SessionsFilter;
  durationFilter: DurationFilter;
  activityFilter: PackageActivityFilter;
  sort: PackageSort;
};

export const defaultPackageListFilters: PackageListFiltersValue = {
  search: "",
  billingModeFilter: "all",
  participantsFilter: "all",
  sessionsFilter: "all",
  durationFilter: "all",
  activityFilter: "all",
  sort: "newest",
};

type PackageListFiltersProps = {
  value: PackageListFiltersValue;
  onChange: (value: PackageListFiltersValue) => void;
};

export default function PackageListFilters({ value, onChange }: PackageListFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const periodOnly = value.billingModeFilter === "PeriodBased";
  const advancedActiveCount = [
    !periodOnly && value.participantsFilter !== "all",
    !periodOnly && value.sessionsFilter !== "all",
    value.durationFilter !== "all",
    value.activityFilter !== "all",
  ].filter(Boolean).length;
  // Sorting only reorders the list, so it does not count as an active filter.
  const narrowsList = advancedActiveCount > 0 || value.search.trim() !== "" || value.billingModeFilter !== "all";

  const update = <Key extends keyof PackageListFiltersValue>(
    key: Key,
    nextValue: PackageListFiltersValue[Key],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <FilterToolbar
      search={
        <FilterSearchField
          value={value.search}
          onChange={(nextValue) => update("search", nextValue)}
          placeholder="Nazwa, opis lub lokalizacja"
        />
      }
      gridClassName="md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_240px_200px_auto_auto]"
      advancedId="package-advanced-filters"
      advancedOpen={advancedOpen}
      advancedActiveCount={advancedActiveCount}
      onAdvancedOpenChange={setAdvancedOpen}
      canClear={narrowsList}
      onClear={() => onChange({ ...defaultPackageListFilters, sort: value.sort })}
      advanced={
        <>
          <CustomSelect
            label="Status"
            value={value.activityFilter}
            onChange={(nextValue) => update("activityFilter", nextValue as PackageActivityFilter)}
            options={activityOptions}
          />
          {!periodOnly ? (
            <CustomSelect
              label="Uczestnicy"
              value={value.participantsFilter}
              onChange={(nextValue) => update("participantsFilter", nextValue as ParticipantsFilter)}
              options={participantsOptions}
            />
          ) : null}
          {!periodOnly ? (
            <CustomSelect
              label="Sesje"
              value={value.sessionsFilter}
              onChange={(nextValue) => update("sessionsFilter", nextValue as SessionsFilter)}
              options={sessionsOptions}
            />
          ) : null}
          <CustomSelect
            label="Czas trwania"
            value={value.durationFilter}
            onChange={(nextValue) => update("durationFilter", nextValue as DurationFilter)}
            options={durationOptions}
          />
        </>
      }
    >
      <CustomSelect
        label="Rodzaj oferty"
        value={value.billingModeFilter}
        onChange={(nextValue) => {
          const billingModeFilter = nextValue as PackageModeFilter;
          onChange(
            billingModeFilter === "PeriodBased"
              ? { ...value, billingModeFilter, participantsFilter: "all", sessionsFilter: "all" }
              : { ...value, billingModeFilter },
          );
        }}
        options={billingModeOptions}
      />
      <CustomSelect
        label="Sortuj"
        value={value.sort}
        onChange={(nextValue) => update("sort", nextValue as PackageSort)}
        options={sortOptions}
      />
    </FilterToolbar>
  );
}

const billingModeOptions = [
  { value: "all", label: "Wszystkie oferty" },
  { value: "SessionBased", label: "Pakiety treningowe" },
  { value: "PeriodBased", label: "Usługi okresowe" },
];

const activityOptions = [
  { value: "all", label: "Wszystkie" },
  { value: "active", label: "Aktywne" },
  { value: "inactive", label: "Nieaktywne" },
];

const participantsOptions = [
  { value: "all", label: "Dowolnie" },
  { value: "solo", label: "1 osoba" },
  { value: "duo", label: "2 osoby" },
  { value: "trio", label: "3 osoby" },
  { value: "four", label: "4 osoby" },
  { value: "group", label: "Grupowe" },
];

const sessionsOptions = [
  { value: "all", label: "Dowolnie" },
  { value: "1-4", label: "1–4" },
  { value: "5-8", label: "5–8" },
  { value: "9-12", label: "9–12" },
  { value: "13+", label: "13+" },
];

const durationOptions = [
  { value: "all", label: "Dowolnie" },
  { value: "up-to-30", label: "do 30 dni" },
  { value: "31-60", label: "31–60 dni" },
  { value: "61-90", label: "61–90 dni" },
  { value: "over-90", label: "90+ dni" },
];

const sortOptions = [
  { value: "newest", label: "Najnowsze" },
  { value: "oldest", label: "Najstarsze" },
  { value: "price-asc", label: "Cena rosnąco" },
  { value: "price-desc", label: "Cena malejąco" },
  { value: "name-asc", label: "Nazwa A–Z" },
  { value: "name-desc", label: "Nazwa Z–A" },
];
