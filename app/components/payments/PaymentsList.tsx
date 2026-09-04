"use client";

import Link from "next/link";
import {
  Banknote,
  Check,
  ChevronRight,
  CircleX,
  CreditCard,
  LoaderCircle,
  ReceiptText,
  RotateCcw,
} from "lucide-react";
import { PaymentStatusBadge } from "@/app/components/payments/PaymentDisplay";
import { Button } from "@/app/components/ui/button";
import { formatDateTime } from "@/app/lib/formatters/date";
import {
  getPaymentBreakdown,
  getPaymentMethodLabel,
  hasPaymentOverpayment,
  isPaymentConfirmed,
  isPaymentPending,
  isPaymentReceiptIssued,
  isPaymentRejected,
  isPaymentReversed,
} from "@/app/lib/payments/display";
import type { PaymentDisplaySource } from "@/app/components/payments/PaymentDisplay";

type PaymentsListProps<TPayment extends PaymentDisplaySource> = {
  payments: TPayment[];
  isLoading: boolean;
  processingId: number | null;
  showClient?: boolean;
  getDetailsHref?: (payment: TPayment) => string | undefined;
  emptyTitle?: string;
  emptyMessage?: string;
  onConfirm?: (payment: TPayment) => void;
  onReject?: (payment: TPayment) => void;
  onIssueReceipt?: (payment: TPayment) => void;
  onCancelReceipt?: (payment: TPayment) => void;
  onReverse?: (payment: TPayment) => void;
};

