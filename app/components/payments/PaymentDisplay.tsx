"use client";

import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  ExternalLink,
  ReceiptText,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { formatDateTime } from "@/app/lib/formatters/date";
import {
  getPaymentBreakdown,
  getPaymentMethodLabel,
  getPaymentSourceLabel,
  getPaymentStatusLabel,
  getPaymentStatusTone,
  hasPaymentOverpayment,
  isPaymentConfirmed,
  isPaymentPending,
  isPaymentReceiptIssued,
  isPaymentRejected,
  isPaymentReversed,
  type PaymentBreakdownSource,
} from "@/app/lib/payments/display";

export type PaymentDisplaySource = PaymentBreakdownSource & {
  id: number;
  clientId: number;
  clientName?: string | null;
  paymentDate?: string | null;
  note?: string | null;
  rejectionReason?: string | null;
  reversalReason?: string | null;
};

type Tone = "neutral" | "success" | "warning" | "danger";

export function PaymentStatusBadge({
  payment,
  label,
  tone,
  muted,
  icon,
}: {
  payment?: PaymentBreakdownSource;
  label?: string;
  tone?: Tone;
  muted?: boolean;
  icon?: React.ReactNode;
}) {
  const resolvedTone = muted
    ? "neutral"
    : tone || getPaymentStatusTone(payment || {});
  const toneClass = {
    neutral: "bg-surface-container text-on-surface-muted",
    success: "bg-tertiary-light/15 text-tertiary-light",
    warning: "bg-warning-container/35 text-warning-light",
    danger: "bg-error-container/45 text-error-light",
  }[resolvedTone];

  return (
    <span
      className={[
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-wider",
        toneClass,
      ].join(" ")}
    >
      {icon ? <span className="flex items-center">{icon}</span> : null}
      {label || getPaymentStatusLabel(payment?.status)}
    </span>
  );
}

