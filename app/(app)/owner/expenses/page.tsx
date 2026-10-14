"use client";

import { useOwnerLocationFilter } from "@/app/lib/owner/location-filter";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Repeat2, ReceiptText } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import {
  deleteExpense,
  deleteExpenseAttachment,
  downloadExpenseAttachment,
  getExpense,
  getExpenseCategories,
  getExpensePaymentStatuses,
  getExpenseRecurrenceEditScopes,
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
import { useOwnerRead } from "../components/use-owner-read";
import { OwnerReadState } from "../components/OwnerReadState";
import {
  deriveLegalEntities,
  fallbackCategories,
  fallbackPaymentStatuses,
  fallbackRecurrenceEditScopes,
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
  const { selectedLocationId } = useOwnerLocationFilter();
  const locationId = selectedLocationId;
  return <OwnerExpensesPageContent key={locationId ?? "all"} locationId={locationId} />;
}

function OwnerExpensesPageContent({ locationId }: { locationId: number | null }) {
  const { setSelectedLocationValue } = useOwnerLocationFilter();
  const [view, setView] = useState<"all" | "recurring">("all");
  const [filters, setFilters] = useState<ExpenseFiltersValue>(initialExpenseFilters);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [categories, setCategories] = useState<DictionaryOption[]>(fallbackCategories);
  const [paymentStatuses, setPaymentStatuses] = useState<DictionaryOption[]>(fallbackPaymentStatuses);
  const [recurrenceEditScopes, setRecurrenceEditScopes] = useState<DictionaryOption[]>(fallbackRecurrenceEditScopes);
  const [locations, setLocations] = useState<Location[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntityOption[]>([]);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CompanyExpense | null>(null);
  const [loadingExpenseId, setLoadingExpenseId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteRecurrenceScope, setDeleteRecurrenceScope] = useState("0");

  const summaryQuery = useMemo<ExpenseQuery>(
    () => ({
      legalEntityId: numberFilter(filters.legalEntityId),
      locationId,
      category: numberFilter(filters.category),
      paymentStatus: numberFilter(filters.paymentStatus),
      from: nullable(filters.from),
      to: nullable(filters.to),
      dueFrom: nullable(filters.dueFrom),
      dueTo: nullable(filters.dueTo),
      paidFrom: nullable(filters.paidFrom),
      paidTo: nullable(filters.paidTo),
      search: nullable(filters.search.trim()),
      isRecurring: view === "recurring" ? true : null,
      isOverdue: booleanFilter(filters.isOverdue),
    }),
    [filters, locationId, view],
  );

  const query = useMemo<ExpenseQuery>(() => ({ ...summaryQuery, page, pageSize }), [summaryQuery, page, pageSize]);
  const loadList = useCallback((signal: AbortSignal) => getExpenses(query, signal), [query]);
  const loadSummary = useCallback((signal: AbortSignal) => getExpenseStatistics(summaryQuery, signal), [summaryQuery]);
  const list = useOwnerRead(JSON.stringify(query), loadList, "Nie udało się pobrać wydatków.", 0, 300);
  const summary = useOwnerRead(JSON.stringify(summaryQuery), loadSummary, "Nie udało się pobrać podsumowania wydatków.", 0, 300);
  const expenses = list.data?.items ?? [];
  const statistics = summary.data ?? emptyStatistics;
  const totalCount = list.data?.totalCount ?? expenses.length;
  const totalPages = Math.max(1, list.data?.totalPages || Math.ceil(totalCount / pageSize));
  const isLoading = list.loading;
  const isRefreshing = list.loading || summary.loading;

  async function loadData() {
    await Promise.allSettled([list.reload(), summary.reload()]);
  }

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setLegalEntities(current => mergeLegalEntities(current, deriveLegalEntities(list.data?.items ?? [], summary.data ?? null, locations)));
    });
    return () => { active = false; };
  }, [list.data, summary.data, locations]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      Promise.allSettled([
        getExpenseCategories(),
        getExpensePaymentStatuses(),
        getExpenseRecurrenceEditScopes(),
        getLocations(),
      ]).then(([categoriesResult, statusesResult, scopesResult, locationsResult]) => {
        if (!active) return;
        if (categoriesResult.status === "fulfilled") {
          setCategories(normalizeDictionary(categoriesResult.value, fallbackCategories));
        }
        if (statusesResult.status === "fulfilled") {
          setPaymentStatuses(normalizeDictionary(statusesResult.value, fallbackPaymentStatuses));
        }
        if (scopesResult.status === "fulfilled") {
          setRecurrenceEditScopes(
            normalizeDictionary(scopesResult.value, fallbackRecurrenceEditScopes),
          );
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

    return () => { active = false; window.clearTimeout(timer); };
  }, []);

  function updateFilter<K extends keyof ExpenseFiltersValue>(
    key: K,
    value: ExpenseFiltersValue[K],
  ) {
    if (key === "locationId") setSelectedLocationValue(value);
    else setFilters((current) => ({ ...current, [key]: value }));
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
      await loadData();
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
        await deleteExpense(
          target.expense.id,
          target.expense.isRecurring ? Number(deleteRecurrenceScope) : null,
        );
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
      await loadData();
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
            onClick={() => void loadData()}
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
            {view === "recurring" ? "Dodaj cykliczny" : "Dodaj wydatek"}
          </Button>
        </div>
      </header>

      {/* Sekcja: Widok wydatków */}
      <div className="inline-flex w-full rounded-[var(--radius-xl)] bg-surface-container-low p-1 sm:w-fit">
        <ViewButton
          active={view === "all"}
          icon={<ReceiptText size={16} />}
          onClick={() => {
            setView("all");
            setPage(1);
          }}
        >
          Wydatki
        </ViewButton>
        <ViewButton
          active={view === "recurring"}
          icon={<Repeat2 size={16} />}
          onClick={() => {
            setView("recurring");
            setPage(1);
          }}
        >
          Cykliczne
        </ViewButton>
      </div>

      {/* Sekcja: Podsumowanie wydatków */}
      <OwnerReadState loading={summary.loading} error={summary.error} retry={summary.retry} label="Ładowanie podsumowania wydatków...">{summary.data !== undefined ? <ExpenseStats statistics={statistics} isLoading={summary.loading} /> : null}</OwnerReadState>

      {/* Sekcja: Filtry wydatków */}
      <ExpenseFilters
        value={{ ...filters, locationId: locationId === null ? "all" : String(locationId) }}
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
      <OwnerReadState loading={false} error={list.error} retry={list.retry} label="Ładowanie wydatków..." />
      {list.data !== undefined || list.loading ? <ExpensesList
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
        onDelete={(expense) => {
          setDeleteRecurrenceScope("0");
          setDeleteTarget({ type: "expense", expense });
        }}
        onDeleteAttachment={(expense) => {
          setDeleteRecurrenceScope("0");
          setDeleteTarget({ type: "attachment", expense });
        }}
      /> : null}

      {/* Sekcja: Formularz i potwierdzenia */}
      <ExpenseFormModal
        open={formOpen}
        expense={editingExpense}
        categories={categories}
        paymentStatuses={paymentStatuses}
        recurrenceEditScopes={recurrenceEditScopes}
        legalEntities={legalEntities}
        locations={locations}
        defaultRecurring={view === "recurring"}
        onClose={() => {
          setFormOpen(false);
          setEditingExpense(null);
        }}
        onSaved={() => void loadData()}
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
      >
        {deleteTarget?.type === "expense" && deleteTarget.expense.isRecurring ? (
          <div>
            <p className="text-label text-on-surface-muted">Zakres usuwania</p>
            <CustomSelect
              value={deleteRecurrenceScope}
              options={recurrenceEditScopes.map((scope) => ({
                value: String(scope.value),
                label: scope.label,
              }))}
              onChange={setDeleteRecurrenceScope}
              className="mt-2"
            />
          </div>
        ) : null}
      </ExpenseConfirmModal>
    </div>
  );
}

function ViewButton({
  active,
  icon,
  onClick,
  children,
}: {
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-[var(--radius-lg)] px-5 text-sm font-semibold transition sm:flex-none ${
        active
          ? "bg-primary text-on-primary shadow-sm"
          : "text-on-surface-muted hover:bg-white/5 hover:text-on-surface"
      }`}
    >
      {icon}
      {children}
    </button>
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
