"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { DateRangeFilter } from "@/app/components/ui/date-range-filter";
import { FilterSearchField, FilterToolbar } from "@/app/components/ui/list/FilterToolbar";
import { MonthPicker } from "@/app/components/ui/month-picker";
import { currentPolishMonthValue, shiftMonthValue } from "@/app/lib/formatters/month";

export type PaymentFiltersValue = {
  client: string;
  /** "YYYY-MM"; empty when a custom date range (or no date limit) is used instead. */
  month: string;
  trainerId: string;
  status: string;
  source: string;
  overpayment: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  sortBy: string;
};

// The current month matters most for bookkeeping, so it is the starting point of the list.
export function getDefaultPaymentFilters(): PaymentFiltersValue {
  return {
    client: "",
    month: currentPolishMonthValue(),
    trainerId: "all",
    status: "all",
    source: "all",
    overpayment: "all",
    dateFrom: "",
    dateTo: "",
    amountMin: "",
    amountMax: "",
    sortBy: "newest",
  };
}

const advancedKeys: (keyof PaymentFiltersValue)[] = ["status", "source", "overpayment", "amountMin", "amountMax"];

export type TrainerFilterOption = { value: string; label: string };

type PaymentFiltersProps = {
  serverPagination?: boolean;
  value: PaymentFiltersValue;
  /** Shown only when provided (Owner list). */
  trainerOptions?: TrainerFilterOption[];
  advancedOpen: boolean;
  onAdvancedOpenChange: (open: boolean) => void;
  onChange: (value: PaymentFiltersValue) => void;
  onClear: () => void;
};

const monthNavButtonClassName =
  "mx-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-primary-light transition hover:bg-white/5 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)] disabled:cursor-not-allowed disabled:text-on-surface-muted disabled:opacity-30";

export function PaymentFilters({
  serverPagination = false,
  value,
  trainerOptions,
  advancedOpen,
  onAdvancedOpenChange,
  onChange,
  onClear,
}: PaymentFiltersProps) {
  const defaults = getDefaultPaymentFilters();
  const currentMonth = defaults.month;
  const update = <Key extends keyof PaymentFiltersValue>(
    key: Key,
    nextValue: PaymentFiltersValue[Key],
  ) => onChange({ ...value, [key]: nextValue });
  const selectMonth = (month: string | null) => {
    if (month && month <= currentMonth) onChange({ ...value, month, dateFrom: "", dateTo: "" });
  };
  const previousMonth = shiftMonthValue(value.month || currentMonth, -1);
  const nextMonth = value.month ? shiftMonthValue(value.month, 1) : currentMonth;

  return (
    <FilterToolbar
      search={
        <FilterSearchField
          value={value.client}
          onChange={(nextValue) => update("client", nextValue)}
          placeholder={serverPagination ? "Imię, nazwisko, e-mail lub ID klienta" : "Imię, nazwisko lub ID klienta"}
        />
      }
      gridClassName={trainerOptions
        ? "md:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_minmax(220px,250px)_minmax(170px,220px)_minmax(160px,210px)_minmax(150px,180px)_auto_auto]"
        : "md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_minmax(220px,250px)_220px_200px_auto_auto]"}
      advancedId="payment-advanced-filters"
      advancedGridClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)]"
      advancedOpen={advancedOpen}
      onAdvancedOpenChange={onAdvancedOpenChange}
      advancedActiveCount={advancedKeys.filter((key) => value[key] !== defaults[key]).length}
      canClear={(Object.keys(defaults) as (keyof PaymentFiltersValue)[]).some((key) => value[key] !== defaults[key])}
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
      {/* One period control: arrows step through months, the middle opens the month picker. */}
      <div
        role="group"
        aria-label="Miesiąc wpłat"
        className={[
          "flex h-12 min-w-0 items-center rounded-[var(--radius-lg)] border bg-surface-container-lowest transition",
          value.month ? "border-white/5" : "border-dashed border-white/10",
        ].join(" ")}
      >
        <button type="button" aria-label="Poprzedni miesiąc" title="Poprzedni miesiąc" disabled={!previousMonth} onClick={() => selectMonth(previousMonth)} className={monthNavButtonClassName}>
          <ChevronLeft size={17} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <span aria-hidden="true" className="text-center text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">Miesiąc</span>
          <MonthPicker
            value={value.month}
            ariaLabel="Miesiąc wpłat"
            max={currentMonth}
            onChange={selectMonth}
            icon={null}
            className={[
              "w-full truncate rounded-[var(--radius-md)] text-center text-sm font-semibold transition hover:text-primary-light focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]",
              value.month ? "text-on-surface" : "text-on-surface-muted",
            ].join(" ")}
          />
        </div>
        <button type="button" aria-label="Następny miesiąc" title="Następny miesiąc" disabled={!nextMonth || nextMonth > currentMonth} onClick={() => selectMonth(nextMonth)} className={monthNavButtonClassName}>
          <ChevronRight size={17} />
        </button>
      </div>
      <DateRangeFilter
        label="Zakres dat"
        emptyLabel="Wybierz daty"
        value={{ from: value.dateFrom, to: value.dateTo }}
        onChange={(range) =>
          onChange({ ...value, month: "", dateFrom: range.from, dateTo: range.to })
        }
      />
      {trainerOptions ? (
        <CustomSelect
          label="Trener"
          value={value.trainerId}
          onChange={(nextValue) => update("trainerId", nextValue)}
          options={[{ value: "all", label: "Wszyscy trenerzy" }, ...trainerOptions]}
        />
      ) : null}
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
