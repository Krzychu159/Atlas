"use client";

import { notifyClientPaymentChanged } from "@/app/lib/session-corrections";

import { useOwnerLocationFilter } from "@/app/lib/owner/location-filter";
import { usePaymentDateCorrectionRevision } from "@/app/lib/session-corrections";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PaymentActionConfirmModal } from "@/app/components/payments/PaymentActionConfirmModal";
import { PaymentReasonModal } from "@/app/components/payments/PaymentReasonModal";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { PaymentsList } from "@/app/components/payments/PaymentsList";
import { Button } from "@/app/components/ui/button";
import { ListSection } from "@/app/components/ui/list/ListSection";
import { useOwnerRead } from "../components/use-owner-read";
import { OwnerReadState } from "../components/OwnerReadState";
import { paymentListQuery } from "@/app/lib/owner/payment-list-query";
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
import { showOwnerError, showOwnerSuccess } from "../components/owner-toast";
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
import { listUrlKey, readOption, readPositiveInt, useListScrollRestoration, useListUrlSync } from "../components/list-url-state";

type PaymentAction = "confirm" | "issueReceipt" | "cancelReceipt";

const PAYMENTS_PER_PAGE = 8;

export default function OwnerPaymentsPage() {
  const { selectedLocationId } = useOwnerLocationFilter();
  const pathname = usePathname();
  const locationId = pathname.startsWith("/trainer")
    ? null
    : selectedLocationId;
  return (
    <Suspense>
      <OwnerPaymentsPageContent
        locationId={locationId}
      />
    </Suspense>
  );
}

const PAYMENT_URL_KEYS = ["q", "clientId", "status", "source", "overpayment", "from", "to", "min", "max", "sort", "page"] as const;
const SERVER_PAYMENT_SORTS = ["newest", "oldest", "amountDesc", "amountAsc"] as const;
const DATE_PARAM = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const AMOUNT_PARAM = /^[0-9]{1,9}([.,][0-9]{1,2})?$/;

function paymentFiltersFromUrl(params: URLSearchParams): PaymentFiltersValue {
  const clientId = readPositiveInt(params.get("clientId"));
  const text = (name: string, pattern: RegExp) => {
    const value = params.get(name) ?? "";
    return pattern.test(value) ? value : "";
  };
  return {
    client: clientId ? String(clientId) : (params.get("q") ?? "").slice(0, 100),
    status: readOption(params.get("status"), ["all", "1", "2", "3", "4", "5"], defaultPaymentFilters.status),
    source: readOption(params.get("source"), ["all", "1", "2", "3"], defaultPaymentFilters.source),
    overpayment: readOption(params.get("overpayment"), ["all", "yes", "no"], defaultPaymentFilters.overpayment),
    dateFrom: text("from", DATE_PARAM),
    dateTo: text("to", DATE_PARAM),
    amountMin: text("min", AMOUNT_PARAM),
    amountMax: text("max", AMOUNT_PARAM),
    sortBy: readOption(params.get("sort"), SERVER_PAYMENT_SORTS, "newest"),
  };
}

function paymentFiltersToUrl(filters: PaymentFiltersValue, page: number) {
  const client = filters.client.trim();
  const clientId = parseClientIdFilter(client);
  const changed = (key: keyof PaymentFiltersValue) => filters[key] !== defaultPaymentFilters[key] ? filters[key].trim() || null : null;
  return {
    q: clientId ? null : client || null,
    clientId: clientId ? String(clientId) : null,
    status: changed("status"),
    source: changed("source"),
    overpayment: changed("overpayment"),
    from: changed("dateFrom"),
    to: changed("dateTo"),
    min: changed("amountMin"),
    max: changed("amountMax"),
    sort: changed("sortBy"),
    page: page > 1 ? String(page) : null,
  };
}

