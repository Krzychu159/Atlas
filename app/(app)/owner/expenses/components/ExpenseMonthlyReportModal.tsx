"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Download,
  FileText,
  Files,
  LoaderCircle,
  MapPin,
  PencilLine,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { compactControlHeightClassName, compactFieldLabelClassName } from "@/app/components/ui/field-density";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { isAbortError } from "@/app/lib/backend";
import { formatMoney } from "@/app/lib/formatters/money";
import type { Location } from "@/app/lib/owner/locations";
import {
  downloadExpenseMonthlyReportPdf,
  getExpenseMonthlyReport,
  type ExpenseMonthlyReport,
  type ExpenseMonthlyReportExpense,
  type ExpenseReportBreakdown,
  type ExpenseReportDocument,
} from "@/app/lib/owner/expenses";
import {
  clampReportMonth,
  compareReportMonths,
  formatReportMonth,
  getLocalReportMonth,
  MIN_REPORT_YEAR,
  shiftReportMonth,
  type ReportMonth,
  type SkippedPacketDocument,
} from "@/app/lib/owner/expense-monthly-report";
import { OwnerReadState } from "../../components/OwnerReadState";
import { showOwnerError, showOwnerSuccess } from "../../components/owner-toast";
import { useOwnerRead } from "../../components/use-owner-read";
import {
  downloadBlob,
  formatExpenseDate,
  getDictionaryLabel,
  type DictionaryOption,
} from "../expense-config";

type ExpenseMonthlyReportModalProps = {
  locations: Location[];
  initialLocationId: number | null;
  initialMonth: ReportMonth;
  categories: DictionaryOption[];
  paymentStatuses: DictionaryOption[];
  /** Changes after an expense is saved elsewhere, so the summary is read again. */
  revision: number;
  onEditExpense: (expenseId: number) => void;
  onClose: () => void;
};

type PacketResult = { key: string; skipped: SkippedPacketDocument[] };

