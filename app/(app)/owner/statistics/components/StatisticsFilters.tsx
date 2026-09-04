"use client";

import {
  Building2,
  CreditCard,
  MapPin,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { DateRangeFilter } from "@/app/components/ui/date-range-filter";
import { TextField } from "@/app/components/ui/input";
import { paymentMethodOptions } from "@/app/lib/owner/billing";
import type { Client } from "@/app/lib/owner/clients";
import type { Location } from "@/app/lib/owner/locations";
import type { Trainer } from "@/app/lib/owner/trainers";
import {
  getCurrentMonthRange,
  type DictionaryOption,
  type LegalEntityOption,
} from "../../expenses/expense-config";

export type StatisticsFiltersValue = {
  from: string;
  to: string;
  legalEntityId: string;
  locationId: string;
  trainerId: string;
  clientId: string;
  clientPackageId: string;
  expenseCategory: string;
  expensePaymentStatus: string;
  paymentMethod: string;
  paymentProvider: string;
  isRenewal: string;
  hasProviderFee: string;
  isProviderSettled: string;
  payoutFrom: string;
  payoutTo: string;
  isCoveredByContract: string;
};

const today = new Date();
const thirtyDaysAgo = new Date(today);

thirtyDaysAgo.setDate(today.getDate() - 29);

const monthRange = {
  from: thirtyDaysAgo.toISOString().split("T")[0],
  to: today.toISOString().split("T")[0],
};

export const initialStatisticsFilters: StatisticsFiltersValue = {
  from: monthRange.from,
  to: monthRange.to,
  legalEntityId: "all",
  locationId: "all",
  trainerId: "all",
  clientId: "all",
  clientPackageId: "",
  expenseCategory: "all",
  expensePaymentStatus: "all",
  paymentMethod: "all",
  paymentProvider: "all",
  isRenewal: "all",
  hasProviderFee: "all",
  isProviderSettled: "all",
  payoutFrom: "",
  payoutTo: "",
  isCoveredByContract: "all",
};

type StatisticsFiltersProps = {
  value: StatisticsFiltersValue;
  advancedOpen: boolean;
  legalEntities: LegalEntityOption[];
  locations: Location[];
  trainers: Trainer[];
  clients: Client[];
  categories: DictionaryOption[];
  paymentStatuses: DictionaryOption[];
  hasFilters: boolean;
  onAdvancedToggle: () => void;
  onChange: <K extends keyof StatisticsFiltersValue>(
    key: K,
    value: StatisticsFiltersValue[K],
  ) => void;
  onDateRangeChange: (from: string, to: string) => void;
  onPayoutRangeChange: (from: string, to: string) => void;
  onClear: () => void;
};

// Sekcja: Filtry statystyk
export default function StatisticsFilters({
  value,
  advancedOpen,
  legalEntities,
  locations,
  trainers,
  clients,
  categories,
  paymentStatuses,
  hasFilters,
  onAdvancedToggle,
  onChange,
  onDateRangeChange,
  onPayoutRangeChange,
  onClear,
}: StatisticsFiltersProps) {
  return (
    <section className="card-shell overflow-visible p-4 md:p-5">
      {/* Sekcja: Filtry podstawowe */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr_auto]">
        <DateRangeFilter
          label="Zakres dat"
          value={{ from: value.from, to: value.to }}
          onChange={({ from, to }) => onDateRangeChange(from, to)}
        />
        <CustomSelect
          label="Działalność"
          value={value.legalEntityId}
          icon={<Building2 size={16} />}
          options={[
            { value: "all", label: "Wszystkie" },
            ...legalEntities.map((item) => ({
              value: String(item.id),
              label: item.name,
            })),
          ]}
          onChange={(nextValue) => onChange("legalEntityId", nextValue)}
        />
        <CustomSelect
          label="Lokalizacja"
          value={value.locationId}
          icon={<MapPin size={16} />}
          options={[
            { value: "all", label: "Wszystkie" },
            ...locations.map((item) => ({
              value: String(item.id),
              label: item.name || item.city || `#${item.id}`,
            })),
          ]}
          onChange={(nextValue) => onChange("locationId", nextValue)}
        />
        <CustomSelect
          label="Trener"
          value={value.trainerId}
          icon={<UserRound size={16} />}
          options={[
            { value: "all", label: "Wszyscy" },
            ...trainers.map((item) => ({
              value: String(item.id),
              label: item.fullName,
            })),
          ]}
          onChange={(nextValue) => onChange("trainerId", nextValue)}
        />
        <Button
          type="button"
          variant={advancedOpen ? "primary" : "secondary"}
          icon={<SlidersHorizontal size={16} />}
          onClick={onAdvancedToggle}
        >
          Filtry
        </Button>
      </div>

      {/* Sekcja: Filtry szczegółowe */}
      {advancedOpen ? (
        <div className="mt-4 grid gap-3 border-t border-white/5 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <CustomSelect
            label="Klient"
            value={value.clientId}
            icon={<UsersRound size={16} />}
            options={[
              { value: "all", label: "Wszyscy" },
              ...clients.map((item) => ({
                value: String(item.id),
                label: item.fullName,
              })),
            ]}
            onChange={(nextValue) => onChange("clientId", nextValue)}
          />

          {/*  
           <TextField
            label="ID pakietu klienta"
            type="number"
            min={1}
            value={value.clientPackageId}
            onChange={(nextValue) => onChange("clientPackageId", nextValue)}
            placeholder="Opcjonalne"
          />
           */}

          <CustomSelect
            label="Metoda płatności"
            value={value.paymentMethod}
            icon={<CreditCard size={16} />}
            options={[
              { value: "all", label: "Wszystkie" },
              ...paymentMethodOptions,
            ]}
            onChange={(nextValue) => onChange("paymentMethod", nextValue)}
          />
          <CustomSelect
            label="Operator płatności"
            value={value.paymentProvider}
            options={[
              { value: "all", label: "Wszyscy" },
              { value: "Stripe", label: "Stripe" },
            ]}
            onChange={(nextValue) => onChange("paymentProvider", nextValue)}
          />
          <CustomSelect
            label="Typ płatności"
            value={value.isRenewal}
            options={booleanOptions(
              "Wszystkie",
              "Odnowienia",
              "Nowe płatności",
            )}
            onChange={(nextValue) => onChange("isRenewal", nextValue)}
          />
          <CustomSelect
            label="Prowizja operatora"
            value={value.hasProviderFee}
            options={booleanOptions("Wszystkie", "Z prowizją", "Bez prowizji")}
            onChange={(nextValue) => onChange("hasProviderFee", nextValue)}
          />
          <CustomSelect
            label="Rozliczenie operatora"
            value={value.isProviderSettled}
            options={booleanOptions("Wszystkie", "Rozliczone", "Nierozliczone")}
            onChange={(nextValue) => onChange("isProviderSettled", nextValue)}
          />
          <DateRangeFilter
            label="Data wypłaty"
            value={{ from: value.payoutFrom, to: value.payoutTo }}
            onChange={({ from, to }) => onPayoutRangeChange(from, to)}
          />
          <CustomSelect
            label="Kategoria kosztu"
            value={value.expenseCategory}
            options={[
              { value: "all", label: "Wszystkie" },
              ...categories.map((item) => ({
                value: String(item.value),
                label: item.label,
              })),
            ]}
            onChange={(nextValue) => onChange("expenseCategory", nextValue)}
          />
          <CustomSelect
            label="Status kosztu"
            value={value.expensePaymentStatus}
            options={[
              { value: "all", label: "Wszystkie" },
              ...paymentStatuses.map((item) => ({
                value: String(item.value),
                label: item.label,
              })),
            ]}
            onChange={(nextValue) =>
              onChange("expensePaymentStatus", nextValue)
            }
          />
          <CustomSelect
            label="Umowa trenera"
            value={value.isCoveredByContract}
            options={booleanOptions("Wszystkie", "Objęte umową", "Poza umową")}
            onChange={(nextValue) => onChange("isCoveredByContract", nextValue)}
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              icon={<X size={15} />}
              disabled={!hasFilters}
              onClick={onClear}
            >
              Wyczyść filtry
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function booleanOptions(all: string, yes: string, no: string) {
  return [
    { value: "all", label: all },
    { value: "true", label: yes },
    { value: "false", label: no },
  ];
}
