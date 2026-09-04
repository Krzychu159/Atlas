"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
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
import { showOwnerError, showOwnerSuccess } from "../components/owner-toast";
import ExpenseConfirmModal from "./components/ExpenseConfirmModal";
import ExpenseFilters, {
  initialExpenseFilters,
  type ExpenseFiltersValue,
} from "./components/ExpenseFilters";
import ExpenseFormModal from "./components/ExpenseFormModal";
import ExpensesList from "./components/ExpensesList";
import ExpenseStats from "./components/ExpenseStats";
import {
  deriveLegalEntities,
  fallbackCategories,
  fallbackPaymentStatuses,
  normalizeDictionary,
  type DictionaryOption,
  type LegalEntityOption,
} from "./expense-config";

type DeleteTarget = {
  type: "expense" | "attachment";
  expense: CompanyExpense;
};

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

export default function OwnerExpensesPage() {
  const [filters, setFilters] = useState<ExpenseFiltersValue>(initialExpenseFilters);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [statistics, setStatistics] = useState<ExpenseStatistics>(emptyStatistics);
  const [categories, setCategories] = useState<DictionaryOption[]>(fallbackCategories);
  const [paymentStatuses, setPaymentStatuses] = useState<DictionaryOption[]>(fallbackPaymentStatuses);
  const [locations, setLocations] = useState<Location[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntityOption[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CompanyExpense | null>(null);
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
            list.totalPages || Math.ceil((list.totalCount || items.length) / pageSize),
          ),
        );
        setLegalEntities((current) =>
          mergeLegalEntities(current, deriveLegalEntities(items, stats, locations)),
        );
      } catch (error) {
        showOwnerError(error, "Nie udało się pobrać wydatków.", { id: "expenses-load-error" });
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
          setCategories(normalizeDictionary(categoriesResult.value, fallbackCategories));
        }
        if (statusesResult.status === "fulfilled") {
          setPaymentStatuses(normalizeDictionary(statusesResult.value, fallbackPaymentStatuses));
        }
        if (locationsResult.status === "fulfilled") {
          const activeLocations = locationsResult.value.filter((location) => location.isActive);
          setLocations(activeLocations);
          setLegalEntities((current) =>
            mergeLegalEntities(current, deriveLegalEntities([], null, activeLocations)),
          );
        }
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 300);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  function updateFilter<K extends keyof ExpenseFiltersValue>(
    key: K,
    value: ExpenseFiltersValue[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function updateFilterRange(changes: Partial<ExpenseFiltersValue>) {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(initialExpenseFilters);
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
            name: current.legalEntityName || `Działalność ${current.legalEntityId}`,
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
      showOwnerSuccess("Załącznik został pobrany.", { id: `expense-download-${expense.id}` });
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
    JSON.stringify(filters) !== JSON.stringify(initialExpenseFilters);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-12">
      {/* Sekcja: Nagłówek wydatków */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Finanse firmy</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight md:text-[2.75rem]">
            Ewidencja wydatków
          </h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
            Kontroluj koszty, terminy płatności i dokumenty przypisane do firm oraz lokalizacji.
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
            icon={<RefreshCw size={17} className={isRefreshing ? "animate-spin" : ""} />}
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

      {/* Sekcja: Podsumowanie wydatków */}
      <ExpenseStats statistics={statistics} isLoading={isLoading} />

      {/* Sekcja: Filtry wydatków */}
      <ExpenseFilters
        value={filters}
        categories={categories}
        paymentStatuses={paymentStatuses}
        legalEntities={legalEntities}
        locations={locations}
        advancedOpen={advancedFiltersOpen}
        hasActiveFilters={hasNonDefaultFilters}
        onChange={updateFilter}
        onIssueDateChange={({ from, to }) => updateFilterRange({ from, to })}
        onDueDateChange={({ from, to }) => updateFilterRange({ dueFrom: from, dueTo: to })}
        onPaidDateChange={({ from, to }) => updateFilterRange({ paidFrom: from, paidTo: to })}
        onAdvancedToggle={() => setAdvancedFiltersOpen((current) => !current)}
        onClear={clearFilters}
      />

      {/* Sekcja: Dokumenty kosztowe */}
      <ExpensesList
        expenses={expenses}
        categories={categories}
        paymentStatuses={paymentStatuses}
        totalCount={totalCount}
        totalPages={totalPages}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        loadingExpenseId={loadingExpenseId}
        processingId={processingId}
        onPageChange={setPage}
        onAdd={() => {
          setEditingExpense(null);
          setFormOpen(true);
        }}
        onEdit={(expense) => void handleOpenEdit(expense)}
        onMarkPaid={(expense) => void handleMarkPaid(expense)}
        onDownload={(expense) => void handleDownload(expense)}
        onDelete={(expense) => setDeleteTarget({ type: "expense", expense })}
        onDeleteAttachment={(expense) => setDeleteTarget({ type: "attachment", expense })}
      />

      {/* Sekcja: Formularz i potwierdzenia */}
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
        title={deleteTarget?.type === "attachment" ? "Usunąć załącznik?" : "Usunąć wydatek?"}
        description={
          deleteTarget?.type === "attachment"
            ? `Plik „${deleteTarget.expense.attachmentFileName || "załącznik"}” zostanie trwale odłączony od dokumentu.`
            : `Dokument kontrahenta „${deleteTarget?.expense.vendorName || ""}” zostanie trwale usunięty z ewidencji.`
        }
        confirmLabel={deleteTarget?.type === "attachment" ? "Usuń załącznik" : "Usuń wydatek"}
        isProcessing={deleteTarget ? processingId === deleteTarget.expense.id : false}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
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

function mergeLegalEntities(current: LegalEntityOption[], incoming: LegalEntityOption[]) {
  const merged = new Map(current.map((entity) => [entity.id, entity.name]));
  incoming.forEach((entity) => merged.set(entity.id, entity.name));
  return Array.from(merged, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name, "pl"),
  );
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