// Sekcja: Dokumenty dla księgowej
export default function ExpenseMonthlyReportModal({
  locations,
  initialLocationId,
  initialMonth,
  categories,
  paymentStatuses,
  revision,
  onEditExpense,
  onClose,
}: ExpenseMonthlyReportModalProps) {
  const latestMonth = useMemo(() => getLocalReportMonth(), []);
  const [locationValue, setLocationValue] = useState(() =>
    initialLocationId !== null && locations.some((location) => location.id === initialLocationId)
      ? String(initialLocationId)
      : locations.length === 1 ? String(locations[0].id) : "",
  );
  const [period, setPeriod] = useState(() => clampReportMonth(initialMonth, latestMonth));
  const [downloading, setDownloading] = useState(false);
  const [packetResult, setPacketResult] = useState<PacketResult | null>(null);
  const downloadingRef = useRef(false);

  const locationId = locationValue ? Number(locationValue) : null;
  const query = useMemo(
    () => (locationId === null ? null : { locationId, year: period.year, month: period.month }),
    [locationId, period],
  );
  const queryKey = query ? JSON.stringify(query) : "none";
  const load = useCallback(
    (signal: AbortSignal) => (query ? getExpenseMonthlyReport(query, signal) : Promise.reject(new Error("Brak lokalizacji."))),
    [query],
  );
  const read = useOwnerRead(queryKey, load, "Nie udało się pobrać zestawienia kosztów.", revision, 0, query !== null);
  const report = read.data;
  const skippedAfterDownload = packetResult?.key === queryKey
    ? packetResult.skipped.filter((item) => item.status !== "Unsupported" && item.status !== "NotStored")
    : [];

  const locationOptions = [
    ...(locationValue ? [] : [{ value: "", label: "Wybierz lokalizację" }]),
    ...[...locations]
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || locationLabel(a).localeCompare(locationLabel(b), "pl"))
      .map((location) => ({
        value: String(location.id),
        label: location.isActive ? locationLabel(location) : `${locationLabel(location)} (nieaktywna)`,
      })),
  ];

  async function handleDownload() {
    if (!query || !report || downloadingRef.current) return;
    const requestKey = queryKey;
    const monthLabel = formatReportMonth(period).toLowerCase();
    downloadingRef.current = true;
    setDownloading(true);
    setPacketResult(null);

    try {
      const result = await downloadExpenseMonthlyReportPdf(query);
      downloadBlob(result.blob, result.fileName || `koszty-${query.year}-${String(query.month).padStart(2, "0")}.pdf`);
      setPacketResult({ key: requestKey, skipped: result.skipped });
      showOwnerSuccess(`Pobrano dokumenty za ${monthLabel}.`, { id: "expense-packet-download" });
    } catch (error) {
      if (isAbortError(error)) return;
      showOwnerError(error, "Nie udało się przygotować pliku PDF. Spróbuj ponownie.", {
        id: "expense-packet-download-error",
      });
    } finally {
      downloadingRef.current = false;
      setDownloading(false);
    }
  }

  const canGoBack = period.year > MIN_REPORT_YEAR || period.month > 1;
  const canGoForward = compareReportMonths(period, latestMonth) < 0;
  const canDownload = Boolean(report && report.documentCount > 0 && !read.loading && !downloading);

  return (
    <ModalOverlay onClose={onClose} className="py-6">
      <div className="relative z-10 flex max-h-full w-full max-w-[1040px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container shadow-ambient">
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <ModalHeader
            eyebrow="Finanse firmy"
            title="Dokumenty dla księgowej"
            description="Zestawienie kosztów lokalizacji z wybranego miesiąca i jeden plik PDF ze wszystkimi dokumentami."
            icon={<Files size={20} />}
            onClose={onClose}
          />

          {/* Wybór lokalizacji i miesiąca */}
          <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <CustomSelect
              label="Lokalizacja"
              value={locationValue}
              icon={<MapPin size={16} />}
              options={locationOptions}
              onChange={(value) => {
                setLocationValue(value);
                setPacketResult(null);
              }}
            />
            <MonthStepper
              value={period}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onChange={(delta) => {
                setPeriod((current) => clampReportMonth(shiftReportMonth(current, delta), latestMonth));
                setPacketResult(null);
              }}
            />
          </div>

          <div className="mt-5">
            {query === null ? (
              // Tall enough for the location list to open without being cut off by the scroll area.
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-8 text-center">
                <MapPin size={22} className="text-on-surface-muted" />
                <p className="max-w-[340px] text-sm leading-6 text-on-surface-variant">
                  Wybierz lokalizację, aby zobaczyć koszty i dokumenty z tego miesiąca.
                </p>
              </div>
            ) : (
              <OwnerReadState
                loading={read.loading}
                error={read.error}
                retry={read.retry}
                label="Przygotowuję zestawienie kosztów..."
              >
                {report ? (
                  <div className={`flex flex-col gap-5 transition-opacity ${read.loading ? "opacity-60" : ""}`}>
                    <ReportSummary report={report} />
                    {skippedAfterDownload.length ? (
                      <FailedDocuments report={report} skipped={skippedAfterDownload} onEditExpense={onEditExpense} />
                    ) : null}
                    <ReportReadiness report={report} onEditExpense={onEditExpense} />
                    <ReportBreakdowns report={report} categories={categories} />
                    <ReportExpenses report={report} categories={categories} paymentStatuses={paymentStatuses} />
                  </div>
                ) : null}
              </OwnerReadState>
            )}
          </div>
        </div>

        <ModalFooter className="flex-col-reverse sm:flex-row sm:items-center sm:justify-between">
          <p className="hidden text-xs text-on-surface-muted sm:mr-auto sm:block">
            {report && query
              ? report.documentCount > 0
                ? `${documentsLabel(report.documentCount)} w pliku PDF${report.skippedDocumentCount ? `, pominięte: ${report.skippedDocumentCount}` : ""}`
                : "W tym miesiącu nie ma dokumentów do pobrania."
              : ""}
          </p>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:flex">
            <Button type="button" variant="secondary" onClick={onClose}>
              Zamknij
            </Button>
            <Button
              type="button"
              icon={downloading ? <LoaderCircle size={17} className="animate-spin" /> : <Download size={17} />}
              onClick={() => void handleDownload()}
              disabled={!canDownload}
            >
              {downloading ? "Przygotowuję PDF..." : "Pobierz PDF"}
            </Button>
          </div>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}

