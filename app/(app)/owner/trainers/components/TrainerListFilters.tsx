"use client";

import { CustomSelect } from "@/app/components/ui/custom-select";
import { FilterSearchField, FilterToolbar } from "@/app/components/ui/list/FilterToolbar";
import {
  defaultTrainerListFilters,
  type TrainerListFiltersValue,
  type TrainerSort,
  type TrainerStatusFilter,
} from "../trainer-list-display";

type TrainerListFiltersProps = {
  value: TrainerListFiltersValue;
  onChange: (value: TrainerListFiltersValue) => void;
};

export default function TrainerListFilters({ value, onChange }: TrainerListFiltersProps) {
  const update = <Key extends keyof TrainerListFiltersValue>(
    key: Key,
    nextValue: TrainerListFiltersValue[Key],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <FilterToolbar
      search={
        <FilterSearchField
          value={value.search}
          onChange={(nextValue) => update("search", nextValue)}
          placeholder="Imię, nazwisko, e-mail lub specjalizacja"
        />
      }
      gridClassName="md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px_220px_auto]"
      canClear={
        value.search !== defaultTrainerListFilters.search ||
        value.status !== defaultTrainerListFilters.status ||
        value.sort !== defaultTrainerListFilters.sort
      }
      onClear={() => onChange(defaultTrainerListFilters)}
    >
      <CustomSelect
        label="Status"
        value={value.status}
        onChange={(nextValue) => update("status", nextValue as TrainerStatusFilter)}
        options={statusOptions}
      />
      <CustomSelect
        label="Sortuj"
        value={value.sort}
        onChange={(nextValue) => update("sort", nextValue as TrainerSort)}
        options={sortOptions}
      />
    </FilterToolbar>
  );
}

const statusOptions = [
  { value: "all", label: "Wszyscy" },
  { value: "active", label: "Aktywni" },
  { value: "paused", label: "Wstrzymani" },
  { value: "inactive", label: "Nieaktywni" },
];

const sortOptions = [
  { value: "name-asc", label: "Alfabetycznie A–Z" },
  { value: "name-desc", label: "Alfabetycznie Z–A" },
  { value: "sessions-desc", label: "Najwięcej sesji" },
  { value: "experience-desc", label: "Największe doświadczenie" },
  { value: "newest", label: "Ostatnio dodani" },
];