export function PaymentSplitSummary({
  payment,
  compact = false,
}: {
  payment: PaymentBreakdownSource;
  compact?: boolean;
}) {
  const breakdown = getPaymentBreakdown(payment);
  const currency = payment.currency;
  const balanceMovement = breakdown.balanceCreditAmount;

  return (
    <div
      className={[
        "min-w-0 rounded-[var(--radius-md)] bg-surface-container-lowest",
        compact ? "px-3 py-2" : "px-4 py-3",
      ].join(" ")}
    >
      <p className="text-label text-on-surface-muted">Rozliczenie</p>
      <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm text-on-surface-variant">Wpłata</span>
        <strong className="truncate text-sm font-semibold text-on-surface">
          {formatPaymentMoney(breakdown.amount, currency)}
        </strong>
        {balanceMovement !== 0 ? (
          <span
            className={[
              "shrink-0 text-sm font-semibold",
              balanceMovement > 0 ? "text-tertiary-light" : "text-error-light",
            ].join(" ")}
          >
            ({formatSignedMoneyCompact(balanceMovement, currency)})
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function PaymentOperationRow({
  payment,
  processing = false,
  detailsHref,
  showClient = true,
  showActions = false,
  onConfirm,
  onReject,
  onIssueReceipt,
  onCancelReceipt,
  onReverse,
}: {
  payment: PaymentDisplaySource;
  processing?: boolean;
  detailsHref?: string;
  showClient?: boolean;
  showActions?: boolean;
  onConfirm?: () => void;
  onReject?: () => void;
  onIssueReceipt?: () => void;
  onCancelReceipt?: () => void;
  onReverse?: () => void;
}) {
  const pending = isPaymentPending(payment);
  const confirmed = isPaymentConfirmed(payment);
  const rejected = isPaymentRejected(payment);
  const reversed = isPaymentReversed(payment);
  const receiptIssued = isPaymentReceiptIssued(payment);
  const tone = getPaymentStatusTone(payment);
  const rowToneClass = {
    neutral: "border-white/5",
    success: "border-tertiary-light/20",
    warning: "border-warning-light/30",
    danger: "border-error-light/30",
  }[tone];

  return (
    <article
      className={[
        "overflow-x-auto rounded-[var(--radius-lg)] border bg-surface-container-low p-4",
        rowToneClass,
      ].join(" ")}
    >
      <div className="grid min-w-[1250px] grid-cols-[150px_280px_260px_240px_256px] items-center gap-4">
        <div className="min-w-0">
          <p className="text-label text-on-surface-muted">Data</p>
          <p className="mt-1 text-sm font-semibold text-on-surface">
            {formatPaymentDate(payment.paymentDate)}
          </p>
          {"source" in payment ? (
            <p className="mt-1 text-xs text-on-surface-muted">
              {getPaymentSourceLabel(payment.source)}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          {showClient ? (
            <p className="truncate text-base font-semibold text-on-surface">
              {payment.clientName || `Klient #${payment.clientId}`}
            </p>
          ) : null}
          <p
            className={[
              "truncate text-sm text-on-surface-variant",
              showClient ? "mt-1" : "",
            ].join(" ")}
          >
            {payment.packageName || "Bez przypisanego pakietu"}
          </p>
          {payment.note ? (
            <p className="mt-2 line-clamp-2 text-xs text-on-surface-muted">
              {payment.note}
            </p>
          ) : null}
        </div>

        <PaymentSplitSummary payment={payment} />

        <div className="min-w-0">
          <p className="text-label text-on-surface-muted">Status i metoda</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <PaymentStatusBadge payment={payment} />
            <PaymentStatusBadge
              label={getPaymentMethodLabel(payment.method)}
              muted
            />
            {hasPaymentOverpayment(payment) ? (
              <PaymentStatusBadge label="Nadpłata" tone="success" />
            ) : null}
            {receiptIssued ? (
              <PaymentStatusBadge
                label="Paragon wystawiony"
                tone="success"
                icon={<CheckCircle2 size={12} />}
              />
            ) : null}
          </div>
          {rejected && payment.rejectionReason ? (
            <p className="mt-2 line-clamp-2 text-xs text-error-light">
              {payment.rejectionReason}
            </p>
          ) : null}
          {reversed && payment.reversalReason ? (
            <p className="mt-2 line-clamp-2 text-xs text-error-light">
              {payment.reversalReason}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {showActions && pending ? (
            <>
              {onConfirm ? (
                <Button
                  size="sm"
                  icon={<CheckCircle2 size={15} />}
                  onClick={onConfirm}
                  disabled={processing}
                >
                  Potwierdź
                </Button>
              ) : null}
              {onReject ? (
                <Button
                  size="sm"
                  variant="danger"
                  icon={<XCircle size={15} />}
                  onClick={onReject}
                  disabled={processing}
                >
                  Odrzuć
                </Button>
              ) : null}
            </>
          ) : null}
          {showActions && confirmed && !reversed ? (
            <>
              {onIssueReceipt && onCancelReceipt ? (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<ReceiptText size={15} />}
                  onClick={receiptIssued ? onCancelReceipt : onIssueReceipt}
                  disabled={processing}
                >
                  {receiptIssued ? "Cofnij paragon" : "Wystaw paragon"}
                </Button>
              ) : null}
              {onReverse ? (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<RotateCcw size={15} />}
                  onClick={onReverse}
                  disabled={processing}
                >
                  Cofnij wpłatę
                </Button>
              ) : null}
            </>
          ) : null}
          {detailsHref ? <PaymentDetailsLink href={detailsHref} /> : null}
        </div>
      </div>
    </article>
  );
}

export function PaymentCompactRow({
  payment,
  showStatus = true,
}: {
  payment: PaymentDisplaySource;
  showStatus?: boolean;
}) {
  const breakdown = getPaymentBreakdown(payment);
  const tone = getPaymentStatusTone(payment);
  const accentClass = {
    neutral: "before:bg-on-surface-muted",
    success: "before:bg-tertiary-light",
    warning: "before:bg-warning-light",
    danger: "before:bg-error-light",
  }[tone];

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[var(--radius-md)] bg-surface-container-lowest px-3 py-3 before:absolute before:inset-y-0 before:left-0 before:w-0.5",
        accentClass,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-light">
            {formatPaymentDate(payment.paymentDate)}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-on-surface">
            {payment.packageName || "Wpłata klienta"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-on-surface">
            {formatPaymentMoney(breakdown.amount, payment.currency)}
          </p>
          {showStatus ? (
            <div className="mt-1 flex justify-end">
              <PaymentStatusBadge payment={payment} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-muted">
        <span className="inline-flex items-center gap-1.5">
          <Banknote size={13} className="text-primary-light" />
          {getPaymentMethodLabel(payment.method)}
        </span>
        {breakdown.balanceCreditAmount > 0 ? (
          <span className="font-semibold text-tertiary-light">
            +{formatPaymentMoney(breakdown.balanceCreditAmount, payment.currency)} na saldo
          </span>
        ) : null}
      </div>
    </article>
  );
}

function PaymentDetailsLink({ href }: { href: string }) {
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

function formatSignedMoneyCompact(value: number, currency?: string | null) {
  const absoluteValue = Math.abs(value);
  const formatted = `${absoluteValue.toLocaleString("pl-PL", {
    minimumFractionDigits: Number.isInteger(absoluteValue) ? 0 : 2,
    maximumFractionDigits: 2,
  })} ${currency || "PLN"}`;

  return `${value > 0 ? "+" : "-"}${formatted}`;
}

function formatPaymentMoney(amount: number, currency?: string | null) {
  return `${amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || "PLN"}`;
}

function formatPaymentDate(value?: string | null) {
  if (!value) return "Brak daty";

  const dateTime = formatDateTime(value);

  return dateTime.replace(", 00:00", "");
}
