"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BanknoteArrowDown,
  Building2,
  CalendarClock,
  Check,
  CircleCheck,
  Clock3,
  Download,
  Edit3,
  FileText,
  LoaderCircle,
  MapPin,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { DateRangeFilter } from "@/app/components/ui/date-range-filter";
import { formatMoney } from "@/app/lib/formatters/money";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import {
  deleteExpense,
  deleteExpenseAttachment,
  downloadExpenseAttachment,
  getExpense,
  getExpenseCategories,
  getExpensePaymentStatuses,
  getExpenses,
  getExpenseStatistics,
  markExpenseAsPaid,
  type CompanyExpense,
  type ExpenseQuery,
  type ExpenseStatistics,
} from "@/app/lib/owner/expenses";
import {
  showOwnerError,
  showOwnerSuccess,
} from "../components/owner-toast";
import ExpenseConfirmModal from "./components/ExpenseConfirmModal";
import ExpenseFormModal from "./components/ExpenseFormModal";
import {
  deriveLegalEntities,
  fallbackCategories,
  fallbackPaymentStatuses,
  formatExpenseDate,
  getCurrentMonthRange,
  getDictionaryLabel,
  getExpenseStatusTone,
  normalizeDictionary,
  type DictionaryOption,
  type LegalEntityOption,
} from "./expense-config";

