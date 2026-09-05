"use client";

import { useState, type ReactNode } from "react";
import {
  CalendarClock,
  Check,
  Download,
  Edit3,
  FileText,
  LoaderCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Repeat2,
  Trash2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { formatMoney } from "@/app/lib/formatters/money";
import type { CompanyExpense } from "@/app/lib/owner/expenses";
import {
  formatExpenseDate,
  getDictionaryLabel,
  getExpenseStatusTone,
  getRecurrenceLabel,
  type DictionaryOption,
} from "../expense-config";

type ExpensesListProps = {
  expenses: CompanyExpense[];
  categories: DictionaryOption[];
  paymentStatuses: DictionaryOption[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  loadingExpenseId: number | null;
  processingId: number | null;
  onPageChange: (page: number) => void;
  onAdd: () => void;
  onEdit: (expense: CompanyExpense) => void;
  onMarkPaid: (expense: CompanyExpense) => void;
  onDownload: (expense: CompanyExpense) => void;
  onDelete: (expense: CompanyExpense) => void;
  onDeleteAttachment: (expense: CompanyExpense) => void;
};

// Sekcja: Lista dokumentów kosztowych
export default function ExpensesList({
  expenses,
  categories,
  paymentStatuses,
  totalCount,
  totalPages,
  page,
  pageSize,
  isLoading,
  loadingExpenseId,
  processingId,
  onPageChange,
  onAdd,
  onEdit,
  onMarkPaid,
  onDownload,
  onDelete,
  onDeleteAttachment,
}: ExpensesListProps) {
  return (
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
        <EmptyExpenses onAdd={onAdd} />
      ) : (
        <>
          {/* Widok tabelaryczny: desktop */}
          <div className="hidden lg:block">
            <ExpenseTable
              expenses={expenses}
              categories={categories}
              paymentStatuses={paymentStatuses}
              loadingExpenseId={loadingExpenseId}
              processingId={processingId}
              onEdit={onEdit}
              onMarkPaid={onMarkPaid}
              onDownload={onDownload}
              onDelete={onDelete}
              onDeleteAttachment={onDeleteAttachment}
            />
          </div>

          {/* Widok kart: urządzenia mobilne */}
          <div className="flex flex-col gap-3 p-3 lg:hidden">
            {expenses.map((expense) => (
              <ExpenseMobileCard
                key={expense.id}
                expense={expense}
                categoryLabel={getDictionaryLabel(expense.category, categories)}
                statusLabel={getDictionaryLabel(expense.paymentStatus, paymentStatuses)}
                isLoading={loadingExpenseId === expense.id || processingId === expense.id}
                onEdit={() => onEdit(expense)}
                onMarkPaid={() => onMarkPaid(expense)}
                onDownload={() => onDownload(expense)}
                onDelete={() => onDelete(expense)}
                onDeleteAttachment={() => onDeleteAttachment(expense)}
              />
            ))}
          </div>
        </>
      )}

      {/* Nawigacja stron listy */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onChange={onPageChange}
      />
    </section>
  );
}

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
}: Pick<
  ExpensesListProps,
  | "expenses"
  | "categories"
  | "paymentStatuses"
  | "loadingExpenseId"
  | "processingId"
  | "onEdit"
  | "onMarkPaid"
  | "onDownload"
  | "onDelete"
  | "onDeleteAttachment"