function MonthStepper({
  value,
  canGoBack,
  canGoForward,
  onChange,
}: {
  value: ReportMonth;
  canGoBack: boolean;
  canGoForward: boolean;
  onChange: (delta: number) => void;
}) {
  return (
    <div>
      <p className={`mb-1.5 ${compactFieldLabelClassName}`}>Miesiąc</p>
      <div className={`flex items-center gap-1 rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest p-0.5 ${compactControlHeightClassName}`}>
        <button
          type="button"
          aria-label="Poprzedni miesiąc"
          onClick={() => onChange(-1)}
          disabled={!canGoBack}
          className="flex h-full w-9 items-center justify-center rounded-[var(--radius-md)] text-on-surface-muted transition hover:bg-white/5 hover:text-on-surface disabled:opacity-40"
        >
          <ChevronLeft size={17} />
        </button>
        <p aria-live="polite" className="min-w-[150px] flex-1 text-center text-sm font-semibold text-on-surface">
          {formatReportMonth(value)}
        </p>
        <button
          type="button"
          aria-label="Następny miesiąc"
          onClick={() => onChange(1)}
          disabled={!canGoForward}
          className="flex h-full w-9 items-center justify-center rounded-[var(--radius-md)] text-on-surface-muted transition hover:bg-white/5 hover:text-on-surface disabled:opacity-40"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

function ReportSummary({ report }: { report: ExpenseMonthlyReport }) {
  const currencies = report.currencies ?? [];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const tiles = [
    { label: "Koszty brutto", value: report.grossAmount, meta: expensesLabel(report.expenseCount) },
    { label: "Netto / VAT", value: report.netAmount, meta: `VAT ${formatAmount(report.vatAmount, currency)}` },
    { label: "Opłacone", value: report.paidGrossAmount, meta: "brutto" },
    { label: "Do zapłaty", value: report.unpaidGrossAmount, meta: "brutto" },
  ];

  return (
    <section className="flex flex-col gap-3">
      {currencies.length > 1 ? (
        <Notice tone="warning">
          Wydatki są w kilku walutach ({currencies.join(", ")}). Sumy dodają kwoty bez przeliczania, więc sprawdź je przed wysłaniem.
        </Notice>
      ) : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <article key={tile.label} className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
            <p className="text-label text-on-surface-muted">{tile.label}</p>
            <p className="mt-3 text-lg font-semibold tracking-tight text-on-surface md:text-xl">
              {formatAmount(tile.value, currency)}
            </p>
            <p className="mt-1 text-xs text-on-surface-muted">{tile.meta}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReportReadiness({
  report,
  onEditExpense,
}: {
  report: ExpenseMonthlyReport;
  onEditExpense: (expenseId: number) => void;
}) {
  const issues = (report.expenses ?? []).flatMap((expense) => {
    const messages = getExpenseIssues(expense);
    return messages.length ? [{ expense, messages }] : [];
  });

  if (!report.expenseCount) {
    return (
      <Notice tone="neutral">W tym miesiącu ta lokalizacja nie ma żadnych wydatków.</Notice>
    );
  }

  if (!issues.length && !report.missingDocumentCount && !report.skippedDocumentCount) {
    return (
      <Notice tone="success">Każdy wydatek ma dokument, który trafi do pliku PDF.</Notice>
    );
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-warning/20 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warning-light" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-on-surface">Przed wysłaniem</h3>
          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            {[
              report.missingDocumentCount ? `Bez dokumentu: ${expensesLabel(report.missingDocumentCount)}` : null,
              report.skippedDocumentCount ? `Poza plikiem PDF: ${documentsLabel(report.skippedDocumentCount)}` : null,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {issues.length ? (
        <ul className="mt-3 flex flex-col divide-y divide-white/5">
          {issues.map(({ expense, messages }) => (
            <IssueRow
              key={expense.id}
              expense={expense}
              messages={messages}
              onEditExpense={onEditExpense}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function FailedDocuments({
  report,
  skipped,
  onEditExpense,
}: {
  report: ExpenseMonthlyReport;
  skipped: SkippedPacketDocument[];
  onEditExpense: (expenseId: number) => void;
}) {
  const expenses = new Map((report.expenses ?? []).map((expense) => [expense.id, expense]));
  const rows = skipped.map((item) => {
    const expense = expenses.get(item.expenseId);
    const document = expense?.documents?.find((entry) => entry.attachmentId === item.attachmentId);
    const name = document?.fileName ? `„${document.fileName}”` : "Dokument";
    return {
      key: `${item.expenseId}:${item.attachmentId ?? "main"}`,
      expenseId: item.expenseId,
      title: expense ? expense.vendorName : "Wydatek",
      message: item.status === "Failed"
        ? `${name} nie dał się odczytać. Plik może być uszkodzony albo zabezpieczony hasłem, wgraj go ponownie.`
        : `${name} nie trafił do pliku PDF.`,
    };
  });

  return (
    <section role="alert" className="rounded-[var(--radius-lg)] border border-error/25 bg-error/5 p-4">
      <div className="flex items-start gap-3">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-error-light" />
        <div>
          <h3 className="text-sm font-semibold text-on-surface">
            Pobrany plik nie zawiera {rows.length === 1 ? "1 dokumentu" : `${rows.length} dokumentów`}
          </h3>
          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            Reszta dokumentów jest w pliku. Popraw poniższe i pobierz PDF ponownie.
          </p>
        </div>
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-white/5">
        {rows.map((row) => (
          <li key={row.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface">{row.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-on-surface-variant">{row.message}</p>
            </div>
            <Button type="button" size="sm" variant="secondary" icon={<PencilLine size={14} />} onClick={() => onEditExpense(row.expenseId)}>
              Uzupełnij
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function IssueRow({
  expense,
  messages,
  onEditExpense,
}: {
  expense: ExpenseMonthlyReportExpense;
  messages: string[];
  onEditExpense: (expenseId: number) => void;
}) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-on-surface">
          {expense.vendorName}
          <span className="font-normal text-on-surface-muted">
            {" · "}{expense.invoiceNumber || "bez numeru"}{" · "}{formatExpenseDate(expense.issueDate)}
          </span>
        </p>
        {messages.map((message) => (
          <p key={message} className="mt-0.5 text-xs leading-5 text-on-surface-variant">{message}</p>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        icon={<PencilLine size={14} />}
        onClick={() => onEditExpense(expense.id)}
        className="shrink-0"
      >
        Uzupełnij
      </Button>
    </li>
  );
}

function ReportBreakdowns({
  report,
  categories,
}: {
  report: ExpenseMonthlyReport;
  categories: DictionaryOption[];
}) {
  const currencies = report.currencies ?? [];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const byCategory = (report.byCategory ?? []).map((item) => ({
    ...item,
    label: Number.isFinite(Number(item.key)) ? getDictionaryLabel(Number(item.key), categories) : item.label,
  }));
  const byLegalEntity = report.byLegalEntity ?? [];
  if (!byCategory.length && !byLegalEntity.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <BreakdownList title="Kategorie" items={byCategory} currency={currency} />
      <BreakdownList title="Działalności" items={byLegalEntity} currency={currency} />
    </div>
  );
}

function BreakdownList({
  title,
  items,
  currency,
}: {
  title: string;
  items: ExpenseReportBreakdown[];
  currency: string | null;
}) {
  if (!items.length) return null;

  return (
    <section className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <h3 className="text-label text-on-surface-muted">{title}</h3>
      <ul className="mt-2 flex flex-col">
        {items.map((item) => (
          <li key={item.key} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
            <span className="min-w-0 truncate text-on-surface-variant">
              {item.label || "—"}
              <span className="ml-1.5 text-xs text-on-surface-muted">× {item.count}</span>
            </span>
            <span className="shrink-0 font-semibold text-on-surface">{formatAmount(item.grossAmount, currency)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReportExpenses({
  report,
  categories,
  paymentStatuses,
}: {
  report: ExpenseMonthlyReport;
  categories: DictionaryOption[];
  paymentStatuses: DictionaryOption[];
}) {
  const expenses = report.expenses ?? [];
  if (!expenses.length) return null;

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-white/5">
      <div className="hidden grid-cols-[96px_minmax(0,1.4fr)_minmax(0,0.8fr)_110px_minmax(0,1.3fr)] gap-4 border-b border-white/5 px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-wider text-on-surface-muted md:grid">
        <span>Wystawiono</span>
        <span>Kontrahent / dokument</span>
        <span>Kategoria</span>
        <span className="text-right">Brutto</span>
        <span>Dokumenty w PDF</span>
      </div>
      <ul className="divide-y divide-white/5">
        {expenses.map((expense) => (
          <li
            key={expense.id}
            className="grid gap-2 px-4 py-3 md:grid-cols-[96px_minmax(0,1.4fr)_minmax(0,0.8fr)_110px_minmax(0,1.3fr)] md:items-center md:gap-4"
          >
            <span className="text-xs font-semibold text-on-surface-variant">{formatExpenseDate(expense.issueDate)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface">{expense.vendorName}</p>
              <p className="mt-0.5 truncate text-xs text-on-surface-muted">
                {expense.invoiceNumber || expense.description || "Bez numeru"}
                {" · "}
                <span className={paymentTone(expense.paymentStatus)}>
                  {getDictionaryLabel(expense.paymentStatus, paymentStatuses)}
                </span>
              </p>
            </div>
            <span className="truncate text-xs text-on-surface-variant">
              {getDictionaryLabel(expense.category, categories)}
            </span>
            <span className="text-sm font-semibold text-on-surface md:text-right">
              {formatMoney(expense.grossAmount, expense.currency)}
            </span>
            <DocumentChips documents={expense.documents ?? []} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DocumentChips({ documents }: { documents: ExpenseReportDocument[] }) {
  if (!documents.length) {
    return <span className="text-xs font-semibold text-warning-light">Brak dokumentu</span>;
  }

  return (
    <ul className="flex min-w-0 flex-wrap gap-1.5">
      {documents.map((document) => {
        const included = isIncludedInPdf(document);
        return (
          <li
            key={document.attachmentId ?? "main"}
            title={document.fileName ?? undefined}
            className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${
              included
                ? "bg-tertiary/10 text-tertiary-light"
                : "bg-warning/10 text-warning-light"
            }`}
          >
            {included ? <FileText size={12} className="shrink-0" /> : <TriangleAlert size={12} className="shrink-0" />}
            <span className="truncate">
              {documentKindLabel(document)}
              {included ? "" : ` · ${document.status === "NotStored" ? "tylko link" : "poza PDF"}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Notice({ tone, children }: { tone: "success" | "warning" | "neutral"; children: React.ReactNode }) {
  const classes = {
    success: "bg-tertiary/10 text-tertiary-light",
    warning: "bg-warning/10 text-warning-light",
    neutral: "bg-surface-container-low text-on-surface-variant",
  }[tone];

  return (
    <p className={`flex items-start gap-2.5 rounded-[var(--radius-lg)] px-4 py-3 text-sm leading-5 ${classes}`}>
      {tone === "success" ? <CircleCheck size={17} className="mt-0.5 shrink-0" /> : null}
      {tone === "warning" ? <TriangleAlert size={17} className="mt-0.5 shrink-0" /> : null}
      <span>{children}</span>
    </p>
  );
}

function getExpenseIssues(expense: ExpenseMonthlyReportExpense) {
  const documents = expense.documents ?? [];
  if (!documents.length) return ["Brak dokumentu, więc ten wydatek nie trafi do pliku PDF."];

  return documents.flatMap((document) => {
    const name = document.fileName ? `„${document.fileName}”` : documentKindLabel(document);
    if (document.status === "Unsupported") {
      return [`${name} ma format, którego nie da się dołączyć do PDF. Wgraj plik PDF, JPG lub PNG.`];
    }
    if (document.status === "NotStored") {
      return ["Faktura jest zapisana tylko jako link. Wgraj plik, żeby trafiła do PDF."];
    }
    return [];
  });
}

function isIncludedInPdf(document: ExpenseReportDocument) {
  return document.status === "Pdf" || document.status === "Image";
}

function documentKindLabel(document: ExpenseReportDocument) {
  if (document.attachmentId === null) return "Faktura";
  if (document.kind === 0) return "Faktura / korekta";
  if (document.kind === 1) return "Potwierdzenie przelewu";
  if (document.kind === 2) return "Inny dokument";
  return "Dokument";
}

function paymentTone(status: number) {
  if (status === 1) return "font-semibold text-tertiary-light";
  if (status === 2) return "font-semibold text-error-light";
  return "font-semibold text-warning-light";
}

function formatAmount(value: number, currency: string | null) {
  if (currency) return formatMoney(value, currency);
  return new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value ?? 0);
}

function locationLabel(location: Location) {
  return location.name || location.city || `Lokalizacja ${location.id}`;
}

function plural(count: number, one: string, few: string, many: string) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (count === 1) return one;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}

function documentsLabel(count: number) {
  return `${count} ${plural(count, "dokument", "dokumenty", "dokumentów")}`;
}

function expensesLabel(count: number) {
  return `${count} ${plural(count, "wydatek", "wydatki", "wydatków")}`;
}
