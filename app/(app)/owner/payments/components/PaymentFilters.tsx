"use client";

import { CustomSelect } from "@/app/components/ui/custom-select";
import { DateRangeFilter } from "@/app/components/ui/date-range-filter";
import { FilterSearchField, FilterToolbar } from "@/app/components/ui/list/FilterToolbar";

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

const advancedKeys: (keyof PaymentFiltersValue)[] = ["status", "source", "overpayment", "amountMin", "amountMax"];

type PaymentFiltersProps = {
  serverPagination?: boolean;
  value: PaymentFiltersValue;
  advancedOpen: boolean;
  onAdvancedOpenChange: (open: boolean) => void;
  onChange: (value: PaymentFiltersValue) => void;
  onClear: () => void;
};

export function PaymentFilters({
  serverPagination = false,
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
    <FilterToolbar
      search={
        <FilterSearchField
          value={value.client}
          onChange={(nextValue) => update("client", nextValue)}
          placeholder={serverPagination ? "Imię, nazwisko, e-mail lub ID klienta" : "Imię, nazwisko lub ID klienta"}
        />
      }
      gridClassName="md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_260px_220px_auto_auto]"
      advancedId="payment-advanced-filters"
      advancedGridClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)]"
      advancedOpen={advancedOpen}
      onAdvancedOpenChange={onAdvancedOpenChange}
      advancedActiveCount={advancedKeys.filter((key) => value[key] !== defaultPaymentFilters[key]).length}
      canClear={(Object.keys(defaultPaymentFilters) as (keyof PaymentFiltersValue)[]).some((key) => value[key] !== defaultPaymentFilters[key])}
      onClear={onClear}
      advanced={
        <>
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
        </>
      }
    >
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
    </FilterToolbar>
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
