"use client";

import { useState } from "react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { FilterSearchField, FilterToolbar } from "@/app/components/ui/list/FilterToolbar";
import type { ClientPackageFilter } from "@/app/components/clients/client-list-display";

// Only sorts supported by the trainer's client list.
export type TrainerClientSort = "package-usage" | "newest" | "name" | "balance-desc" | "balance-asc";

export type TrainerClientFiltersValue = {
  search: string;
  packageFilter: ClientPackageFilter;
  sort: TrainerClientSort;
};

export const defaultTrainerClientFilters: TrainerClientFiltersValue = {
  search: "",
  packageFilter: "all",
  sort: "package-usage",
};

type TrainerClientFiltersProps = {
  value: TrainerClientFiltersValue;
  onChange: (value: TrainerClientFiltersValue) => void;
};

export default function TrainerClientFilters({ value, onChange }: TrainerClientFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const update = <Key extends keyof TrainerClientFiltersValue>(
    key: Key,
    nextValue: TrainerClientFiltersValue[Key],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <FilterToolbar
      search={
        <FilterSearchField
          value={value.search}
          maxLength={100}
          onChange={(nextValue) => update("search", nextValue)}
          placeholder="Nazwisko lub e-mail"
        />
      }
      gridClassName="md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_240px_auto_auto]"
      advancedId="trainer-client-advanced-filters"
      advancedOpen={advancedOpen}
      advancedActiveCount={value.packageFilter !== defaultTrainerClientFilters.packageFilter ? 1 : 0}
      onAdvancedOpenChange={setAdvancedOpen}
      advanced={
        <CustomSelect
          label="Pakiet"
          value={value.packageFilter}
          onChange={(nextValue) => update("packageFilter", nextValue as ClientPackageFilter)}
          options={packageOptions}
        />
      }
      canClear={
        value.search !== defaultTrainerClientFilters.search ||
        value.packageFilter !== defaultTrainerClientFilters.packageFilter ||
        value.sort !== defaultTrainerClientFilters.sort
      }
      onClear={() => onChange(defaultTrainerClientFilters)}
    >
      <CustomSelect
        label="Sortuj"
        value={value.sort}
        onChange={(nextValue) => update("sort", nextValue as TrainerClientSort)}
        options={sortOptions}
      />
    </FilterToolbar>
  );
}

const packageOptions = [
  { value: "all", label: "Wszyscy" },
  { value: "active-package", label: "Aktywny pakiet" },
  { value: "inactive-package", label: "Bez aktywnego" },
];

const sortOptions = [
  { value: "package-usage", label: "Wykorzystanie pakietu" },
  { value: "newest", label: "Najnowsi" },
  { value: "name", label: "Alfabetycznie" },
  { value: "balance-desc", label: "Saldo: najwyższe" },
  { value: "balance-asc", label: "Saldo: najniższe" },
];
