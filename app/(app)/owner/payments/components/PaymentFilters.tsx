"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { DateRangeFilter } from "@/app/components/ui/date-range-filter";

export type PaymentFiltersValue = {
  client: string;
  status: string;
  source: string;
  overpayment: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  sortBy: string;
};

export const defaultPaymentFilters: PaymentFiltersValue = {
  client: "",
  status: "all",
  source: "all",
  overpayment: "all",
  dateFrom: "",
  dateTo: "",
  amountMin: "",
  amountMax: "",
  sortBy: "newest",
};

type PaymentFiltersProps = {
  value: PaymentFiltersValue;
  advancedOpen: boolean;
  onAdvancedOpenChange: (open: boolean) => void;
  onChange: (value: PaymentFiltersValue) => void;
  onClear: () => void;
};

export function PaymentFilters({
  value,
  advancedOpen,
  onAdvancedOpenChange,
  onChange,
  onClear,
}: PaymentFiltersProps) {
  const update = <Key extends keyof PaymentFiltersValue>(
    key: Key,
    nextValue: PaymentFiltersValue[Key],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <section className="card-shell p-4 md:p-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_260px_220px_auto_auto] xl:items-end">
        <PaymentSearchField
          value={value.client}
          onChange={(nextValue) => update("client", nextValue)}
        />
        <DateRangeFilter
          value={{ from: value.dateFrom, to: value.dateTo }}
          onChange={(range) =>
            onChange({ ...value, dateFrom: range.from, dateTo: range.to })
          }
        />
        <CustomSelect
          label="Sortuj"
          value={value.sortBy}
          onChange={(nextValue) => update("sortBy", nextValue)}
          options={paymentSortOptions}
        />
        <Button
          variant={advancedOpen ? "primary" : "secondary"}
          icon={<SlidersHorizontal size={16} />}
          onClick={() => onAdvancedOpenChange(!advancedOpen)}
          className="w-full xl:w-auto"
          aria-expanded={advancedOpen}
          aria-controls="payment-advanced-filters"
        >
          Filtry
        </Button>
        <Button variant="ghost" onClick={onClear} className="w-full xl:w-auto">
          Wyczyść
        </Button>
      </div>

      {advancedOpen ? (
        <div
          id="payment-advanced-filters"
          className="mt-4 rounded-[var(--radius-lg)] bg-surface-container-low p-3"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)]">
            <CustomSelect
              label="Status"
              value={value.status}
              onChange={(nextValue) => update("status", nextValue)}
              options={paymentStatusOptions}
            />
            <CustomSelect
              label="Źródło"
              value={value.source}
              onChange={(nextValue) => update("source", nextValue)}
              options={paymentSourceOptions}
            />
            <CustomSelect
              label="Nadpłata"
              value={value.overpayment}
              onChange={(nextValue) => update("overpayment", nextValue)}
              options={overpaymentOptions}
            />
            <MoneyFilterField
              label="Kwota od"
              value={value.amountMin}
              onChange={(nextValue) => update("amountMin", nextValue)}
            />
            <MoneyFilterField
              label="Kwota do"
              value={value.amountMax}
              onChange={(nextValue) => update("amountMax", nextValue)}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PaymentSearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-label text-on-surface-muted">Szukaj</span>
      <div className="mt-2 flex h-12 items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 transition focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]">
        <Search size={17} className="shrink-0 text-on-surface-muted" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Imię, nazwisko lub ID klienta"
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface-muted"
        />
      </div>
    </label>
  );
}

function MoneyFilterField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-12 w-full flex-col justify-center rounded-[var(--radius-lg)] bg-surface-container-lowest px-3 transition focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] hover:bg-surface-container">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        placeholder="0,00"
        className="mt-0.5 h-5 w-full bg-transparent text-sm font-semibold text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface-muted"
      />
    </label>
  );
}

const paymentStatusOptions = [
  { value: "all", label: "Wszystkie" },
  { value: "1", label: "Do potwierdzenia" },
  { value: "2", label: "Opłacone" },
  { value: "3", label: "Odrzucone" },
  { value: "4", label: "Anulowane" },
  { value: "5", label: "Cofnięte" },
];

const paymentSourceOptions = [
  { value: "all", label: "Wszystkie" },
  { value: "1", label: "Obsługa" },
  { value: "2", label: "Klient" },
  { value: "3", label: "System" },
];

const overpaymentOptions = [
  { value: "all", label: "Wszystkie" },
  { value: "yes", label: "Z nadpłatą" },
  { value: "no", label: "Bez nadpłaty" },
];

const paymentSortOptions = [
  { value: "newest", label: "Najnowsze" },
  { value: "oldest", label: "Najstarsze" },
  { value: "amountDesc", label: "Kwota malejąco" },
  { value: "amountAsc", label: "Kwota rosnąco" },
  { value: "clientAsc", label: "Klient A-Z" },
  { value: "overpaymentDesc", label: "Największa nadpłata" },
];
