"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  getRevenueStatistics,
  getTrainerCostSessions,
  getTrainerCostStatistics,
  type AnalyticsBreakdown,
  type RevenueQuery,
  type RevenueStatistics,
  type TrainerCostSession,
  type TrainerCostsQuery,
  type TrainerCostStatistics,
} from "@/app/lib/owner/analytics";
import { getClients, type Client } from "@/app/lib/owner/clients";
import {
  getExpenseCategories,
  getExpensePaymentStatuses,
  getExpenseStatistics,
  type ExpenseQuery,
  type ExpenseStatistics,
} from "@/app/lib/owner/expenses";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import { getTrainers, type Trainer } from "@/app/lib/owner/trainers";
import { showOwnerError } from "../components/owner-toast";
import {
  fallbackCategories,
  fallbackPaymentStatuses,
  normalizeDictionary,
  type DictionaryOption,
  type LegalEntityOption,
} from "../expenses/expense-config";
import FinanceAndTrainers from "./components/FinanceAndTrainers";
import RevenueCostsBreakdowns from "./components/RevenueCostsBreakdowns";
import SessionsProfitability from "./components/SessionsProfitability";
import StatisticsFilters, {
  initialStatisticsFilters,
  type StatisticsFiltersValue,
} from "./components/StatisticsFilters";
import StatisticsOverview from "./components/StatisticsOverview";
import {
  booleanFilter,
  combineMonthlyData,
  emptyExpenseStatistics,
  emptyRevenueStatistics,
  emptyTrainerCostStatistics,
  numberFilter,
} from "./statistics-config";

