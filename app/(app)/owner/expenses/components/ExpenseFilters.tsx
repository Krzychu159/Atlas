"use client";

import { Building2, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { DateRangeFilter } from "@/app/components/ui/date-range-filter";
import type { Location } from "@/app/lib/owner/locations";
import { getCurrentMonthRange, type DictionaryOption, type LegalEntityOption } from "../expense-config";

export type ExpenseFiltersValue = {
  legalEntityId: string;
  locationId: string;
  category: string;
  paymentStatus: string;
  search: string;
  from: string;
  to: string;
  dueFrom: string;
  dueTo: string;
  paidFrom: string;
  paidTo: string;
  isOverdue: string;
};

const initialMonth = getCurrentMonthRange();

export const initialExpenseFilters: ExpenseFiltersValue = {
  legalEntityId: "all",
  locationId: "all",
  category: "all",
  paymentStatus: "all",
  search: "",
  from: initialMonth.from,
  to: initialMonth.to,
  dueFrom: "",
  dueTo: "",
  paidFrom: "",
  paidTo: "",
  isOverdue: "all",
};

type ExpenseFiltersProps = {
  value: ExpenseFiltersValue;
  categories: DictionaryOption[];
  paymentStatuses: DictionaryOption[];
  legalEntities: LegalEntityOption[];
  locations: Location[];
  advancedOpen: boolean;
  hasActiveFilters: boolean;
  onChange: <K extends keyof ExpenseFiltersValue>(key: K, value: ExpenseFiltersValue[K]) => void;
  onIssueDateChange: (range: { from: string; to: string }) => void;
  onDueDateChange: (range: { from: string; to: string }) => void;
  onPaidDateChange: (range: { from: string; to: string }) => void;
  onAdvancedToggle: () => void;
  onClear: () => void;
};

// Sekcja: Filtry wydatków
export default function ExpenseFilters({
  value,
  categories,
  paymentStatuses,
  legalEntities,
  locations,
  advancedOpen,
  hasActiveFilters,
  onChange,
  onIssueDateChange,
  onDueDateChange,
  onPaidDateChange,
  onAdvancedToggle,
  onClear,
}: ExpenseFiltersProps) {
  return (
    <section className="card-shell overflow-visible p-4 md:p-5">
      {/* Podstawowe filtry listy */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative min-w-0 flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-muted" />
          <input
            value={value.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Szukaj kontrahenta, faktury lub opisu..."
            className="h-12 w-full rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest pl-11 pr-4 text-sm text-on-surface outline-none transition placeholder:text-on-surface-muted hover:border-white/10 focus:border-primary-light/40"
          />
        </label>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:flex xl:w-auto">
          <DateRangeFilter
            label="Data wystawienia"
            value={{ from: value.from, to: value.to }}
            onChange={onIssueDateChange}
            className="xl:w-[230px]"
          />
          <CustomSelect
            label="Status"
            value={value.paymentStatus}
            options={dictionaryOptions(paymentStatuses)}
            onChange={(nextValue) => onChange("paymentStatus", nextValue)}
            className="xl:w-[180px]"
          />
          <CustomSelect
            label="Kategoria"
            value={value.category}
            options={dictionaryOptions(categories)}
            onChange={(nextValue) => onChange("category", nextValue)}
            className="xl:w-[190px]"
          />
          <Button
            type="button"
            variant={advancedOpen ? "primary" : "secondary"}
            icon={<SlidersHorizontal size={16} />}
            onClick={onAdvancedToggle}
            className="xl:w-auto"
          >
            Więcej filtrów
          </Button>
        </div>
      </div>

      <MobileQuickFilters
        value={value.paymentStatus}
        onChange={(nextValue) => onChange("paymentStatus", nextValue)}
      />

      {/* Filtry działalności, lokalizacji i terminów */}
      {advancedOpen ? (
        <div className="mt-4 grid gap-3 border-t border-white/5 pt-4 sm:grid-cols-2 xl:grid-cols-4">
          <CustomSelect
            label="Działalność"
            value={value.legalEntityId}
            icon={<Building2 size={16} />}
            options={[
              { value: "all", label: "Wszystkie działalności" },
              ...legalEntities.map((entity) => ({ value: String(entity.id), label: entity.name })),
            ]}
            onChange={(nextValue) => onChange("legalEntityId", nextValue)}
          />
          <CustomSelect
            label="Lokalizacja"
            value={value.locationId}
            icon={<MapPin size={16} />}
            options={[
              { value: "all", label: "Wszystkie lokalizacje" },
              ...locations.map((location) => ({
                value: String(location.id),
                label: location.name || location.city || `#${location.id}`,
              })),
            ]}
            onChange={(nextValue) => onChange("locationId", nextValue)}
          />
          <DateRangeFilter
            label="Termin płatności"
            value={{ from: value.dueFrom, to: value.dueTo }}
            onChange={onDueDateChange}
          />
          <DateRangeFilter
            label="Data opłacenia"
            value={{ from: value.paidFrom, to: value.paidTo }}
            onChange={onPaidDateChange}
          />
          <CustomSelect
            label="Przeterminowanie"
            value={value.isOverdue}
            options={[
              { value: "all", label: "Wszystkie" },
              { value: "true", label: "Tylko zaległe" },
              { value: "false", label: "Bez zaległych" },
            ]}
            onChange={(nextValue) => onChange("isOverdue", nextValue)}
          />
          <div className="flex items-end sm:col-span-2">
            <Button
              type="button"
              variant="ghost"
              icon={<X size={15} />}
              onClick={onClear}
              disabled={!hasActiveFilters}
              className="w-full sm:w-auto"
            >
              Wyczyść filtry
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MobileQuickFilters({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = [
    { value: "all", label: "Wszystkie" },
    { value: "0", label: "Nieopłacone" },
    { value: "2", label: "Zaległe" },
  ];

  return (
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`shrink-0 rounded-full px-3 py-2 text-[0.68rem] font-bold uppercase tracking-wide transition ${
            value === option.value
              ? "bg-primary text-on-primary"
              : "bg-surface-container-high text-on-surface-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function dictionaryOptions(options: DictionaryOption[]) {
  return [
    { value: "all", label: "Wszystkie" },
    ...options.map((option) => ({ value: String(option.value), label: option.label })),
  ];
}