type ExpenseFilters = {
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

type DeleteTarget = {
  type: "expense" | "attachment";
  expense: CompanyExpense;
};

const initialMonth = getCurrentMonthRange();
const emptyStatistics: ExpenseStatistics = {
  expenseCount: 0,
  paidCount: 0,
  unpaidCount: 0,
  overdueCount: 0,
  netAmount: 0,
  vatAmount: 0,
  grossAmount: 0,
  paidGrossAmount: 0,
  unpaidGrossAmount: 0,
  overdueGrossAmount: 0,
  revenueGrossAmount: 0,
  paymentProviderFeeAmount: 0,
  revenueNetAmount: 0,
  operatingProfitGrossAmount: 0,
  operatingProfitNetAmount: 0,
  byLegalEntity: [],
  byLocation: [],
  byCategory: [],
  byPaymentStatus: [],
  byMonth: [],
};

const initialFilters: ExpenseFilters = {
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

export default function OwnerExpensesPage() {
  const [filters, setFilters] = useState<ExpenseFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [statistics, setStatistics] =
    useState<ExpenseStatistics>(emptyStatistics);
  const [categories, setCategories] =
    useState<DictionaryOption[]>(fallbackCategories);
  const [paymentStatuses, setPaymentStatuses] = useState<DictionaryOption[]>(
    fallbackPaymentStatuses,
  );
  const [locations, setLocations] = useState<Location[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntityOption[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] =
    useState<CompanyExpense | null>(null);
  const [loadingExpenseId, setLoadingExpenseId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const query = useMemo<ExpenseQuery>(
    () => ({
      legalEntityId: numberFilter(filters.legalEntityId),
      locationId: numberFilter(filters.locationId),
      category: numberFilter(filters.category),
      paymentStatus: numberFilter(filters.paymentStatus),
      from: nullable(filters.from),
      to: nullable(filters.to),
      dueFrom: nullable(filters.dueFrom),
      dueTo: nullable(filters.dueTo),
      paidFrom: nullable(filters.paidFrom),
      paidTo: nullable(filters.paidTo),
      search: nullable(filters.search.trim()),
      isOverdue: booleanFilter(filters.isOverdue),
      page,
      pageSize,
    }),
    [filters, page, pageSize],
  );

  const loadData = useCallback(
    async (showRefreshState = false) => {
      try {
        if (showRefreshState) setIsRefreshing(true);
        else setIsLoading(true);

        const [list, stats] = await Promise.all([
          getExpenses(query),
          getExpenseStatistics(query),
        ]);
        const items = list.items || [];

        setExpenses(items);
        setStatistics(stats);
        setTotalCount(list.totalCount ?? items.length);
        setTotalPages(
          Math.max(
            1,
            list.totalPages ||
              Math.ceil((list.totalCount || items.length) / pageSize),
          ),
        );
        setLegalEntities((current) =>
          mergeLegalEntities(
            current,
            deriveLegalEntities(items, stats, locations),
          ),
        );
      } catch (error) {
        showOwnerError(error, "Nie udało się pobrać wydatków.", {
          id: "expenses-load-error",
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [locations, pageSize, query],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      Promise.allSettled([
        getExpenseCategories(),
        getExpensePaymentStatuses(),
        getLocations(),
      ]).then(([categoriesResult, statusesResult, locationsResult]) => {
        if (categoriesResult.status === "fulfilled") {
          setCategories(
            normalizeDictionary(categoriesResult.value, fallbackCategories),
          );
        }
        if (statusesResult.status === "fulfilled") {
          setPaymentStatuses(
            normalizeDictionary(
              statusesResult.value,
              fallbackPaymentStatuses,
            ),
          );
        }
        if (locationsResult.status === "fulfilled") {
          const activeLocations = locationsResult.value.filter(
            (location) => location.isActive,
          );
          setLocations(activeLocations);
          setLegalEntities((current) =>
            mergeLegalEntities(
              current,
              deriveLegalEntities([], null, activeLocations),
            ),
          );
        }
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  function updateFilter<K extends keyof ExpenseFilters>(
    key: K,
    value: ExpenseFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(initialFilters);
    setPage(1);
  }

  async function handleOpenEdit(expense: CompanyExpense) {
    try {
      setLoadingExpenseId(expense.id);
      const current = await getExpense(expense.id);
      setEditingExpense(current);
      setLegalEntities((known) =>
        mergeLegalEntities(known, [
          {
            id: current.legalEntityId,
            name:
              current.legalEntityName ||
              `Działalność ${current.legalEntityId}`,
          },
        ]),
      );
      setFormOpen(true);
    } catch (error) {
      showOwnerError(error, "Nie udało się pobrać szczegółów wydatku.", {
        id: `expense-details-error-${expense.id}`,
      });
    } finally {
      setLoadingExpenseId(null);
    }
  }

  async function handleMarkPaid(expense: CompanyExpense) {
    try {
      setProcessingId(expense.id);
      await markExpenseAsPaid(expense.id);
      showOwnerSuccess("Wydatek został oznaczony jako opłacony.", {
        id: `expense-paid-${expense.id}`,
      });
      await loadData(true);
    } catch (error) {
      showOwnerError(error, "Nie udało się oznaczyć wydatku jako opłaconego.", {
        id: `expense-paid-error-${expense.id}`,
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDownload(expense: CompanyExpense) {
    try {
      setProcessingId(expense.id);
      const { blob, fileName } = await downloadExpenseAttachment(expense.id);
      downloadBlob(blob, fileName || expense.attachmentFileName || "faktura");
      showOwnerSuccess("Załącznik został pobrany.", {
        id: `expense-download-${expense.id}`,
      });
    } catch (error) {
      showOwnerError(error, "Nie udało się pobrać załącznika.", {
        id: `expense-download-error-${expense.id}`,
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    const target = deleteTarget;
    try {
      setProcessingId(target.expense.id);
      if (target.type === "expense") {
        await deleteExpense(target.expense.id);
        showOwnerSuccess("Wydatek został usunięty.", {
          id: `expense-delete-${target.expense.id}`,
        });
      } else {
        await deleteExpenseAttachment(target.expense.id);
        showOwnerSuccess("Załącznik został usunięty.", {
          id: `expense-attachment-delete-${target.expense.id}`,
        });
      }
      setDeleteTarget(null);
      await loadData(true);
    } catch (error) {
      showOwnerError(
        error,
        target.type === "expense"
          ? "Nie udało się usunąć wydatku."
          : "Nie udało się usunąć załącznika.",
        { id: `expense-delete-error-${target.expense.id}` },
      );
    } finally {
      setProcessingId(null);
    }
  }

  const hasNonDefaultFilters =
    JSON.stringify(filters) !== JSON.stringify(initialFilters);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-12">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Finanse firmy</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight md:text-[2.75rem]">
            Ewidencja wydatków
          </h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
            Kontroluj koszty, terminy płatności i dokumenty przypisane do firm
            oraz lokalizacji.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Odśwież wydatki"
            onClick={() => void loadData(true)}
            disabled={isRefreshing}
            icon={
              <RefreshCw
                size={17}
                className={isRefreshing ? "animate-spin" : ""}
              />
            }
          />
          <Button
            type="button"
            icon={<Plus size={17} />}
            onClick={() => {
              setEditingExpense(null);
              setFormOpen(true);
            }}
            className="flex-1 sm:flex-none"
          >
            Dodaj wydatek
          </Button>
        </div>
      </header>

      <ExpenseStats statistics={statistics} isLoading={isLoading} />

      <section className="card-shell overflow-visible p-4 md:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-muted"
            />
            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Szukaj kontrahenta, faktury lub opisu..."
              className="h-12 w-full rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest pl-11 pr-4 text-sm text-on-surface outline-none transition placeholder:text-on-surface-muted hover:border-white/10 focus:border-primary-light/40"
            />
          </label>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:flex xl:w-auto">
            <DateRangeFilter
              label="Data wystawienia"
              value={{ from: filters.from, to: filters.to }}
              onChange={({ from, to }) => {
                setFilters((current) => ({ ...current, from, to }));
                setPage(1);
              }}
              className="xl:w-[230px]"
            />
            <CustomSelect
              label="Status"
              value={filters.paymentStatus}
              options={[
                { value: "all", label: "Wszystkie" },
                ...paymentStatuses.map((status) => ({
                  value: String(status.value),
                  label: status.label,
                })),
              ]}
              onChange={(value) => updateFilter("paymentStatus", value)}
              className="xl:w-[180px]"
            />
            <CustomSelect
              label="Kategoria"
              value={filters.category}
              options={[
                { value: "all", label: "Wszystkie" },
                ...categories.map((category) => ({
                  value: String(category.value),
                  label: category.label,
                })),
              ]}
              onChange={(value) => updateFilter("category", value)}
              className="xl:w-[190px]"
            />
            <Button
              type="button"
              variant={advancedFiltersOpen ? "primary" : "secondary"}
              icon={<SlidersHorizontal size={16} />}
              onClick={() => setAdvancedFiltersOpen((current) => !current)}
              className="xl:w-auto"
            >
              Więcej filtrów
            </Button>
          </div>
        </div>

        <MobileQuickFilters
          value={filters.paymentStatus}
          onChange={(value) => updateFilter("paymentStatus", value)}
        />

        {advancedFiltersOpen ? (
          <div className="mt-4 grid gap-3 border-t border-white/5 pt-4 sm:grid-cols-2 xl:grid-cols-4">
            <CustomSelect
              label="Działalność"
              value={filters.legalEntityId}
              icon={<Building2 size={16} />}
              options={[
                { value: "all", label: "Wszystkie działalności" },
                ...legalEntities.map((entity) => ({
                  value: String(entity.id),
                  label: entity.name,
                })),
              ]}
              onChange={(value) => updateFilter("legalEntityId", value)}
            />
            <CustomSelect
              label="Lokalizacja"
              value={filters.locationId}
              icon={<MapPin size={16} />}
              options={[
                { value: "all", label: "Wszystkie lokalizacje" },
                ...locations.map((location) => ({
                  value: String(location.id),
                  label: location.name || location.city || `#${location.id}`,
                })),
              ]}
              onChange={(value) => updateFilter("locationId", value)}
            />
            <DateRangeFilter
              label="Termin płatności"
              value={{ from: filters.dueFrom, to: filters.dueTo }}
              onChange={({ from, to }) => {
                setFilters((current) => ({
                  ...current,
                  dueFrom: from,
                  dueTo: to,
                }));
                setPage(1);
              }}
            />
            <DateRangeFilter
              label="Data opłacenia"
              value={{ from: filters.paidFrom, to: filters.paidTo }}
              onChange={({ from, to }) => {
                setFilters((current) => ({
                  ...current,
                  paidFrom: from,
                  paidTo: to,
                }));
                setPage(1);
              }}
            />
            <CustomSelect
              label="Przeterminowanie"
              value={filters.isOverdue}
              options={[
                { value: "all", label: "Wszystkie" },
                { value: "true", label: "Tylko zaległe" },
                { value: "false", label: "Bez zaległych" },
              ]}
              onChange={(value) => updateFilter("isOverdue", value)}
            />

            <div className="flex items-end sm:col-span-2">
              <Button
                type="button"
                variant="ghost"
                icon={<X size={15} />}
                onClick={clearFilters}
                disabled={!hasNonDefaultFilters}
                className="w-full sm:w-auto"
              >
                Wyczyść filtry
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card-shell overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-4 md:px-5">
          <div>
            <h2 className="text-section-title">Dokumenty kosztowe</h2>
            <p className="mt-1 text-xs text-on-surface-muted">
              {totalCount} {pluralizeDocuments(totalCount)} w wybranym zakresie
            </p>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-on-surface-muted">
              <LoaderCircle size={15} className="animate-spin" />
              Pobieranie
            </div>
          ) : null}
        </div>

        {isLoading && expenses.length === 0 ? (
          <LoadingExpenses />
        ) : expenses.length === 0 ? (
          <EmptyExpenses onAdd={() => setFormOpen(true)} />
        ) : (
          <>
            <div className="hidden lg:block">
              <ExpenseTable
                expenses={expenses}
                categories={categories}
                paymentStatuses={paymentStatuses}
                loadingExpenseId={loadingExpenseId}
                processingId={processingId}
                onEdit={handleOpenEdit}
                onMarkPaid={handleMarkPaid}
                onDownload={handleDownload}
                onDelete={(expense) =>
                  setDeleteTarget({ type: "expense", expense })
                }
                onDeleteAttachment={(expense) =>
                  setDeleteTarget({ type: "attachment", expense })
                }
              />
            </div>
            <div className="flex flex-col gap-3 p-3 lg:hidden">
              {expenses.map((expense) => (
                <ExpenseMobileCard
                  key={expense.id}
                  expense={expense}
                  categoryLabel={getDictionaryLabel(
                    expense.category,
                    categories,
                  )}
                  statusLabel={getDictionaryLabel(
                    expense.paymentStatus,
                    paymentStatuses,
                  )}
                  isLoading={
                    loadingExpenseId === expense.id ||
                    processingId === expense.id
                  }
                  onEdit={() => void handleOpenEdit(expense)}
                  onMarkPaid={() => void handleMarkPaid(expense)}
                  onDownload={() => void handleDownload(expense)}
                  onDelete={() =>
                    setDeleteTarget({ type: "expense", expense })
                  }
                  onDeleteAttachment={() =>
                    setDeleteTarget({ type: "attachment", expense })
                  }
                />
              ))}
            </div>
          </>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onChange={setPage}
        />
      </section>

      <ExpenseFormModal
        open={formOpen}
        expense={editingExpense}
        categories={categories}
        paymentStatuses={paymentStatuses}
        legalEntities={legalEntities}
        locations={locations}
        onClose={() => {
          setFormOpen(false);
          setEditingExpense(null);
        }}
        onSaved={() => void loadData(true)}
      />

      <ExpenseConfirmModal
        open={deleteTarget !== null}
        title={
          deleteTarget?.type === "attachment"
            ? "Usunąć załącznik?"
            : "Usunąć wydatek?"
        }
        description={
          deleteTarget?.type === "attachment"
            ? `Plik „${deleteTarget.expense.attachmentFileName || "załącznik"}” zostanie trwale odłączony od dokumentu.`
            : `Dokument kontrahenta „${deleteTarget?.expense.vendorName || ""}” zostanie trwale usunięty z ewidencji.`
        }
        confirmLabel={
          deleteTarget?.type === "attachment"
            ? "Usuń załącznik"
            : "Usuń wydatek"
        }
        isProcessing={
          deleteTarget ? processingId === deleteTarget.expense.id : false
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}

function ExpenseStats({
  statistics,
  isLoading,
}: {
  statistics: ExpenseStatistics;
  isLoading: boolean;
}) {
  const cards = [
    {
      label: "Suma wydatków",
      value: statistics.grossAmount,
      meta: `${statistics.expenseCount} dokumentów`,
      icon: <BanknoteArrowDown size={18} />,
      tone: "primary",
    },
    {
      label: "Opłacone",
      value: statistics.paidGrossAmount,
      meta: `${statistics.paidCount} rozliczonych`,
      icon: <CircleCheck size={18} />,
      tone: "success",
    },
    {
      label: "Do zapłaty",
      value: statistics.unpaidGrossAmount,
      meta: `${statistics.unpaidCount} oczekujących`,
      icon: <Clock3 size={18} />,
      tone: "warning",
    },
    {
      label: "Zaległe",
      value: statistics.overdueGrossAmount,
      meta: `${statistics.overdueCount} po terminie`,
      icon: <TriangleAlert size={18} />,
      tone: "danger",
    },
  ] as const;

  return (
    <section>
      <div className="grid auto-cols-[82%] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-[45%] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible lg:pb-0">
        {cards.map((card) => (
          <article
            key={card.label}
            className={`snap-start rounded-[var(--radius-xl)] border bg-surface-container p-4 shadow-soft ${statToneClasses[card.tone]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-label text-on-surface-muted">{card.label}</p>
              <span className="text-current">{card.icon}</span>
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-tight text-on-surface">
              {isLoading ? "—" : formatMoney(card.value, "PLN")}
            </p>
            <p className="mt-2 text-xs text-on-surface-muted">{card.meta}</p>
          </article>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-4 rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary-light">
            <TrendingUp size={18} />
          </span>
          <div>
            <p className="text-label text-on-surface-muted">
              Wynik operacyjny brutto
            </p>
            <p className="mt-1 text-lg font-semibold text-on-surface">
              {formatMoney(statistics.operatingProfitGrossAmount, "PLN")}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 text-sm sm:text-right">
          <div>
            <p className="text-xs text-on-surface-muted">Przychód brutto</p>
            <p className="mt-1 font-semibold">
              {formatMoney(statistics.revenueGrossAmount, "PLN")}
            </p>
          </div>
          <div>
            <p className="text-xs text-on-surface-muted">Opłaty operatora</p>
            <p className="mt-1 font-semibold">
              {formatMoney(statistics.paymentProviderFeeAmount, "PLN")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const statToneClasses = {
  primary: "border-primary-light/10 text-primary-light",
  success: "border-tertiary/15 text-tertiary-light",
  warning: "border-warning/15 text-warning-light",
  danger: "border-error/20 text-error-light",
};

function ExpenseTable({
  expenses,
  categories,
  paymentStatuses,
  loadingExpenseId,
  processingId,
  onEdit,
  onMarkPaid,
  onDownload,
  onDelete,
  onDeleteAttachment,
}: {
  expenses: CompanyExpense[];
  categories: DictionaryOption[];
  paymentStatuses: DictionaryOption[];
  loadingExpenseId: number | null;
  processingId: number | null;
  onEdit: (expense: CompanyExpense) => void;
  onMarkPaid: (expense: CompanyExpense) => void;
  onDownload: (expense: CompanyExpense) => void;
  onDelete: (expense: CompanyExpense) => void;
  onDeleteAttachment: (expense: CompanyExpense) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/5 text-[0.68rem] uppercase tracking-wider text-on-surface-muted">
            <th className="px-5 py-3 font-semibold">Kontrahent / dokument</th>
            <th className="px-4 py-3 font-semibold">Firma / lokalizacja</th>
            <th className="px-4 py-3 font-semibold">Kategoria</th>
            <th className="px-4 py-3 font-semibold">Daty</th>
            <th className="px-4 py-3 text-right font-semibold">Brutto</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Załącznik</th>
            <th className="px-5 py-3 text-right font-semibold">Akcje</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => {
            const busy =
              loadingExpenseId === expense.id || processingId === expense.id;
            return (
              <tr
                key={expense.id}
                className="border-b border-white/5 transition last:border-b-0 hover:bg-surface-container-high/45"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/12 text-primary-light">
                      <FileText size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="max-w-[230px] truncate text-sm font-semibold text-on-surface">
                        {expense.vendorName}
                      </p>
                      <p className="mt-1 max-w-[230px] truncate text-xs text-on-surface-muted">
                        {expense.invoiceNumber || expense.description || "Bez numeru"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="max-w-[190px] truncate text-xs font-semibold text-on-surface-variant">
                    {expense.legalEntityName || `#${expense.legalEntityId}`}
                  </p>
                  <p className="mt-1 max-w-[190px] truncate text-xs text-on-surface-muted">
                    {expense.locationName || "Bez lokalizacji"}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                    {getDictionaryLabel(expense.category, categories)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <p className="text-xs font-semibold text-on-surface-variant">
                    {formatExpenseDate(expense.issueDate)}
                  </p>
                  <p
                    className={`mt-1 text-xs ${expense.isOverdue ? "font-semibold text-error-light" : "text-on-surface-muted"}`}
                  >
                    Termin: {formatExpenseDate(expense.dueDate)}
                  </p>
                </td>
                <td className="px-4 py-4 text-right text-sm font-semibold text-on-surface">
                  {formatMoney(expense.grossAmount, expense.currency)}
                </td>
                <td className="px-4 py-4">
                  <ExpenseStatusBadge
                    expense={expense}
                    label={getDictionaryLabel(
                      expense.paymentStatus,
                      paymentStatuses,
                    )}
                  />
                </td>
                <td className="px-4 py-4">
                  {expense.attachmentUrl || expense.attachmentFileName ? (
                    <div className="flex items-center gap-1">
                      <ActionButton
                        label="Pobierz załącznik"
                        onClick={() => onDownload(expense)}
                        disabled={busy}
                        icon={<Download size={15} />}
                      />
                      <ActionButton
                        label="Usuń załącznik"
                        onClick={() => onDeleteAttachment(expense)}
                        disabled={busy}
                        tone="danger"
                        icon={<Trash2 size={14} />}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface-muted">Brak</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-1">
                    {expense.paymentStatus !== 1 &&
                    expense.paymentStatus !== 3 ? (
                      <ActionButton
                        label="Oznacz jako opłacone"
                        onClick={() => onMarkPaid(expense)}
                        disabled={busy}
                        tone="success"
                        icon={<Check size={15} />}
                      />
                    ) : null}
                    <ActionButton
                      label="Edytuj wydatek"
                      onClick={() => onEdit(expense)}
                      disabled={busy}
                      icon={
                        loadingExpenseId === expense.id ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <Edit3 size={15} />
                        )
                      }
                    />
                    <ActionButton
                      label="Usuń wydatek"
                      onClick={() => onDelete(expense)}
                      disabled={busy}
                      tone="danger"
                      icon={<Trash2 size={15} />}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ExpenseMobileCard({
  expense,
  categoryLabel,
  statusLabel,
  isLoading,
  onEdit,
  onMarkPaid,
  onDownload,
  onDelete,
  onDeleteAttachment,
}: {
  expense: CompanyExpense;
  categoryLabel: string;
  statusLabel: string;
  isLoading: boolean;
  onEdit: () => void;
  onMarkPaid: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onDeleteAttachment: () => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <article
      className={`rounded-[var(--radius-xl)] border bg-surface-container-low p-4 ${
        expense.isOverdue ? "border-error/30" : "border-white/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/15 text-primary-light">
          <FileText size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface">
                {expense.vendorName}
              </p>
              <p className="mt-1 truncate text-xs uppercase tracking-wide text-on-surface-muted">
                {categoryLabel} · {expense.locationName || expense.legalEntityName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActionsOpen((current) => !current)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-muted"
              aria-label="Pokaż akcje wydatku"
              aria-expanded={actionsOpen}
            >
              <MoreHorizontal size={17} />
            </button>
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-on-surface">
                {formatMoney(expense.grossAmount, expense.currency)}
              </p>
              <p className="mt-1 text-xs text-on-surface-muted">
                Termin {formatExpenseDate(expense.dueDate)}
              </p>
            </div>
            <ExpenseStatusBadge expense={expense} label={statusLabel} />
          </div>
        </div>
      </div>

      {actionsOpen ? (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
          {expense.paymentStatus !== 1 && expense.paymentStatus !== 3 ? (
            <MobileAction
              label="Opłacone"
              icon={<Check size={14} />}
              onClick={onMarkPaid}
              disabled={isLoading}
            />
          ) : null}
          <MobileAction
            label="Edytuj"
            icon={<Edit3 size={14} />}
            onClick={onEdit}
            disabled={isLoading}
          />
          {expense.attachmentUrl || expense.attachmentFileName ? (
            <>
              <MobileAction
                label="Pobierz plik"
                icon={<Download size={14} />}
                onClick={onDownload}
                disabled={isLoading}
              />
              <MobileAction
                label="Usuń plik"
                icon={<Paperclip size={14} />}
                onClick={onDeleteAttachment}
                disabled={isLoading}
                danger
              />
            </>
          ) : null}
          <MobileAction
            label="Usuń wydatek"
            icon={<Trash2 size={14} />}
            onClick={onDelete}
            disabled={isLoading}
            danger
          />
        </div>
      ) : null}
    </article>
  );
}

function ExpenseStatusBadge({
  expense,
  label,
}: {
  expense: CompanyExpense;
  label: string;
}) {
  const tone = getExpenseStatusTone(expense);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide ${statusToneClasses[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {expense.isOverdue ? "Zaległe" : label}
    </span>
  );
}

const statusToneClasses = {
  paid: "bg-tertiary-container/55 text-tertiary-light",
  unpaid: "bg-surface-container-high text-on-surface-variant",
  overdue: "bg-error-container/60 text-error-light",
  cancelled: "bg-secondary-container text-on-surface-muted",
};

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  tone = "default",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "hover:bg-error-container/45 hover:text-error-light"
      : tone === "success"
        ? "hover:bg-tertiary-container/45 hover:text-tertiary-light"
        : "hover:bg-surface-container-high hover:text-on-surface";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-on-surface-muted transition disabled:cursor-wait disabled:opacity-40 ${toneClass}`}
    >
      {icon}
    </button>
  );
}

function MobileAction({
  label,
  icon,
  onClick,
  disabled,
  danger = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-surface-container-high px-3 text-xs font-semibold transition disabled:opacity-40 ${
        danger ? "text-error-light" : "text-on-surface-variant"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileQuickFilters({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
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

function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (totalCount === 0) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalCount);
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-white/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
      <p className="text-xs text-on-surface-muted">
        Wyświetlono {firstItem}–{lastItem} z {totalCount}
      </p>
      <div className="flex items-center gap-1">
        <PageButton
          label="Poprzednia strona"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          ‹
        </PageButton>
        {visiblePages.map((pageNumber) => (
          <PageButton
            key={pageNumber}
            label={`Strona ${pageNumber}`}
            active={pageNumber === page}
            onClick={() => onChange(pageNumber)}
          >
            {pageNumber}
          </PageButton>
        ))}
        <PageButton
          label="Następna strona"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          ›
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-md)] px-2 text-xs font-semibold transition disabled:opacity-30 ${
        active
          ? "bg-primary text-on-primary"
          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
      }`}
    >
      {children}
    </button>
  );
}

function LoadingExpenses() {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-sm text-on-surface-muted">
      <LoaderCircle size={18} className="animate-spin" />
      Pobieranie dokumentów kosztowych...
    </div>
  );
}

function EmptyExpenses({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center px-5 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-on-surface-muted">
        <CalendarClock size={22} />
      </span>
      <p className="mt-4 text-base font-semibold">Brak wydatków</p>
      <p className="mt-1 max-w-md text-sm leading-6 text-on-surface-muted">
        W wybranym zakresie nie ma dokumentów. Zmień filtry albo dodaj pierwszy
        koszt.
      </p>
      <Button
        type="button"
        size="sm"
        icon={<Plus size={15} />}
        onClick={onAdd}
        className="mt-5"
      >
        Dodaj wydatek
      </Button>
    </div>
  );
}

function numberFilter(value: string) {
  return value === "all" || value === "" ? null : Number(value);
}

function booleanFilter(value: string) {
  return value === "all" ? null : value === "true";
}

function nullable(value: string) {
  return value || null;
}

function mergeLegalEntities(
  current: LegalEntityOption[],
  incoming: LegalEntityOption[],
) {
  const merged = new Map(current.map((entity) => [entity.id, entity.name]));
  incoming.forEach((entity) => merged.set(entity.id, entity.name));
  return Array.from(merged, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name, "pl"),
  );
}

function getVisiblePages(page: number, totalPages: number) {
  const candidates = [1, page - 1, page, page + 1, totalPages];
  return [...new Set(candidates)].filter(
    (candidate) => candidate >= 1 && candidate <= totalPages,
  );
}

function pluralizeDocuments(count: number) {
  if (count === 1) return "dokument";
  const lastTwo = count % 100;
  const last = count % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
    return "dokumenty";
  }
  return "dokumentów";
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