function OwnerPaymentsPageContent({
  locationId,
}: {
  locationId: number | null;
}) {
  const paymentDateRevision = usePaymentDateCorrectionRevision();
  const pathname = usePathname();
  const basePath = pathname.startsWith("/trainer") ? "/trainer" : "/owner";
  const eyebrow =
    basePath === "/trainer" ? "Panel trenera" : "Panel właściciela";
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [paymentToReject, setPaymentToReject] = useState<ClientPayment | null>(
    null,
  );
  const [paymentToReverse, setPaymentToReverse] =
    useState<ClientPayment | null>(null);
  const [paymentAction, setPaymentAction] = useState<{
    type: PaymentAction;
    payment: ClientPayment;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reversalReason, setReversalReason] = useState("");
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<PaymentFiltersValue>(
    () => paymentFiltersFromUrl(searchParams),
  );
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(
    () => ["status", "source", "overpayment", "min", "max"].some((key) => searchParams.has(key)),
  );
  const [pagination, setPagination] = useState(() => ({ page: readPositiveInt(searchParams.get("page")) ?? 1, locationId }));
  const page = pagination.locationId === locationId ? pagination.page : 1;
  const setPage = (next: number) => setPagination({ page: next, locationId });

  const owner = basePath === "/owner";
  const queryState = useMemo(() => {
    try { return { query: paymentListQuery(filters, page, PAYMENTS_PER_PAGE, locationId), error: undefined }; }
    catch (error) { return { query: undefined, error: error instanceof Error ? error.message : "Sprawdź wybrane filtry." }; }
  }, [filters, page, locationId]);
  const readPayments = useCallback((signal: AbortSignal) => getOwnerPayments(queryState.query, signal), [queryState.query]);
  const list = useOwnerRead(JSON.stringify(queryState.query), readPayments, "Nie udało się pobrać płatności.", paymentDateRevision, 250, owner && !queryState.error);
  const loading = owner ? list.loading : isLoading;
  const readError = owner ? queryState.error || list.error : undefined;
  const urlParams = paymentFiltersToUrl(filters, page);
  useListUrlSync(urlParams, PAYMENT_URL_KEYS, owner);
  useListScrollRestoration(listUrlKey("payments", urlParams), owner && Boolean(list.data) && !list.loading);

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

  async function loadPayments() {
    if (owner) { try { await list.reload(); } catch { /* The list displays its error. */ } return; }
    try {
      setIsLoading(true);
      try { const data = await getOwnerPayments(buildBackendPaymentQuery()); setPayments(data.items || []); }
      catch (err) { if (!isForbiddenError(err)) throw err; setPayments(await getTrainerPortalPendingPayments()); }
    } catch (err) { showOwnerError(err, "Nie udało się pobrać płatności.", { id: "owner-payments-load-error" }); }
    finally { setIsLoading(false); }
  }
  useEffect(() => {
    if (owner) return;
    const timer = window.setTimeout(() => { void loadPayments(); }, 250);
    return () => window.clearTimeout(timer);
    // Legacy trainer screen retains its existing contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, paymentDateRevision, filters.amountMax, filters.amountMin, filters.client, filters.dateFrom, filters.dateTo, filters.overpayment, filters.source, filters.status]);

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
      notifyClientPaymentChanged(payment.clientId);
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
  const currentPage = owner ? list.data?.page ?? page : Math.min(page, totalPages);
  const totalItems = owner ? list.data?.totalCount : filteredPayments.length;
  const visiblePayments = owner ? list.data?.items || [] : filteredPayments.slice(
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


  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">{eyebrow}</p>
          <h1 className="mt-2 font-display text-[1.75rem] md:text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Płatności
          </h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
            Historia operacji płatniczych klientów ze szczegółami rozliczeń.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          }
          onClick={loadPayments}
          disabled={loading}
        >
          Odśwież
        </Button>
      </div>

      <PaymentFilters
        serverPagination={owner}
        value={filters}
        advancedOpen={advancedFiltersOpen}
        onAdvancedOpenChange={setAdvancedFiltersOpen}
        onChange={handleFiltersChange}
        onClear={clearFilters}
      />

      <ListSection
        title="Operacje płatnicze"
        description="Kwota, sposób rozliczenia i najważniejsze akcje w jednym wierszu."
        meta={
          !loading && !readError && totalItems !== undefined
            ? `${totalItems} ${pluralizePayments(totalItems)}`
            : null
        }
      >
        <OwnerReadState loading={false} error={readError} retry={list.retry} label="Ładowanie płatności..." />
        {!readError || list.data ? <PaymentsList
          dateCorrectionPortal={basePath === "/trainer" ? "trainer" : "owner"}
          payments={visiblePayments}
          isLoading={loading}
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
        /> : null}

        {!loading && !readError && (totalItems ?? 0) > 0 ? (
          <PaymentPagination
            page={currentPage}
            pageSize={PAYMENTS_PER_PAGE}
            totalItems={totalItems ?? 0}
            totalPages={owner ? list.data?.totalPages : undefined}
            onPageChange={setPage}
          />
        ) : null}
      </ListSection>

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
