"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { PaymentActionConfirmModal } from "@/app/components/payments/PaymentActionConfirmModal";
import { PaymentOperationRow } from "@/app/components/payments/PaymentDisplay";
import { PaymentReasonModal } from "@/app/components/payments/PaymentReasonModal";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { DateRangeFilter } from "@/app/components/ui/date-range-filter";
import {
  getPaymentBreakdown,
} from "@/app/lib/payments/display";
import {
  cancelPaymentReceipt,
  confirmClientPayment,
  getOwnerPayments,
  issuePaymentReceipt,
  isPendingPayment,
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
import { isForbiddenError } from "@/app/lib/backend";
import {
  confirmTrainerPortalPayment,
  getTrainerPortalPendingPayments,
  rejectTrainerPortalPayment,
} from "@/app/lib/trainer/portal";

type PaymentAction =
  | "confirm"
  | "issueReceipt"
  | "cancelReceipt";

export default function OwnerPaymentsPage() {
  const pathname = usePathname();
  const basePath = pathname.startsWith("/trainer") ? "/trainer" : "/owner";
  const eyebrow = basePath === "/trainer" ? "Panel trenera" : "Panel ownera";
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [paymentToReject, setPaymentToReject] =
    useState<ClientPayment | null>(null);
  const [paymentToReverse, setPaymentToReverse] =
    useState<ClientPayment | null>(null);
  const [paymentAction, setPaymentAction] = useState<{
    type: PaymentAction;
    payment: ClientPayment;
  } | null>(null);
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
      try {
        const data = await getOwnerPayments(buildBackendPaymentQuery());
        setPayments(data.items || []);
      } catch (err) {
        if (basePath !== "/trainer" || !isForbiddenError(err)) throw err;

        const pendingPayments = await getTrainerPortalPendingPayments();
        setPayments(pendingPayments);
      }
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
      try {
        await confirmClientPayment(payment.id);
      } catch (err) {
        if (basePath !== "/trainer" || !isForbiddenError(err)) throw err;
        await confirmTrainerPortalPayment(payment.id);
      }
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
      try {
        await rejectClientPayment(paymentToReject.id, reason);
      } catch (err) {
        if (basePath !== "/trainer" || !isForbiddenError(err)) throw err;
        await rejectTrainerPortalPayment(paymentToReject.id, reason);
      }
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
          <p className="text-label text-primary-light">{eyebrow}</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Płatności
          </h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
            Historia operacji płatniczych klientów ze szczegółami rozliczeń.
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)]">
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
              <MoneyFilterField
                label="Kwota od"
                value={amountMin}
                onChange={setAmountMin}
              />
              <MoneyFilterField
                label="Kwota do"
                value={amountMax}
                onChange={setAmountMax}
              />
            </div>
          </div>
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
              <PaymentOperationRow
                key={payment.id}
                payment={payment}
                processing={processingId === payment.id}
                showActions
                detailsHref={`${basePath}/clients/${payment.clientId}/payments`}
                onConfirm={() => setPaymentAction({ type: "confirm", payment })}
                onReject={() => {
                  setPaymentToReject(payment);
                  setRejectReason("");
                }}
                onIssueReceipt={() =>
                  setPaymentAction({ type: "issueReceipt", payment })
                }
                onCancelReceipt={() =>
                  setPaymentAction({ type: "cancelReceipt", payment })
                }
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
        <PaymentReasonModal
          payment={paymentToReject}
          title="Odrzucić wpłatę?"
          description="Podaj powód, żeby było jasne, dlaczego zgłoszenie płatności nie zostało przyjęte."
          reasonLabel="Powód odrzucenia"
          reason={rejectReason}
          placeholder="Np. nie znaleziono przelewu na koncie."
          confirmLabel="Odrzuć wpłatę"
          processing={processingId === paymentToReject.id}
          action="reject"
          onReasonChange={setRejectReason}
          onClose={() => {
            setPaymentToReject(null);
            setRejectReason("");
          }}
          onConfirm={handleRejectPayment}
        />
      ) : null}

      {paymentToReverse ? (
        <PaymentReasonModal
          payment={paymentToReverse}
          title="Cofnąć wpłatę?"
          description="Podaj powód cofnięcia. System zapisze korektę zamiast usuwać historię płatności."
          reasonLabel="Powód cofnięcia"
          reason={reversalReason}
          placeholder="Np. błędnie zaksięgowana wpłata."
          confirmLabel="Cofnij wpłatę"
          processing={processingId === paymentToReverse.id}
          action="reverse"
          onReasonChange={setReversalReason}
          onClose={() => {
            setPaymentToReverse(null);
            setReversalReason("");
          }}
          onConfirm={handleReversePayment}
        />
      ) : null}

      {paymentAction ? (
        <PaymentActionConfirmModal
          payment={paymentAction.payment}
          processing={processingId === paymentAction.payment.id}
          {...getPaymentActionModalCopy(paymentAction.type)}
          onClose={() => setPaymentAction(null)}
          onConfirm={async () => {
            if (paymentAction.type === "confirm") {
              await handleConfirm(paymentAction.payment);
            }
            if (paymentAction.type === "issueReceipt") {
              await handleIssueReceipt(paymentAction.payment);
            }
            if (paymentAction.type === "cancelReceipt") {
              await handleCancelReceipt(paymentAction.payment);
            }
            setPaymentAction(null);
          }}
        />
      ) : null}
    </div>
  );
}

function getPaymentActionModalCopy(type: PaymentAction) {
  if (type === "issueReceipt") {
    return {
      title: "Wystawić paragon?",
      description:
        "Po potwierdzeniu płatność będzie oznaczona jako rozliczona fiskalnie.",
      confirmLabel: "Wystaw paragon",
      icon: "receipt" as const,
    };
  }

  if (type === "cancelReceipt") {
    return {
      title: "Cofnąć paragon?",
      description:
        "Status paragonu zostanie cofnięty, a przy płatności ponownie pojawi się możliwość wystawienia paragonu.",
      confirmLabel: "Cofnij paragon",
      tone: "danger" as const,
      icon: "receipt" as const,
    };
  }

  return {
    title: "Potwierdzić wpłatę?",
    description:
      "Wpłata zostanie zaksięgowana na wybranym pakiecie, a ewentualna nadpłata trafi na saldo klienta.",
    confirmLabel: "Potwierdź wpłatę",
    icon: "confirm" as const,
  };
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
    <label className="flex h-12 w-full flex-col justify-center rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest px-3 transition focus-within:border-primary-light/40 hover:border-white/10 hover:bg-surface-container-low">
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
        return (
          getPaymentBreakdown(second).balanceCreditAmount -
          getPaymentBreakdown(first).balanceCreditAmount
        );
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
