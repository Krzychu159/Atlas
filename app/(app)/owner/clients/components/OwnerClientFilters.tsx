"use client";

import { useState } from "react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { FilterSearchField, FilterToolbar } from "@/app/components/ui/list/FilterToolbar";
import { OwnerRemoteSelect } from "../../components/OwnerRemoteSelect";
import type { ClientPackageFilter, ClientSort } from "./ClientFilters";

export type OwnerClientFiltersValue = {
  search: string;
  packageFilter: ClientPackageFilter;
  trainerFilter: string;
  sort: ClientSort;
};

export const defaultOwnerClientFilters: OwnerClientFiltersValue = {
  search: "",
  packageFilter: "all",
  trainerFilter: "all",
  sort: "newest",
};

type OwnerClientFiltersProps = {
  value: OwnerClientFiltersValue;
  locationId?: number | null;
  onChange: (value: OwnerClientFiltersValue) => void;
};

export default function OwnerClientFilters({ value, locationId, onChange }: OwnerClientFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const update = <Key extends keyof OwnerClientFiltersValue>(
    key: Key,
    nextValue: OwnerClientFiltersValue[Key],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <FilterToolbar
      search={
        <FilterSearchField
          value={value.search}
          onChange={(nextValue) => update("search", nextValue)}
          placeholder="Imię, nazwisko lub e-mail"
        />
      }
      gridClassName="md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_240px_240px_auto_auto]"
      advancedId="client-advanced-filters"
      advancedOpen={advancedOpen}
      advancedActiveCount={value.packageFilter !== defaultOwnerClientFilters.packageFilter ? 1 : 0}
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
        value.search !== defaultOwnerClientFilters.search ||
        value.packageFilter !== defaultOwnerClientFilters.packageFilter ||
        value.trainerFilter !== defaultOwnerClientFilters.trainerFilter ||
        value.sort !== defaultOwnerClientFilters.sort
      }
      onClear={() => onChange(defaultOwnerClientFilters)}
    >
      <OwnerRemoteSelect kind="trainers" label="Trener" value={value.trainerFilter} locationId={locationId} onChange={nextValue => update("trainerFilter", nextValue)} />
      <CustomSelect
        label="Sortuj"
        value={value.sort}
        onChange={(nextValue) => update("sort", nextValue as ClientSort)}
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
  { value: "package-usage", label: "Wykorzystanie pakietu (niedostępne)", disabled: true },
  { value: "newest", label: "Najnowsi" },
  { value: "name", label: "Alfabetycznie" },
  { value: "trainer", label: "Po trenerze (niedostępne)", disabled: true },
  { value: "balance-desc", label: "Saldo malejąco (niedostępne)", disabled: true },
  { value: "balance-asc", label: "Saldo rosnąco (niedostępne)", disabled: true },
];
