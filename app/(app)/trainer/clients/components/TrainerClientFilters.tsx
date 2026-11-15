"use client";

import { useState } from "react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { FilterSearchField, FilterToolbar } from "@/app/components/ui/list/FilterToolbar";
import type { ClientPackageFilter } from "@/app/components/clients/client-list-display";

// Only sorts supported by the trainer's client list.
export type TrainerClientSort = "package-usage" | "newest" | "name" | "amount-due-desc" | "amount-due-asc" | "rewards-pending-desc" | "rewards-claimed-desc";

export type TrainerClientFiltersValue = {
  search: string;
  packageFilter: ClientPackageFilter;
  amountDueOnly: boolean;
  pendingRewardOnly: boolean;
  sort: TrainerClientSort;
};

export const defaultTrainerClientFilters: TrainerClientFiltersValue = {
  search: "",
  packageFilter: "all",
  amountDueOnly: false,
  pendingRewardOnly: false,
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
      advancedActiveCount={(value.packageFilter !== defaultTrainerClientFilters.packageFilter ? 1 : 0) + (value.amountDueOnly ? 1 : 0) + (value.pendingRewardOnly ? 1 : 0)}
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
          <CustomSelect
            label="Nagrody"
            value={value.pendingRewardOnly ? "pending" : "all"}
            onChange={(nextValue) => update("pendingRewardOnly", nextValue === "pending")}
            options={rewardOptions}
          />
        </>
      }
      canClear={
        value.search !== defaultTrainerClientFilters.search ||
        value.packageFilter !== defaultTrainerClientFilters.packageFilter ||
        value.amountDueOnly !== defaultTrainerClientFilters.amountDueOnly ||
        value.pendingRewardOnly !== defaultTrainerClientFilters.pendingRewardOnly ||
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

const amountDueOptions = [
  { value: "all", label: "Wszyscy" },
  { value: "due", label: "Z kwotą do zapłaty" },
];

const rewardOptions = [
  { value: "all", label: "Wszyscy" },
  { value: "pending", label: "Z nagrodą do wydania" },
];

const sortOptions = [
  { value: "package-usage", label: "Wykorzystanie pakietu" },
  { value: "newest", label: "Najnowsi" },
  { value: "name", label: "Alfabetycznie" },
  { value: "amount-due-desc", label: "Do zapłaty: najwięcej" },
  { value: "amount-due-asc", label: "Do zapłaty: najmniej" },
  { value: "rewards-pending-desc", label: "Nagrody do wydania" },
  { value: "rewards-claimed-desc", label: "Wydane nagrody: najwięcej" },
];