>) {
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
            const busy = loadingExpenseId === expense.id || processingId === expense.id;
            return (
              <tr
                key={expense.id}
                className="border-b border-white/5 transition last:border-b-0 hover:bg-surface-container-high/45"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/12 text-primary-light">
                      {expense.isRecurring ? <Repeat2 size={17} /> : <FileText size={17} />}
                    </span>
                    <div className="min-w-0">
                      <p className="max-w-[230px] truncate text-sm font-semibold text-on-surface">
                        {expense.vendorName}
                      </p>
                      <p className="mt-1 max-w-[230px] truncate text-xs text-on-surface-muted">
                        {expense.invoiceNumber || expense.description || "Bez numeru"}
                      </p>
                      {expense.isRecurring ? (
                        <p className="mt-1 flex items-center gap-1 text-[0.68rem] font-semibold text-primary-light">
                          <Repeat2 size={11} />
                          {getRecurrenceLabel(expense)}
                          {expense.recurrenceInstanceNumber
                            ? ` · nr ${expense.recurrenceInstanceNumber}`
                            : ""}
                        </p>
                      ) : null}
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
                  <p className={`mt-1 text-xs ${expense.isOverdue ? "font-semibold text-error-light" : "text-on-surface-muted"}`}>
                    Termin: {formatExpenseDate(expense.dueDate)}
                  </p>
                </td>
                <td className="px-4 py-4 text-right text-sm font-semibold text-on-surface">
                  {formatMoney(expense.grossAmount, expense.currency)}
                </td>
                <td className="px-4 py-4">
                  <ExpenseStatusBadge
                    expense={expense}
                    label={getDictionaryLabel(expense.paymentStatus, paymentStatuses)}
                  />
                </td>
                <td className="px-4 py-4">
                  {expense.attachmentUrl || expense.attachmentFileName ? (
                    <div className="flex items-center gap-1">
                      <ActionButton label="Pobierz załącznik" onClick={() => onDownload(expense)} disabled={busy} icon={<Download size={15} />} />
                      <ActionButton label="Usuń załącznik" onClick={() => onDeleteAttachment(expense)} disabled={busy} tone="danger" icon={<Trash2 size={14} />} />
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface-muted">Brak</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-1">
                    {expense.paymentStatus !== 1 && expense.paymentStatus !== 3 ? (
                      <ActionButton label="Oznacz jako opłacone" onClick={() => onMarkPaid(expense)} disabled={busy} tone="success" icon={<Check size={15} />} />
                    ) : null}
                    <ActionButton
                      label="Edytuj wydatek"
                      onClick={() => onEdit(expense)}
                      disabled={busy}
                      icon={loadingExpenseId === expense.id ? <LoaderCircle size={15} className="animate-spin" /> : <Edit3 size={15} />}
                    />
                    <ActionButton label="Usuń wydatek" onClick={() => onDelete(expense)} disabled={busy} tone="danger" icon={<Trash2 size={15} />} />
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
    <article className={`rounded-[var(--radius-xl)] border bg-surface-container-low p-4 ${expense.isOverdue ? "border-error/30" : "border-white/5"}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/15 text-primary-light">
          {expense.isRecurring ? <Repeat2 size={17} /> : <FileText size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface">{expense.vendorName}</p>
              <p className="mt-1 truncate text-xs uppercase tracking-wide text-on-surface-muted">
                {categoryLabel} · {expense.locationName || expense.legalEntityName}
              </p>
              {expense.isRecurring ? (
                <p className="mt-1.5 flex items-center gap-1 text-[0.68rem] font-semibold text-primary-light">
                  <Repeat2 size={11} />
                  {getRecurrenceLabel(expense)}
                  {expense.recurrenceInstanceNumber
                    ? ` · nr ${expense.recurrenceInstanceNumber}`
                    : ""}
                </p>
              ) : null}
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
              <p className="text-lg font-semibold text-on-surface">{formatMoney(expense.grossAmount, expense.currency)}</p>
              <p className="mt-1 text-xs text-on-surface-muted">Termin {formatExpenseDate(expense.dueDate)}</p>
            </div>
            <ExpenseStatusBadge expense={expense} label={statusLabel} />
          </div>
        </div>
      </div>

      {actionsOpen ? (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
          {expense.paymentStatus !== 1 && expense.paymentStatus !== 3 ? (
            <MobileAction label="Opłacone" icon={<Check size={14} />} onClick={onMarkPaid} disabled={isLoading} />
          ) : null}
          <MobileAction label="Edytuj" icon={<Edit3 size={14} />} onClick={onEdit} disabled={isLoading} />
          {expense.attachmentUrl || expense.attachmentFileName ? (
            <>
              <MobileAction label="Pobierz plik" icon={<Download size={14} />} onClick={onDownload} disabled={isLoading} />
              <MobileAction label="Usuń plik" icon={<Paperclip size={14} />} onClick={onDeleteAttachment} disabled={isLoading} danger />
            </>
          ) : null}
          <MobileAction label="Usuń wydatek" icon={<Trash2 size={14} />} onClick={onDelete} disabled={isLoading} danger />
        </div>
      ) : null}
    </article>
  );
}

function ExpenseStatusBadge({ expense, label }: { expense: CompanyExpense; label: string }) {
  const tone = getExpenseStatusTone(expense);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide ${statusToneClasses[tone]}`}>
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

function ActionButton({ label, icon, onClick, disabled, tone = "default" }: { label: string; icon: ReactNode; onClick: () => void; disabled: boolean; tone?: "default" | "success" | "danger" }) {
  const toneClass = tone === "danger"
    ? "hover:bg-error-container/45 hover:text-error-light"
    : tone === "success"
      ? "hover:bg-tertiary-container/45 hover:text-tertiary-light"
      : "hover:bg-surface-container-high hover:text-on-surface";

  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`flex h-9 w-9 items-center justify-center rounded-full text-on-surface-muted transition disabled:cursor-wait disabled:opacity-40 ${toneClass}`}>
      {icon}
    </button>
  );
}

function MobileAction({ label, icon, onClick, disabled, danger = false }: { label: string; icon: ReactNode; onClick: () => void; disabled: boolean; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-surface-container-high px-3 text-xs font-semibold transition disabled:opacity-40 ${danger ? "text-error-light" : "text-on-surface-variant"}`}>
      {icon}
      {label}
    </button>
  );
}

function Pagination({ page, totalPages, totalCount, pageSize, onChange }: { page: number; totalPages: number; totalCount: number; pageSize: number; onChange: (page: number) => void }) {
  if (totalCount === 0) return null;
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalCount);
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-white/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
      <p className="text-xs text-on-surface-muted">Wyświetlono {firstItem}–{lastItem} z {totalCount}</p>
      <div className="flex items-center gap-1">
        <PageButton label="Poprzednia strona" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</PageButton>
        {visiblePages.map((pageNumber) => (
          <PageButton key={pageNumber} label={`Strona ${pageNumber}`} active={pageNumber === page} onClick={() => onChange(pageNumber)}>
            {pageNumber}
          </PageButton>
        ))}
        <PageButton label="Następna strona" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>›</PageButton>
      </div>
    </div>
  );
}

function PageButton({ label, active = false, disabled = false, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-md)] px-2 text-xs font-semibold transition disabled:opacity-30 ${active ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"}`}
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
        W wybranym zakresie nie ma dokumentów. Zmień filtry albo dodaj pierwszy koszt.
      </p>
      <Button type="button" size="sm" icon={<Plus size={15} />} onClick={onAdd} className="mt-5">
        Dodaj wydatek
      </Button>
    </div>
  );
}

function getVisiblePages(page: number, totalPages: number) {
  const candidates = [1, page - 1, page, page + 1, totalPages];
  return [...new Set(candidates)].filter((candidate) => candidate >= 1 && candidate <= totalPages);
}

function pluralizeDocuments(count: number) {
  if (count === 1) return "dokument";
  const lastTwo = count % 100;
  const last = count % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return "dokumenty";
  return "dokumentów";
}
