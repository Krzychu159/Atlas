"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ReceiptText,
  RotateCcw,
  Search,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { DateRangeFilter } from "@/app/components/ui/date-range-filter";
import {
  OwnerTextArea,
  OwnerTextField,
} from "../components/OwnerFormControls";
import {
  cancelPaymentReceipt,
  confirmClientPayment,
  getOwnerPayments,
  getPaymentMethodLabel,
  getPaymentSourceLabel,
  getPaymentStatusLabel,
  issuePaymentReceipt,
  isConfirmedPayment,
  isPendingPayment,
  isReceiptIssued,
  isRejectedPayment,
  isReversedPayment,
  rejectClientPayment,
  reverseClientPayment,
  type ClientPayment,
  type ClientPaymentSource,
  type ClientPaymentStatus,
} from "@/app/lib/owner/billing";
import {
  showOwnerError,
  showOwnerSuccess,
} from "../components/owner-toast";

export default function OwnerPaymentsPage() {
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [paymentToReject, setPaymentToReject] =
    useState<ClientPayment | null>(null);
  const [paymentToReverse, setPaymentToReverse] =
    useState<ClientPayment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reversalReason, setReversalReason] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [overpaymentFilter, setOverpaymentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const clientId = params.get("clientId");

      if (clientId) {
        setClientFilter(clientId);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPayments();
    }, 250);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    amountMax,
    amountMin,
    clientFilter,
    dateFrom,
    dateTo,
    overpaymentFilter,
    sourceFilter,
    statusFilter,
  ]);

  async function loadPayments() {
    try {
      setIsLoading(true);
      const data = await getOwnerPayments(buildBackendPaymentQuery());
      setPayments(data.items || []);
    } catch (err) {
      showOwnerError(err, "Nie udało się pobrać płatności.", {
        id: "owner-payments-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm(payment: ClientPayment) {
    if (!isPendingPayment(payment)) {
      showOwnerSuccess("Ta wpłata jest już rozliczona.", {
        id: `owner-payment-not-pending-${payment.id}`,
      });
      return;
    }

    try {
      setProcessingId(payment.id);
      await confirmClientPayment(payment.id);
      showOwnerSuccess("Wpłata została potwierdzona.", {
        id: `owner-payment-confirmed-${payment.id}`,
      });
      await loadPayments();
    } catch (err) {
      showOwnerError(err, "Nie udało się potwierdzić wpłaty.", {
        id: `owner-payment-confirm-error-${payment.id}`,
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRejectPayment() {
    if (!paymentToReject) return;

    const reason = rejectReason.trim();

    if (!reason) {
      showOwnerError(new Error("Podaj powód odrzucenia wpłaty."), "", {
        id: "owner-payment-reject-reason-required",
      });
      return;
    }

    try {
      setProcessingId(paymentToReject.id);
      await rejectClientPayment(paymentToReject.id, reason);
      setPaymentToReject(null);
      setRejectReason("");
      showOwnerSuccess("Wpłata została odrzucona.", {
        id: `owner-payment-rejected-${paymentToReject.id}`,
      });
      await loadPayments();
    } catch (err) {
      showOwnerError(err, "Nie udało się odrzucić wpłaty.", {
        id: `owner-payment-reject-error-${paymentToReject.id}`,
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleIssueReceipt(payment: ClientPayment) {
    try {
      setProcessingId(payment.id);
      await issuePaymentReceipt(payment.id);
      showOwnerSuccess("Paragon został wystawiony.", {
        id: `owner-payment-receipt-issued-${payment.id}`,
      });
      await loadPayments();
    } catch (err) {
      showOwnerError(err, "Nie udało się wystawić paragonu.", {
        id: `owner-payment-receipt-issue-error-${payment.id}`,
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleCancelReceipt(payment: ClientPayment) {
    try {
      setProcessingId(payment.id);
      await cancelPaymentReceipt(payment.id);
      showOwnerSuccess("Paragon został cofnięty.", {
        id: `owner-payment-receipt-cancelled-${payment.id}`,
      });
      await loadPayments();
    } catch (err) {
      showOwnerError(err, "Nie udało się cofnąć paragonu.", {
        id: `owner-payment-receipt-cancel-error-${payment.id}`,
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReversePayment() {
    if (!paymentToReverse) return;

    const reason = reversalReason.trim();

    if (!reason) {
      showOwnerError(new Error("Podaj powód cofnięcia wpłaty."), "", {
        id: "owner-payment-reverse-reason-required",
      });
      return;
    }

    try {
      setProcessingId(paymentToReverse.id);
      await reverseClientPayment(paymentToReverse.id, reason);
      setPaymentToReverse(null);
      setReversalReason("");
      showOwnerSuccess("Wpłata została cofnięta.", {
        id: `owner-payment-reversed-${paymentToReverse.id}`,
      });
      await loadPayments();
    } catch (err) {
      showOwnerError(err, "Nie udało się cofnąć wpłaty.", {
        id: `owner-payment-reverse-error-${paymentToReverse.id}`,
      });
    } finally {
      setProcessingId(null);
    }
  }

  const filteredPayments = useMemo(
    () =>
      sortPayments(
        filterPaymentsByClientText(payments, clientFilter),
        sortBy,
      ),
    [clientFilter, payments, sortBy],
  );

  const activeFilterCount = [
    clientFilter.trim(),
    statusFilter !== "all",
    sourceFilter !== "all",
    overpaymentFilter !== "all",
    dateFrom,
    dateTo,
    amountMin.trim(),
    amountMax.trim(),
  ].filter(Boolean).length;

  function clearFilters() {
    setClientFilter("");
    setStatusFilter("all");
    setSourceFilter("all");
    setOverpaymentFilter("all");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setSortBy("newest");
  }

  function buildBackendPaymentQuery() {
    const clientId = parseClientIdFilter(clientFilter);

    return {
      clientId,
      status:
        statusFilter === "all"
          ? null
          : (Number(statusFilter) as ClientPaymentStatus),
      source:
        sourceFilter === "all"
          ? null
          : (Number(sourceFilter) as ClientPaymentSource),
      hasOverpayment:
        overpaymentFilter === "all" ? null : overpaymentFilter === "yes",
      from: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : null,
      to: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : null,
      amountMin: parseMoneyFilter(amountMin),
      amountMax: parseMoneyFilter(amountMax),
      page: 1,
      pageSize: 1000,
    };
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Panel ownera</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Płatności
          </h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
            Historia operacji płatniczych klientów z podziałem na kwotę wpłaty,
            część rozliczoną z pakietem i nadpłatę przeniesioną na saldo.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={
            <RefreshCw
              size={16}
              className={isLoading ? "animate-spin" : ""}
            />
          }
          onClick={loadPayments}
          disabled={isLoading}
        >
          Odśwież
        </Button>
      </div>

      <section className="card-shell p-4 md:p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_260px_220px_auto_auto] xl:items-end">
          <PaymentSearchField
            value={clientFilter}
            onChange={setClientFilter}
          />
          <DateRangeFilter
            value={{ from: dateFrom, to: dateTo }}
            onChange={(range) => {
              setDateFrom(range.from);
              setDateTo(range.to);
            }}
          />
          <CustomSelect
            label="Sortuj"
            value={sortBy}
            onChange={setSortBy}
            options={paymentSortOptions}
          />
          <Button
            variant={advancedFiltersOpen ? "primary" : "secondary"}
            icon={<SlidersHorizontal size={16} />}
            onClick={() => setAdvancedFiltersOpen((current) => !current)}
            className="w-full xl:w-auto"
          >
            Filtry
          </Button>
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="w-full xl:w-auto"
          >
            Wyczyść
          </Button>
        </div>

        {advancedFiltersOpen ? (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-low p-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(170px,1fr))_minmax(135px,0.7fr)_minmax(135px,0.7fr)]">
            <CustomSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={paymentStatusOptions}
            />
            <CustomSelect
              label="Źródło"
              value={sourceFilter}
              onChange={setSourceFilter}
              options={paymentSourceOptions}
            />
            <CustomSelect
              label="Nadpłata"
              value={overpaymentFilter}
              onChange={setOverpaymentFilter}
              options={overpaymentOptions}
            />
            <OwnerTextField
              label="Kwota od"
              value={amountMin}
              onChange={setAmountMin}
              inputMode="decimal"
            />
            <OwnerTextField
              label="Kwota do"
              value={amountMax}
              onChange={setAmountMax}
              inputMode="decimal"
            />
            </div>
          </div>
        ) : null}

        {activeFilterCount > 0 ? (
          <p className="mt-4 text-xs font-semibold text-primary-light">
            Filtry są aktywne.
          </p>
        ) : null}
      </section>

      <section className="card-shell p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-section-title">Operacje płatnicze</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Każdy wiersz pokazuje faktycznie wpłaconą kwotę oraz to, jak
              została rozdzielona między pakiet i saldo klienta.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-5 text-on-surface-variant">
            Ładowanie płatności...
          </div>
        ) : filteredPayments.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredPayments.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                processing={processingId === payment.id}
                onConfirm={() => handleConfirm(payment)}
                onReject={() => {
                  setPaymentToReject(payment);
                  setRejectReason("");
                }}
                onIssueReceipt={() => handleIssueReceipt(payment)}
                onCancelReceipt={() => handleCancelReceipt(payment)}
                onReverse={() => {
                  setPaymentToReverse(payment);
                  setReversalReason("");
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-8 text-center text-on-surface-variant">
            Brak płatności pasujących do filtrów.
          </div>
        )}
      </section>

      {paymentToReject ? (
        <RejectPaymentModal
          payment={paymentToReject}
          reason={rejectReason}
          processing={processingId === paymentToReject.id}
          onReasonChange={setRejectReason}
          onClose={() => {
            setPaymentToReject(null);
            setRejectReason("");
          }}
          onConfirm={handleRejectPayment}
        />
      ) : null}

      {paymentToReverse ? (
        <ReversePaymentModal
          payment={paymentToReverse}
          reason={reversalReason}
          processing={processingId === paymentToReverse.id}
          onReasonChange={setReversalReason}
          onClose={() => {
            setPaymentToReverse(null);
            setReversalReason("");
          }}
          onConfirm={handleReversePayment}
        />
      ) : null}
    </div>
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
      <div className="mt-2 flex h-12 items-center gap-3 rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest px-4 transition focus-within:border-primary-light/40">
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

function PaymentRow({
  payment,
  processing,
  onConfirm,
  onReject,
  onIssueReceipt,
  onCancelReceipt,
  onReverse,
}: {
  payment: ClientPayment;
  processing: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onIssueReceipt: () => void;
  onCancelReceipt: () => void;
  onReverse: () => void;
}) {
  const pending = isPendingPayment(payment);
  const confirmed = isConfirmedPayment(payment);
  const rejected = isRejectedPayment(payment);
  const reversed = isReversedPayment(payment);
  const hasOverpayment = payment.balanceCreditAmount > 0;
  const receiptIssued = isReceiptIssued(payment);

  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <div className="grid gap-4 xl:grid-cols-[0.7fr_1.15fr_1fr_0.9fr_auto] xl:items-center">
        <div>
          <p className="text-label text-on-surface-muted">Data</p>
          <p className="mt-1 text-sm font-semibold text-on-surface">
            {formatDate(payment.paymentDate)}
          </p>
          <p className="mt-1 text-xs text-on-surface-muted">
            Źródło: {getPaymentSourceLabel(payment.source)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-on-surface">
            {payment.clientName || `Klient #${payment.clientId}`}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {payment.packageName || "Bez przypisanego pakietu"}
          </p>
          {payment.note ? (
            <p className="mt-2 line-clamp-2 text-xs text-on-surface-muted">
              {payment.note}
            </p>
          ) : null}
        </div>

        <PaymentSplit payment={payment} />

        <div>
          <p className="text-label text-on-surface-muted">Status i metoda</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill
              label={getPaymentStatusLabel(payment.status)}
              tone={
                pending
                  ? "warning"
                  : rejected || reversed
                    ? "danger"
                    : confirmed
                      ? "success"
                      : "neutral"
              }
            />
            <StatusPill label={getPaymentMethodLabel(payment.method)} muted />
            {hasOverpayment ? (
              <StatusPill label="Nadpłata" tone="success" />
            ) : null}
            {receiptIssued ? <StatusPill label="Paragon" muted /> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {pending ? (
            <>
              <Button
                size="sm"
                icon={<CheckCircle2 size={15} />}
                onClick={onConfirm}
                disabled={processing}
              >
                Potwierdź
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<XCircle size={15} />}
                onClick={onReject}
                disabled={processing}
              >
                Odrzuć
              </Button>
            </>
          ) : null}
          {confirmed && !reversed ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                icon={<ReceiptText size={15} />}
                onClick={receiptIssued ? onCancelReceipt : onIssueReceipt}
                disabled={processing}
              >
                {receiptIssued ? "Cofnij paragon" : "Wystaw paragon"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<RotateCcw size={15} />}
                onClick={onReverse}
                disabled={processing}
              >
                Cofnij wpłatę
              </Button>
            </>
          ) : null}
          <ButtonLinkLike href={`/owner/clients/${payment.clientId}/payments`} />
        </div>
      </div>
    </article>
  );
}

function PaymentSplit({ payment }: { payment: ClientPayment }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-container-lowest px-3 py-2 text-sm">
      <p className="text-label text-on-surface-muted">Rozliczenie</p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <PaymentSplitItem
          label="Wpłata"
          value={formatMoney(payment.amount, payment.currency)}
        />
        <PaymentSplitItem
          label="Pakiet"
          value={formatMoney(payment.appliedToPackageAmount, payment.currency)}
        />
        <PaymentSplitItem
          label="Saldo"
          value={
            payment.balanceCreditAmount > 0
              ? `+${formatMoney(payment.balanceCreditAmount, payment.currency)}`
              : formatMoney(payment.balanceCreditAmount, payment.currency)
          }
          accent={payment.balanceCreditAmount > 0}
        />
      </div>
    </div>
  );
}

function PaymentSplitItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-on-surface-muted">
      {label}:{" "}
      <strong className={accent ? "text-tertiary-light" : "text-on-surface"}>
        {value}
      </strong>
    </span>
  );
}

function RejectPaymentModal({
  payment,
  reason,
  processing,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  payment: ClientPayment;
  reason: string;
  processing: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[560px] rounded-[var(--radius-xl)] border border-white/8 bg-surface-container p-5 shadow-ambient">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label text-primary-light">Odrzucenie wpłaty</p>
            <h2 className="mt-2 text-2xl font-semibold text-on-surface">
              {payment.clientName || `Klient #${payment.clientId}`}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              {formatMoney(payment.amount, payment.currency)} ·{" "}
              {payment.packageName || "Bez przypisanego pakietu"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-muted transition hover:text-on-surface"
          >
            <XCircle size={18} />
          </button>
        </div>

        <OwnerTextArea
          label="Powód odrzucenia"
          value={reason}
          onChange={onReasonChange}
          rows={4}
          className="mt-5"
          placeholder="Np. nie znaleziono przelewu na koncie."
        />

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={processing}>
            Anuluj
          </Button>
          <Button
            variant="danger"
            icon={<XCircle size={16} />}
            onClick={onConfirm}
            disabled={processing}
          >
            Odrzuć wpłatę
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReversePaymentModal({
  payment,
  reason,
  processing,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  payment: ClientPayment;
  reason: string;
  processing: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[560px] rounded-[var(--radius-xl)] border border-white/8 bg-surface-container p-5 shadow-ambient">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label text-primary-light">Cofnięcie wpłaty</p>
            <h2 className="mt-2 text-2xl font-semibold text-on-surface">
              {formatMoney(payment.amount, payment.currency)}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              {payment.clientName || `Klient #${payment.clientId}`} ·{" "}
              {payment.packageName || "Bez przypisanego pakietu"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-muted transition hover:text-on-surface"
          >
            <XCircle size={18} />
          </button>
        </div>

        <p className="mt-4 rounded-[var(--radius-md)] bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
          Cofnięcie zrobi korektę: zmniejszy rozliczenie pakietu i cofnie
          ewentualną nadpłatę z salda klienta.
        </p>

        <OwnerTextArea
          label="Powód cofnięcia"
          value={reason}
          onChange={onReasonChange}
          rows={4}
          className="mt-5"
          placeholder="Np. błędnie zaksięgowana wpłata."
        />

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={processing}>
            Anuluj
          </Button>
          <Button
            variant="danger"
            icon={<RotateCcw size={16} />}
            onClick={onConfirm}
            disabled={processing}
          >
            Cofnij wpłatę
          </Button>
        </div>
      </div>
    </div>
  );
}

function ButtonLinkLike({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-secondary px-4 text-xs font-semibold text-primary-light transition hover:border-primary-light hover:bg-surface-container-high"
    >
      <ExternalLink size={15} />
      Szczegóły
    </Link>
  );
}

function StatusPill({
  label,
  muted,
  tone = "neutral",
}: {
  label: string;
  muted?: boolean;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "bg-surface-container text-on-surface-muted",
    success: "bg-tertiary-light/15 text-tertiary-light",
    warning: "bg-warning-container/30 text-warning-light",
    danger: "bg-error-container/40 text-error-light",
  }[muted ? "neutral" : tone];

  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        toneClass,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function sortPayments(payments: ClientPayment[], sortBy: string) {
  return [...payments].sort((first, second) => {
    switch (sortBy) {
      case "oldest":
        return (
          new Date(first.paymentDate).getTime() -
          new Date(second.paymentDate).getTime()
        );
      case "amountDesc":
        return second.amount - first.amount;
      case "amountAsc":
        return first.amount - second.amount;
      case "clientAsc":
        return (first.clientName || "").localeCompare(
          second.clientName || "",
          "pl",
        );
      case "overpaymentDesc":
        return second.balanceCreditAmount - first.balanceCreditAmount;
      case "newest":
      default:
        return (
          new Date(second.paymentDate).getTime() -
          new Date(first.paymentDate).getTime()
        );
    }
  });
}

function filterPaymentsByClientText(
  payments: ClientPayment[],
  clientFilter: string,
) {
  const clientQuery = clientFilter.trim().toLowerCase();

  if (!clientQuery || parseClientIdFilter(clientQuery)) {
    return payments;
  }

  return payments.filter((payment) =>
    `${payment.clientId} ${payment.clientName || ""}`
      .toLowerCase()
      .includes(clientQuery),
  );
}

function parseClientIdFilter(value: string) {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseMoneyFilter(value: string) {
  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatMoney(amount: number, currency?: string | null) {
  return `${amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || "PLN"}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Brak daty";

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