export function PaymentsList<TPayment extends PaymentDisplaySource>({
  payments,
  isLoading,
  processingId,
  showClient = true,
  getDetailsHref,
  emptyTitle = "Brak płatności",
  emptyMessage = "Zmień filtry, aby zobaczyć więcej wyników.",
  onConfirm,
  onReject,
  onIssueReceipt,
  onCancelReceipt,
  onReverse,
}: PaymentsListProps<TPayment>) {
  if (isLoading) {
    return (
      <div className="flex min-h-56 items-center justify-center gap-2 bg-surface-container-lowest px-5 text-sm text-on-surface-muted">
        <LoaderCircle size={18} className="animate-spin" />
        Ładowanie płatności...
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center bg-surface-container-lowest px-5 text-center">
        <CreditCard size={28} className="text-on-surface-muted" />
        <p className="mt-4 text-sm font-semibold text-on-surface">{emptyTitle}</p>
        <p className="mt-1 text-sm text-on-surface-muted">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const hasActions = Boolean(
    getDetailsHref ||
      onConfirm ||
      onReject ||
      onIssueReceipt ||
      onCancelReceipt ||
      onReverse,
  );
  const gridClass = getGridClass(showClient, hasActions);

  return (
    <div className="bg-surface-container-lowest">
      <div className={`hidden gap-3 bg-surface-container-low px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted xl:grid ${gridClass}`}>
        <span>Data</span>
        {showClient ? <span>Klient</span> : null}
        <span>Pakiet</span>
        <span>Rozliczenie</span>
        <span>Status</span>
        <span>Metoda</span>
        {hasActions ? <span className="text-right">Akcje</span> : null}
      </div>

      <div className="flex flex-col gap-3 p-3 xl:block xl:p-0">
        {payments.map((payment) => (
          <PaymentListRow
            key={payment.id}
            payment={payment}
            processing={processingId === payment.id}
            showClient={showClient}
            showActions={hasActions}
            gridClass={gridClass}
            detailsHref={getDetailsHref?.(payment)}
            onConfirm={onConfirm ? () => onConfirm(payment) : undefined}
            onReject={onReject ? () => onReject(payment) : undefined}
            onIssueReceipt={onIssueReceipt ? () => onIssueReceipt(payment) : undefined}
            onCancelReceipt={onCancelReceipt ? () => onCancelReceipt(payment) : undefined}
            onReverse={onReverse ? () => onReverse(payment) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

type PaymentListRowProps = {
  payment: PaymentDisplaySource;
  processing: boolean;
  showClient: boolean;
  showActions: boolean;
  gridClass: string;
  detailsHref?: string;
  onConfirm?: () => void;
  onReject?: () => void;
  onIssueReceipt?: () => void;
  onCancelReceipt?: () => void;
  onReverse?: () => void;
};

function PaymentListRow(props: PaymentListRowProps) {
  const { payment } = props;
  const pending = isPaymentPending(payment);
  const confirmed = isPaymentConfirmed(payment);
  const rejected = isPaymentRejected(payment);
  const reversed = isPaymentReversed(payment);
  const receiptIssued = isPaymentReceiptIssued(payment);
  const breakdown = getPaymentBreakdown(payment);
  const accentClass = pending
    ? "before:bg-warning-light"
    : rejected || reversed
      ? "before:bg-error-light"
      : "before:bg-tertiary-light";

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[var(--radius-lg)] bg-surface-container-low p-4 before:absolute before:inset-y-0 before:left-0 before:w-0.5 xl:rounded-none xl:bg-surface-container-lowest xl:px-5 xl:py-4 xl:before:hidden xl:odd:bg-surface-container-low/55",
        accentClass,
      ].join(" ")}
    >
      <div className={`hidden items-center gap-3 xl:grid ${props.gridClass}`}>
        <p className="text-xs leading-5 text-on-surface-variant">
          {formatPaymentDate(payment.paymentDate)}
        </p>
        {props.showClient ? (
          <p className="truncate text-sm font-semibold text-on-surface">
            {payment.clientName || `Klient #${payment.clientId}`}
          </p>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-on-surface-variant">
            {payment.packageName || "Bez przypisanego pakietu"}
          </p>
          {payment.note ? (
            <p className="mt-1 truncate text-xs text-on-surface-muted">{payment.note}</p>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-semibold text-on-surface">
            {formatMoney(breakdown.amount, payment.currency)}
          </p>
          {hasPaymentOverpayment(payment) ? (
            <p className="mt-1 text-xs text-tertiary-light">
              +{formatMoney(breakdown.balanceCreditAmount, payment.currency)} na saldo
            </p>
          ) : (
            <p className="mt-1 text-xs text-on-surface-muted">Rozliczono z pakietem</p>
          )}
        </div>
        <div className="min-w-0">
          <PaymentStatusBadge payment={payment} />
          {receiptIssued ? (
            <p className="mt-1.5 truncate text-[10px] text-tertiary-light">Paragon wystawiony</p>
          ) : null}
        </div>
        <PaymentMethod method={payment.method} />
        {props.showActions ? <RowActions {...props} /> : null}
      </div>

      <div className="xl:hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-light">
              {formatPaymentDate(payment.paymentDate)}
            </p>
            {props.showClient ? (
              <p className="mt-2 truncate text-base font-semibold text-on-surface">
                {payment.clientName || `Klient #${payment.clientId}`}
              </p>
            ) : null}
            <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
              {payment.packageName || "Bez przypisanego pakietu"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold text-on-surface">
              {formatMoney(breakdown.amount, payment.currency)}
            </p>
            <div className="mt-2 flex justify-end">
              <PaymentStatusBadge payment={payment} />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-on-surface-muted">
          <PaymentMethod method={payment.method} />
          {hasPaymentOverpayment(payment) ? (
            <span className="text-tertiary-light">
              +{formatMoney(breakdown.balanceCreditAmount, payment.currency)} na saldo
            </span>
          ) : null}
        </div>

        {(payment.rejectionReason || payment.reversalReason) ? (
          <p className="mt-3 rounded-[var(--radius-md)] bg-error-container/25 px-3 py-2 text-xs text-error-light">
            {payment.rejectionReason || payment.reversalReason}
          </p>
        ) : null}

        {props.showActions ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {pending && (props.onConfirm || props.onReject) ? (
            <>
              {props.onConfirm ? (
                <Button size="sm" icon={<Check size={15} />} onClick={props.onConfirm} disabled={props.processing} className="flex-1">Potwierdź</Button>
              ) : null}
              {props.onReject ? (
                <Button size="sm" variant="danger" icon={<CircleX size={15} />} onClick={props.onReject} disabled={props.processing} className="flex-1">Odrzuć</Button>
              ) : null}
            </>
          ) : null}
          {confirmed && !reversed && (props.onIssueReceipt || props.onCancelReceipt || props.onReverse) ? (
            <>
              {(receiptIssued ? props.onCancelReceipt : props.onIssueReceipt) ? (
                <Button size="sm" variant="secondary" icon={<ReceiptText size={15} />} onClick={receiptIssued ? props.onCancelReceipt : props.onIssueReceipt} disabled={props.processing} className="flex-1">
                  {receiptIssued ? "Cofnij paragon" : "Wystaw paragon"}
                </Button>
              ) : null}
              {props.onReverse ? (
                <Button size="sm" variant="outline" icon={<RotateCcw size={15} />} onClick={props.onReverse} disabled={props.processing} className="flex-1">Cofnij</Button>
              ) : null}
            </>
          ) : null}
          {props.detailsHref ? (
            <Link href={props.detailsHref} className="inline-flex h-10 min-w-10 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container px-3 text-xs font-semibold text-primary-light transition hover:bg-surface-container-high">
              Szczegóły <ChevronRight size={15} />
            </Link>
          ) : null}
        </div>
        ) : null}
      </div>
    </article>
  );
}

function RowActions(props: PaymentListRowProps) {
  const pending = isPaymentPending(props.payment);
  const confirmed = isPaymentConfirmed(props.payment);
  const reversed = isPaymentReversed(props.payment);
  const receiptIssued = isPaymentReceiptIssued(props.payment);

  return (
    <div className="flex justify-end gap-1.5">
      {pending && (props.onConfirm || props.onReject) ? (
        <>
          {props.onConfirm ? <IconAction label="Potwierdź wpłatę" onClick={props.onConfirm} disabled={props.processing} tone="success"><Check size={16} /></IconAction> : null}
          {props.onReject ? <IconAction label="Odrzuć wpłatę" onClick={props.onReject} disabled={props.processing} tone="danger"><CircleX size={16} /></IconAction> : null}
        </>
      ) : null}
      {confirmed && !reversed && (props.onIssueReceipt || props.onCancelReceipt || props.onReverse) ? (
        <>
          {(receiptIssued ? props.onCancelReceipt : props.onIssueReceipt) ? (
            <IconAction label={receiptIssued ? "Cofnij paragon" : "Wystaw paragon"} onClick={(receiptIssued ? props.onCancelReceipt : props.onIssueReceipt)!} disabled={props.processing}><ReceiptText size={16} /></IconAction>
          ) : null}
          {props.onReverse ? <IconAction label="Cofnij wpłatę" onClick={props.onReverse} disabled={props.processing}><RotateCcw size={16} /></IconAction> : null}
        </>
      ) : null}
      {props.detailsHref ? (
        <Link href={props.detailsHref} aria-label="Zobacz szczegóły płatności" title="Szczegóły" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-muted transition hover:bg-surface-container-high hover:text-primary-light">
          <ChevronRight size={17} />
        </Link>
      ) : null}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  tone = "neutral",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  tone?: "neutral" | "success" | "danger";
  children: React.ReactNode;
}) {
  const toneClass = {
    neutral: "bg-surface-container text-on-surface-muted hover:bg-surface-container-high hover:text-on-surface",
    success: "bg-tertiary-container/35 text-tertiary-light hover:bg-tertiary-container/60",
    danger: "bg-error-container/35 text-error-light hover:bg-error-container/60",
  }[tone];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
  );
}

function PaymentMethod({ method }: { method?: number | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant">
      <Banknote size={14} className="shrink-0 text-primary-light" />
      {getPaymentMethodLabel(method)}
    </span>
  );
}

function formatMoney(amount: number, currency?: string | null) {
  return `${amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || "PLN"}`;
}

function formatPaymentDate(value?: string | null) {
  if (!value) return "Brak daty";

  return formatDateTime(value).replace(", 00:00", "");
}

function getGridClass(showClient: boolean, showActions: boolean) {
  if (showClient && showActions) {
    return "grid-cols-[110px_minmax(110px,0.75fr)_minmax(150px,1.1fr)_minmax(130px,0.75fr)_120px_90px_110px]";
  }

  if (showClient) {
    return "grid-cols-[110px_minmax(120px,0.8fr)_minmax(180px,1.2fr)_minmax(140px,0.8fr)_120px_100px]";
  }

  if (showActions) {
    return "grid-cols-[120px_minmax(190px,1.2fr)_minmax(150px,0.8fr)_120px_100px_110px]";
  }

  return "grid-cols-[120px_minmax(220px,1.3fr)_minmax(160px,0.8fr)_120px_110px]";
}