export default function OwnerStatisticsPage() {
  const [filters, setFilters] = useState<StatisticsFiltersValue>(
    initialStatisticsFilters,
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [revenue, setRevenue] = useState<RevenueStatistics>(
    emptyRevenueStatistics,
  );
  const [expenses, setExpenses] = useState<ExpenseStatistics>(
    emptyExpenseStatistics,
  );
  const [trainerCosts, setTrainerCosts] = useState<TrainerCostStatistics>(
    emptyTrainerCostStatistics,
  );
  const [sessions, setSessions] = useState<TrainerCostSession[]>([]);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsTotalPages, setSessionsTotalPages] = useState(1);
  const [sessionsTotalCount, setSessionsTotalCount] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] =
    useState<DictionaryOption[]>(fallbackCategories);
  const [paymentStatuses, setPaymentStatuses] = useState<DictionaryOption[]>(
    fallbackPaymentStatuses,
  );
  const [failedSections, setFailedSections] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const commonQuery = useMemo(
    () => ({
      from: filters.from || null,
      to: filters.to || null,
      legalEntityId: numberFilter(filters.legalEntityId),
      locationId: numberFilter(filters.locationId),
      trainerId: numberFilter(filters.trainerId),
      clientId: numberFilter(filters.clientId),
      clientPackageId: numberFilter(filters.clientPackageId),
    }),
    [filters],
  );

  const legalEntities = useMemo(
    () =>
      mergeLegalEntities(
        [],
        [
          ...locations
            .map((item) => ({
              id: Number(item.legalEntityId),
              name: item.legalEntityName || `Działalność ${item.legalEntityId}`,
            }))
            .filter((item) => Number.isFinite(item.id) && item.id > 0),
          ...legalEntitiesFromBreakdowns(revenue.byLegalEntity || []),
          ...legalEntitiesFromBreakdowns(expenses.byLegalEntity || []),
          ...legalEntitiesFromBreakdowns(trainerCosts.byLegalEntity || []),
        ],
      ),
    [
      expenses.byLegalEntity,
      locations,
      revenue.byLegalEntity,
      trainerCosts.byLegalEntity,
    ],
  );

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      const revenueQuery: RevenueQuery = {
        ...commonQuery,
        method: numberFilter(filters.paymentMethod),
        paymentProvider:
          filters.paymentProvider === "all" ? null : filters.paymentProvider,
        isRenewal: booleanFilter(filters.isRenewal),
        hasProviderFee: booleanFilter(filters.hasProviderFee),
        isProviderSettled: booleanFilter(filters.isProviderSettled),
        payoutFrom: filters.payoutFrom || null,
        payoutTo: filters.payoutTo || null,
      };
      const expenseQuery: ExpenseQuery = {
        from: commonQuery.from,
        to: commonQuery.to,
        legalEntityId: commonQuery.legalEntityId,
        locationId: commonQuery.locationId,
        category: numberFilter(filters.expenseCategory),
        paymentStatus: numberFilter(filters.expensePaymentStatus),
      };
      const trainerQuery: TrainerCostsQuery = {
        ...commonQuery,
        isCoveredByContract: booleanFilter(filters.isCoveredByContract),
      };

      const results = await Promise.allSettled([
        getRevenueStatistics(revenueQuery),
        getExpenseStatistics(expenseQuery),
        getTrainerCostStatistics(trainerQuery),
        getTrainerCostSessions({
          from: commonQuery.from,
          to: commonQuery.to,
          trainerId: commonQuery.trainerId,
          locationId: commonQuery.locationId,
          page: sessionsPage,
          pageSize: 25,
        }),
      ]);

      const failed: string[] = [];
      const [revenueResult, expenseResult, trainerResult, sessionsResult] =
        results;

      if (revenueResult.status === "fulfilled") {
        setRevenue(revenueResult.value);
      } else {
        failed.push("przychody");
      }
      if (expenseResult.status === "fulfilled") {
        setExpenses(expenseResult.value);
      } else {
        failed.push("koszty");
      }
      if (trainerResult.status === "fulfilled") {
        setTrainerCosts(trainerResult.value);
      } else {
        failed.push("rentowność trenerów");
      }
      if (sessionsResult.status === "fulfilled") {
        const value = sessionsResult.value;
        setSessions(value.items || []);
        setSessionsTotalCount(value.totalCount ?? value.items?.length ?? 0);
        setSessionsTotalPages(Math.max(1, value.totalPages || 1));
      } else {
        failed.push("sesje");
      }

      setFailedSections(failed);
      if (failed.length === results.length) {
        showOwnerError(
          revenueResult.status === "rejected" ? revenueResult.reason : null,
          "Nie udało się pobrać statystyk.",
          { id: "statistics-load-error" },
        );
      }
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [commonQuery, filters, sessionsPage],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 250);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      Promise.allSettled([
        getLocations(),
        getTrainers(),
        getClients(),
        getExpenseCategories(),
        getExpensePaymentStatuses(),
      ]).then(
        ([
          locationResult,
          trainerResult,
          clientResult,
          categoryResult,
          statusResult,
        ]) => {
          if (locationResult.status === "fulfilled") {
            setLocations(locationResult.value.filter((item) => item.isActive));
          }
          if (trainerResult.status === "fulfilled") {
            setTrainers(trainerResult.value);
          }
          if (clientResult.status === "fulfilled") {
            setClients(clientResult.value);
          }
          if (categoryResult.status === "fulfilled") {
            setCategories(
              normalizeDictionary(categoryResult.value, fallbackCategories),
            );
          }
          if (statusResult.status === "fulfilled") {
            setPaymentStatuses(
              normalizeDictionary(statusResult.value, fallbackPaymentStatuses),
            );
          }
        },
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateFilter<K extends keyof StatisticsFiltersValue>(
    key: K,
    value: StatisticsFiltersValue[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setSessionsPage(1);
  }

  const monthlyData = combineMonthlyData(revenue.byMonth, expenses.byMonth);
  const operatingProfit =
    expenses.operatingProfitNetAmount || revenue.netAmount - expenses.netAmount;
  const hasFilters =
    JSON.stringify(filters) !== JSON.stringify(initialStatisticsFilters);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-12">
      {/* Sekcja: Nagłówek statystyk */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Raport danych</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight md:text-[2.75rem]">
            Przegląd wyników
          </h1>
        </div>
        <Button
          type="button"
          variant="secondary"
          icon={
            <RefreshCw
              size={17}
              className={isRefreshing ? "animate-spin" : ""}
            />
          }
          onClick={() => void loadData(true)}
          disabled={isRefreshing}
        >
          Odśwież
        </Button>
      </header>

      {/* Sekcja: Filtry statystyk */}
      <StatisticsFilters
        value={filters}
        advancedOpen={advancedOpen}
        legalEntities={legalEntities}
        locations={locations}
        trainers={trainers}
        clients={clients}
        categories={categories}
        paymentStatuses={paymentStatuses}
        hasFilters={hasFilters}
        onAdvancedToggle={() => setAdvancedOpen((current) => !current)}
        onChange={updateFilter}
        onDateRangeChange={(from, to) => {
          setFilters((current) => ({ ...current, from, to }));
          setSessionsPage(1);
        }}
        onPayoutRangeChange={(payoutFrom, payoutTo) => {
          setFilters((current) => ({ ...current, payoutFrom, payoutTo }));
          setSessionsPage(1);
        }}
        onClear={() => {
          setFilters(initialStatisticsFilters);
          setSessionsPage(1);
        }}
      />

      {/* Sekcja: Ostrzeżenia częściowych danych */}
      {failedSections.length ? (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-warning/20 bg-warning-container/30 px-4 py-3 text-sm text-warning-light">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <p>
            Nie udało się odświeżyć części danych: {failedSections.join(", ")}.
            Pozostałe sekcje są nadal dostępne.
          </p>
        </div>
      ) : null}

      {/* Sekcja: Kluczowe wskaźniki */}
      <StatisticsOverview
        revenue={revenue}
        expenses={expenses}
        trainerCosts={trainerCosts}
        operatingProfit={operatingProfit}
        isLoading={isLoading}
      />

      {/* Sekcje: Przychody i koszty / Rentowność trenerów */}
      <FinanceAndTrainers
        monthlyData={monthlyData}
        trainers={trainerCosts.byTrainer || []}
      />

      {/* Sekcja: Struktura przychodów i kosztów */}
      <RevenueCostsBreakdowns
        revenueByPaymentMethod={revenue.byPaymentMethod || []}
        expensesByCategory={expenses.byCategory}
        categories={categories}
      />

      {/* Sekcja: Rentowność sesji */}
      {/* <SessionsProfitability
        sessions={sessions}
        page={sessionsPage}
        totalPages={sessionsTotalPages}
        totalCount={sessionsTotalCount}
        isLoading={isLoading}
        onPageChange={setSessionsPage}
      /> */}
    </div>
  );
}

function legalEntitiesFromBreakdowns(
  items: Array<AnalyticsBreakdown | Record<string, unknown>>,
) {
  return items
    .map((item) => {
      const id = Number(item.legalEntityId ?? item.id ?? item.key);
      const name = String(
        item.legalEntityName ?? item.name ?? item.label ?? `Działalność ${id}`,
      );
      return { id, name };
    })
    .filter((item) => Number.isFinite(item.id) && item.id > 0);
}

function mergeLegalEntities(
  current: LegalEntityOption[],
  incoming: LegalEntityOption[],
) {
  const map = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => map.set(item.id, item));
  return Array.from(map.values()).sort((first, second) =>
    first.name.localeCompare(second.name, "pl"),
  );
}
