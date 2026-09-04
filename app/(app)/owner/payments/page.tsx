"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PaymentActionConfirmModal } from "@/app/components/payments/PaymentActionConfirmModal";
import { PaymentReasonModal } from "@/app/components/payments/PaymentReasonModal";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { PaymentsList } from "@/app/components/payments/PaymentsList";
import { Button } from "@/app/components/ui/button";
import { getPaymentBreakdown } from "@/app/lib/payments/display";
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
import {
  defaultPaymentFilters,
  PaymentFilters,
  type PaymentFiltersValue,
} from "./components/PaymentFilters";

type PaymentAction =
  | "confirm"
  | "issueReceipt"
  | "cancelReceipt";

const PAYMENTS_PER_PAGE = 8;

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
  const [filters, setFilters] = useState<PaymentFiltersValue>(
    defaultPaymentFilters,
  );
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const clientId = params.get("clientId");

      if (clientId) {
        setFilters((current) => ({ ...current, client: clientId }));
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
    filters.amountMax,
    filters.amountMin,
    filters.client,
    filters.dateFrom,
    filters.dateTo,
    filters.overpayment,
    filters.source,
    filters.status,
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
        filterPaymentsByClientText(payments, filters.client),
        filters.sortBy,
      ),
    [filters.client, filters.sortBy, payments],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / PAYMENTS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const visiblePayments = filteredPayments.slice(
    (currentPage - 1) * PAYMENTS_PER_PAGE,
    currentPage * PAYMENTS_PER_PAGE,
  );

  function clearFilters() {
    setFilters(defaultPaymentFilters);
    setPage(1);
  }

  function handleFiltersChange(nextFilters: PaymentFiltersValue) {
    setFilters(nextFilters);
    setPage(1);
  }

  function buildBackendPaymentQuery() {
    const clientId = parseClientIdFilter(filters.client);

    return {
      clientId,
      status:
        filters.status === "all"
          ? null
          : (Number(filters.status) as ClientPaymentStatus),
      source:
        filters.source === "all"
          ? null
          : (Number(filters.source) as ClientPaymentSource),
      hasOverpayment:
        filters.overpayment === "all" ? null : filters.overpayment === "yes",
      from: filters.dateFrom
        ? new Date(`${filters.dateFrom}T00:00:00`).toISOString()
        : null,
      to: filters.dateTo
        ? new Date(`${filters.dateTo}T23:59:59`).toISOString()
        : null,
      amountMin: parseMoneyFilter(filters.amountMin),
      amountMax: parseMoneyFilter(filters.amountMax),
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

      <PaymentFilters
        value={filters}
        advancedOpen={advancedFiltersOpen}
        onAdvancedOpenChange={setAdvancedFiltersOpen}
        onChange={handleFiltersChange}
        onClear={clearFilters}
      />

      <section className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-low shadow-soft">
        <div className="flex flex-col gap-2 px-4 py-5 md:flex-row md:items-end md:justify-between md:px-5">
          <div>
            <p className="text-section-title">Operacje płatnicze</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Kwota, sposób rozliczenia i najważniejsze akcje w jednym wierszu.
            </p>
          </div>
          {!isLoading ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
              {filteredPayments.length} {pluralizePayments(filteredPayments.length)}
            </p>
          ) : null}
        </div>

        <PaymentsList
          payments={visiblePayments}
          isLoading={isLoading}
          processingId={processingId}
          getDetailsHref={(payment) =>
            `${basePath}/clients/${payment.clientId}/payments`
          }
          onConfirm={(payment) =>
            setPaymentAction({ type: "confirm", payment })
          }
          onReject={(payment) => {
            setPaymentToReject(payment);
            setRejectReason("");
          }}
          onIssueReceipt={(payment) =>
            setPaymentAction({ type: "issueReceipt", payment })
          }
          onCancelReceipt={(payment) =>
            setPaymentAction({ type: "cancelReceipt", payment })
          }
          onReverse={(payment) => {
            setPaymentToReverse(payment);
            setReversalReason("");
          }}
        />

        {!isLoading && filteredPayments.length > 0 ? (
          <PaymentPagination
            page={currentPage}
            pageSize={PAYMENTS_PER_PAGE}
            totalItems={filteredPayments.length}
            onPageChange={setPage}
          />
        ) : null}
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

function pluralizePayments(count: number) {
  if (count === 1) return "płatność";

  const lastTwo = count % 100;
  const last = count % 10;

  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
    return "płatności";
  }

  return "płatności";
}
