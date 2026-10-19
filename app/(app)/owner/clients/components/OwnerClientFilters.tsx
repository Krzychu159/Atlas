"use client";

import { useState } from "react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { FilterSearchField, FilterToolbar } from "@/app/components/ui/list/FilterToolbar";
import { OwnerRemoteSelect } from "../../components/OwnerRemoteSelect";
import type { ClientPackageFilter } from "@/app/components/clients/client-list-display";

export type OwnerClientSort = "newest" | "name" | "trainer" | "package-usage" | "amount-due-desc" | "amount-due-asc";

export type OwnerClientFiltersValue = {
  search: string;
  packageFilter: ClientPackageFilter;
  trainerFilter: string;
  amountDueOnly: boolean;
  sort: OwnerClientSort;
};

export const defaultOwnerClientFilters: OwnerClientFiltersValue = {
  search: "",
  packageFilter: "all",
  trainerFilter: "all",
  amountDueOnly: false,
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
  const advancedActiveCount =
    (value.packageFilter !== defaultOwnerClientFilters.packageFilter ? 1 : 0) +
    (value.amountDueOnly ? 1 : 0);

  return (
    <FilterToolbar
      search={
        <FilterSearchField
          value={value.search}
          onChange={(nextValue) => update("search", nextValue)}
          placeholder="Nazwisko, e-mail lub telefon"
        />
      }
      gridClassName="md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_240px_240px_auto_auto]"
      advancedId="client-advanced-filters"
      advancedOpen={advancedOpen}
      advancedActiveCount={advancedActiveCount}
      onAdvancedOpenChange={setAdvancedOpen}
      advanced={
        <>
          <CustomSelect
            label="Pakiet"
            value={value.packageFilter}
            onChange={(nextValue) => update("packageFilter", nextValue as ClientPackageFilter)}
            options={packageOptions}
          />
          <CustomSelect
            label="Płatności"
            value={value.amountDueOnly ? "due" : "all"}
            onChange={(nextValue) => update("amountDueOnly", nextValue === "due")}
            options={amountDueOptions}
          />
        </>
      }
      canClear={
        value.search !== defaultOwnerClientFilters.search ||
        value.packageFilter !== defaultOwnerClientFilters.packageFilter ||
        value.trainerFilter !== defaultOwnerClientFilters.trainerFilter ||
        value.amountDueOnly !== defaultOwnerClientFilters.amountDueOnly ||
        value.sort !== defaultOwnerClientFilters.sort
      }
      onClear={() => onChange(defaultOwnerClientFilters)}
    >
      <OwnerRemoteSelect kind="trainers" label="Trener" value={value.trainerFilter} locationId={locationId} onChange={nextValue => update("trainerFilter", nextValue)} />
      <CustomSelect
        label="Sortuj"
        value={value.sort}
        onChange={(nextValue) => update("sort", nextValue as OwnerClientSort)}
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

const amountDueOptions = [
  { value: "all", label: "Wszyscy" },
  { value: "due", label: "Z kwotą do zapłaty" },
];

const sortOptions = [
  { value: "package-usage", label: "Wykorzystanie pakietu" },
  { value: "newest", label: "Najnowsi" },
  { value: "name", label: "Alfabetycznie" },
  { value: "trainer", label: "Po trenerze" },
  { value: "amount-due-desc", label: "Do zapłaty: najwięcej" },
  { value: "amount-due-asc", label: "Do zapłaty: najmniej" },
];
