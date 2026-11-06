"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import PaymentDateCorrectionModal from "./PaymentDateCorrectionModal";
import { canCorrectPaymentDate } from "@/app/lib/payments/date-correction";
import {
  Banknote,
  CalendarClock,
  Check,
  ChevronRight,
  CircleX,
  CreditCard,
  LoaderCircle,
  MoreHorizontal,
  ReceiptText,
  RotateCcw,
} from "lucide-react";
import { PickerPanel, usePickerPopover } from "@/app/components/ui/picker-popover";
import { PaymentStatusBadge } from "@/app/components/payments/PaymentDisplay";
import { Button } from "@/app/components/ui/button";
import { formatDateTime } from "@/app/lib/formatters/date";
import {
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
  dateCorrectionPortal?: "owner" | "trainer";
  /** "compact": one line per payment on desktop, rarely used actions behind "⋯". */
  density?: "comfortable" | "compact";
  showClient?: boolean;
  getDetailsHref?: (payment: TPayment) => string | undefined;
  emptyTitle?: string;
  emptyMessage?: string;
  onConfirm?: (payment: TPayment) => void;
  canConfirm?: (payment: TPayment) => boolean;
  onReject?: (payment: TPayment) => void;
  onIssueReceipt?: (payment: TPayment) => void;
  canIssueReceipt?: (payment: TPayment) => boolean;
  onCancelReceipt?: (payment: TPayment) => void;
  onReverse?: (payment: TPayment) => void;
};

export function PaymentsList<TPayment extends PaymentDisplaySource>({
  payments,
  isLoading,
  processingId,
  dateCorrectionPortal,
  density = "comfortable",
  showClient = true,
  getDetailsHref,
  emptyTitle = "Brak płatności",
  emptyMessage = "Zmień filtry, aby zobaczyć więcej wyników.",
  onConfirm,
  canConfirm,
  onReject,
  onIssueReceipt,
  canIssueReceipt,
  onCancelReceipt,
  onReverse,
}: PaymentsListProps<TPayment>) {
  const [datePayment, setDatePayment] = useState<TPayment | null>(null);
  const correctionModal = datePayment && dateCorrectionPortal ? <PaymentDateCorrectionModal key={datePayment.id} payment={datePayment} portal={dateCorrectionPortal} onClose={() => setDatePayment(null)} /> : null;
  if (isLoading) {
    return (
      <><div className="flex min-h-56 items-center justify-center gap-2 bg-surface-container-lowest px-5 text-sm text-on-surface-muted">
        <LoaderCircle size={18} className="animate-spin" />
        Ładowanie płatności...
      </div>{correctionModal}</>
    );
  }

  if (payments.length === 0) {
    return (
      <><div className="flex min-h-56 flex-col items-center justify-center bg-surface-container-lowest px-5 text-center">
        <CreditCard size={28} className="text-on-surface-muted" />
        <p className="mt-4 text-sm font-semibold text-on-surface">
          {emptyTitle}
        </p>
        <p className="mt-1 text-sm text-on-surface-muted">{emptyMessage}</p>
      </div>{correctionModal}</>
    );
  }

  const hasActions = Boolean(
    dateCorrectionPortal ||
    getDetailsHref ||
    onConfirm ||
    onReject ||
    onIssueReceipt ||
    onCancelReceipt ||
    onReverse,
  );
  const compact = density === "compact";
  const gridClass = compact ? getCompactGridClass(showClient, hasActions) : getGridClass(showClient, hasActions);

  return (
    <><div className="bg-surface-container-lowest">
      <div
        className={`hidden gap-3 bg-surface-container-low text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted xl:grid ${compact ? "px-4 py-2.5" : "px-5 py-3"} ${gridClass}`}
      >
        <span>Data</span>
        {showClient ? <span>Klient</span> : null}
        <span>Pakiet</span>
        <span>Rozliczenie</span>
        <span>Status</span>
        <span>Metoda</span>
        {hasActions ? <span className="text-right">Akcje</span> : null}
      </div>

      <div className={`flex flex-col p-3 xl:block xl:p-0 ${compact ? "gap-2" : "gap-3"}`}>
        {payments.map((payment) => (
          <PaymentListRow
            key={payment.id}
            payment={payment}
            compact={compact}
            processing={processingId !== null || datePayment !== null}
            showClient={showClient}
            showActions={hasActions}
            gridClass={gridClass}
            detailsHref={getDetailsHref?.(payment)}
            onConfirm={onConfirm && (!canConfirm || canConfirm(payment)) ? () => onConfirm(payment) : undefined}
            onReject={onReject ? () => onReject(payment) : undefined}
            onIssueReceipt={
              onIssueReceipt && (!canIssueReceipt || canIssueReceipt(payment)) ? () => onIssueReceipt(payment) : undefined
            }
            onCancelReceipt={
              onCancelReceipt ? () => onCancelReceipt(payment) : undefined
            }
            onReverse={onReverse ? () => onReverse(payment) : undefined}
            onCorrectDate={dateCorrectionPortal && canCorrectPaymentDate(payment) ? () => setDatePayment(payment) : undefined}
          />
        ))}
      </div>
    </div>{correctionModal}</>
  );
}

// The current package state comes from the backend and is labelled separately from this payment's own status.
function paymentPackageContextText(payment: PaymentDisplaySource) {
  const due = payment.packageAmountDue;
  const packageNow = typeof due === "number" && Number.isFinite(due) && due > 0
    ? `Pakiet teraz: ${payment.packagePaymentStatus === "Overdue" ? "zaległość" : "do zapłaty"} ${formatMoney(due, payment.currency)}`
    : payment.packagePaymentStatus === "Paid" ? "Pakiet teraz: opłacony" : null;
  const location = payment.effectiveLocationName
    ? `${payment.effectiveLocationName}${payment.effectiveLocationSource === "ClientHome" ? " (lokalizacja klienta)" : ""}`
    : null;
  return [packageNow, location].filter(Boolean).join(" · ") || null;
}

function PaymentPackageContext({ payment }: { payment: PaymentDisplaySource }) {
  const text = paymentPackageContextText(payment);
  if (!text) return null;
  return (
    <p className="mt-1 text-xs text-on-surface-muted max-xl:line-clamp-2 xl:truncate" title={text}>
      {text}
    </p>
  );
}

function PaymentReceiptInfo({ payment }: { payment: PaymentDisplaySource }) {
  const label = payment.receiptNumber ? `Paragon nr ${payment.receiptNumber}` : "Paragon wystawiony";
  return (
    <div className="mt-1.5 min-w-0 text-[10px] text-tertiary-light">
      <p className="truncate" title={label}>{label}</p>
      {payment.receiptIssuedAt ? <p className="truncate">{formatDateTime(payment.receiptIssuedAt)}</p> : null}
    </div>
  );
}

type PaymentListRowProps = {
  payment: PaymentDisplaySource;
  compact?: boolean;
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
  onCorrectDate?: () => void;
};

function PaymentListRow(props: PaymentListRowProps) {
  const { payment } = props;
  const pending = isPaymentPending(payment);
  const confirmed = isPaymentConfirmed(payment);
  const rejected = isPaymentRejected(payment);
  const reversed = isPaymentReversed(payment);
  const receiptIssued = isPaymentReceiptIssued(payment);
  const accentClass = pending
    ? "before:bg-warning-light"
    : rejected || reversed
      ? "before:bg-error-light"
      : "before:bg-tertiary-light";

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[var(--radius-lg)] bg-surface-container-low before:absolute before:inset-y-0 before:left-0 before:w-0.5 xl:rounded-none xl:bg-surface-container-lowest xl:before:hidden xl:odd:bg-surface-container-low/55",
        props.compact ? "p-3 xl:px-4 xl:py-2 xl:hover:bg-surface-container-low" : "p-4 xl:px-5 xl:py-4",
        accentClass,
      ].join(" ")}
    >
      {props.compact ? <CompactDesktopRow {...props} /> : <div className={`hidden items-center gap-3 xl:grid ${props.gridClass}`}>
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
          <PaymentPackageContext payment={payment} />
          {payment.note ? (
            <p className="mt-1 truncate text-xs text-on-surface-muted">
              {payment.note}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-semibold text-on-surface">
            {formatMoney(payment.amount, payment.currency)}
          </p>
          {hasPaymentOverpayment(payment) ? (
            <p className="mt-1 text-xs text-tertiary-light">
              +{formatMoney(payment.balanceCreditAmount, payment.currency)} na
              saldo
            </p>
          ) : (
            <p className="mt-1 text-xs text-on-surface-muted">
              {pending ? "Oczekuje na potwierdzenie" : rejected || reversed ? "Wpłata nierozliczona" : confirmed && typeof payment.appliedToPackageAmount === "number" && payment.appliedToPackageAmount > 0 ? "Rozliczono z pakietem" : "Brak danych o rozliczeniu"}
            </p>
          )}
        </div>
        <div className="min-w-0">
          <PaymentStatusBadge payment={payment} />
          {receiptIssued ? <PaymentReceiptInfo payment={payment} /> : null}
        </div>
        <PaymentMethod method={payment.method} />
        {props.showActions ? <RowActions {...props} /> : null}
      </div>}

      <div className="xl:hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-light">
              {formatPaymentDate(payment.paymentDate)}
            </p>
            {props.showClient ? (
              <p className={`${props.compact ? "mt-1" : "mt-2"} truncate text-base font-semibold text-on-surface`}>
                {payment.clientName || `Klient #${payment.clientId}`}
              </p>
            ) : null}
            <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
              {payment.packageName || "Bez przypisanego pakietu"}
            </p>
            <PaymentPackageContext payment={payment} />
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold text-on-surface">
              {formatMoney(payment.amount, payment.currency)}
            </p>
            <div className="mt-2 flex justify-end">
              <PaymentStatusBadge payment={payment} />
            </div>
          </div>
        </div>

        <div className={`${props.compact ? "mt-2" : "mt-3"} flex items-center justify-between gap-3 text-xs text-on-surface-muted`}>
          <PaymentMethod method={payment.method} />
          {hasPaymentOverpayment(payment) ? (
            <span className="text-tertiary-light">
              +{formatMoney(payment.balanceCreditAmount, payment.currency)} na
              saldo
            </span>
          ) : null}
        </div>

        {receiptIssued ? <PaymentReceiptInfo payment={payment} /> : null}

        {payment.rejectionReason || payment.reversalReason ? (
          <p className="mt-3 rounded-[var(--radius-md)] bg-error-container/25 px-3 py-2 text-xs text-error-light">
            {payment.rejectionReason || payment.reversalReason}
          </p>
        ) : null}

        {props.showActions ? (
          <div className={`${props.compact ? "mt-3" : "mt-4"} flex flex-wrap gap-2`}>
            {props.onCorrectDate ? <Button type="button" size="sm" variant="secondary" icon={<CalendarClock size={15} />} disabled={props.processing} onClick={props.onCorrectDate}>Zmień datę wpłaty</Button> : null}
            {pending && (props.onConfirm || props.onReject) ? (
              <>
                {props.onConfirm ? (
                  <Button
                    size="sm"
                    icon={<Check size={15} />}
                    onClick={props.onConfirm}
                    disabled={props.processing}
                    className="flex-1"
                  >
                    Potwierdź
                  </Button>
                ) : null}
                {props.onReject ? (
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<CircleX size={15} />}
                    onClick={props.onReject}
                    disabled={props.processing}
                    className="flex-1"
                  >
                    Odrzuć
                  </Button>
                ) : null}
              </>
            ) : null}
            {confirmed &&
            !reversed &&
            (props.onIssueReceipt ||
              props.onCancelReceipt ||
              props.onReverse) ? (
              <>
                {(
                  receiptIssued ? props.onCancelReceipt : props.onIssueReceipt
                ) ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<ReceiptText size={15} />}
                    onClick={
                      receiptIssued
                        ? props.onCancelReceipt
                        : props.onIssueReceipt
                    }
                    disabled={props.processing}
                    className="flex-1"
                  >
                    {receiptIssued ? "Cofnij paragon" : "Wystaw paragon"}
                  </Button>
                ) : null}
                {props.onReverse ? (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<RotateCcw size={15} />}
                    onClick={props.onReverse}
                    disabled={props.processing}
                    className="flex-1"
                  >
                    Cofnij
                  </Button>
                ) : null}
              </>
            ) : null}
            {props.detailsHref ? (
              <Link
                href={props.detailsHref}
                className="inline-flex h-10 min-w-10 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container px-3 text-xs font-semibold text-primary-light transition hover:bg-surface-container-high"
              >
                Szczegóły <ChevronRight size={15} />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CompactDesktopRow(props: PaymentListRowProps) {
  const { payment } = props;
  const receiptIssued = isPaymentReceiptIssued(payment);
  const overpayment = hasPaymentOverpayment(payment);
  const packageDetails = [payment.packageName || "Bez przypisanego pakietu", paymentPackageContextText(payment), payment.note].filter(Boolean).join(" · ");
  const receiptLabel = receiptIssued
    ? [payment.receiptNumber ? `Paragon nr ${payment.receiptNumber}` : "Paragon wystawiony", payment.receiptIssuedAt ? formatDateTime(payment.receiptIssuedAt) : null].filter(Boolean).join(", ")
    : null;

  return (
    <div className={`hidden min-h-10 items-center gap-3 xl:grid ${props.gridClass}`}>
      <p className="text-xs tabular-nums text-on-surface-variant">{formatPaymentDate(payment.paymentDate)}</p>
      {props.showClient ? (
        <p className="truncate text-sm font-semibold text-on-surface" title={payment.clientName || undefined}>
          {payment.clientName || `Klient #${payment.clientId}`}
        </p>
      ) : null}
      <p className="truncate text-sm text-on-surface-variant" title={packageDetails}>
        {payment.packageName || "Bez przypisanego pakietu"}
      </p>
      <p className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
        <span className="text-sm font-semibold tabular-nums text-on-surface">{formatMoney(payment.amount, payment.currency)}</span>
        {overpayment ? (
          <span className="truncate text-xs text-tertiary-light" title={`Nadpłata ${formatMoney(payment.balanceCreditAmount, payment.currency)} trafiła na saldo klienta`}>
            +{formatMoney(payment.balanceCreditAmount, payment.currency)}
          </span>
        ) : null}
      </p>
      <div className="flex min-w-0 items-center gap-1.5">
        <PaymentStatusBadge payment={payment} />
        {receiptLabel ? (
          <span className="shrink-0 text-tertiary-light" title={receiptLabel}>
            <ReceiptText size={14} aria-hidden="true" />
            <span className="sr-only">{receiptLabel}</span>
          </span>
        ) : null}
      </div>
      <PaymentMethod method={payment.method} />
      {props.showActions ? <CompactRowActions {...props} /> : null}
    </div>
  );
}

// The most common next step stays visible; everything else waits behind "⋯".
function CompactRowActions(props: PaymentListRowProps) {
  const pending = isPaymentPending(props.payment);
  const confirmed = isPaymentConfirmed(props.payment);
  const reversed = isPaymentReversed(props.payment);
  const receiptIssued = isPaymentReceiptIssued(props.payment);
  const settled = confirmed && !reversed;
  const primary = pending && props.onConfirm
    ? { label: "Potwierdź wpłatę", icon: <Check size={15} />, onSelect: props.onConfirm, tone: "success" as const }
    : settled && !receiptIssued && props.onIssueReceipt
      ? { label: "Wystaw paragon", icon: <ReceiptText size={15} />, onSelect: props.onIssueReceipt, tone: "neutral" as const }
      : null;
  const menuItems: RowMenuItem[] = [
    ...(pending && props.onReject ? [{ label: "Odrzuć wpłatę", icon: <CircleX size={15} />, onSelect: props.onReject, tone: "danger" as const }] : []),
    ...(settled && receiptIssued && props.onCancelReceipt ? [{ label: "Cofnij paragon", icon: <CircleX size={15} />, onSelect: props.onCancelReceipt }] : []),
    ...(props.onCorrectDate ? [{ label: "Zmień datę wpłaty", icon: <CalendarClock size={15} />, onSelect: props.onCorrectDate }] : []),
    ...(settled && props.onReverse ? [{ label: "Cofnij wpłatę", icon: <RotateCcw size={15} />, onSelect: props.onReverse, tone: "danger" as const }] : []),
  ];

  return (
    <div className="flex justify-end gap-1">
      {primary ? (
        <IconAction label={primary.label} onClick={primary.onSelect} disabled={props.processing} tone={primary.tone} size="sm">
          {primary.icon}
        </IconAction>
      ) : null}
      {props.detailsHref ? (
        <Link
          href={props.detailsHref}
          aria-label="Zobacz szczegóły płatności"
          title="Szczegóły"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-on-surface-muted transition hover:bg-surface-container-high hover:text-primary-light"
        >
          <ChevronRight size={16} />
        </Link>
      ) : null}
      <RowMoreMenu items={menuItems} disabled={props.processing} />
    </div>
  );
}

type RowMenuItem = { label: string; icon: ReactNode; onSelect: () => void; tone?: "default" | "danger" };

// Rendered in a portal so the list's rounded, clipped container never cuts the menu off.
function RowMoreMenu({ items, disabled }: { items: RowMenuItem[]; disabled: boolean }) {
  const { open, host, show, close, rootRef, triggerRef } = usePickerPopover();
  const menuId = useId();
  if (!items.length) return <span aria-hidden="true" className="h-8 w-8" />;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Więcej akcji"
        title="Więcej akcji"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-on-surface-muted transition hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MoreHorizontal size={16} />
      </button>
      {host ? (
        <PickerPanel host={host} anchorRef={rootRef} id={menuId} label="Więcej akcji" align="end" onClose={close} className="min-w-[210px] p-1.5!">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              autoFocus={item === items[0]}
              onClick={() => { close(false); item.onSelect(); }}
              className={[
                "flex min-h-9 w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 text-left text-sm font-semibold transition focus-visible:outline-none",
                item.tone === "danger"
                  ? "text-error-light hover:bg-error-container/25 focus-visible:bg-error-container/25"
                  : "text-on-surface hover:bg-white/5 focus-visible:bg-white/5",
              ].join(" ")}
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </PickerPanel>
      ) : null}
    </div>
  );
}

function RowActions(props: PaymentListRowProps) {
  const pending = isPaymentPending(props.payment);
  const confirmed = isPaymentConfirmed(props.payment);
  const reversed = isPaymentReversed(props.payment);
  const receiptIssued = isPaymentReceiptIssued(props.payment);

  return (
    <div className="flex justify-end gap-1.5">
      {props.onCorrectDate ? <IconAction label="Zmień datę wpłaty" onClick={props.onCorrectDate} disabled={props.processing}><CalendarClock size={16} /></IconAction> : null}
      {pending && (props.onConfirm || props.onReject) ? (
        <>
          {props.onConfirm ? (
            <IconAction
              label="Potwierdź wpłatę"
              onClick={props.onConfirm}
              disabled={props.processing}
              tone="success"
            >
              <Check size={16} />
            </IconAction>
          ) : null}
          {props.onReject ? (
            <IconAction
              label="Odrzuć wpłatę"
              onClick={props.onReject}
              disabled={props.processing}
              tone="danger"
            >
              <CircleX size={16} />
            </IconAction>
          ) : null}
        </>
      ) : null}
      {confirmed &&
      !reversed &&
      (props.onIssueReceipt || props.onCancelReceipt || props.onReverse) ? (
        <>
          {(receiptIssued ? props.onCancelReceipt : props.onIssueReceipt) ? (
            <IconAction
              label={receiptIssued ? "Cofnij paragon" : "Wystaw paragon"}
              onClick={
                (receiptIssued ? props.onCancelReceipt : props.onIssueReceipt)!
              }
              disabled={props.processing}
            >
              {receiptIssued ? (
                <CircleX size={16} />
              ) : (
                <ReceiptText size={16} />
              )}
            </IconAction>
          ) : null}
          {props.onReverse ? (
            <IconAction
              label="Cofnij wpłatę"
              onClick={props.onReverse}
              disabled={props.processing}
            >
              <RotateCcw size={16} />
            </IconAction>
          ) : null}
        </>
      ) : null}
      {props.detailsHref ? (
        <Link
          href={props.detailsHref}
          aria-label="Zobacz szczegóły płatności"
          title="Szczegóły"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-muted transition hover:bg-surface-container-high hover:text-primary-light"
        >
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
  size = "md",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  tone?: "neutral" | "success" | "danger";
  size?: "sm" | "md";
  children: React.ReactNode;
}) {
  const toneClass = {
    neutral:
      "bg-surface-container text-on-surface-muted hover:bg-surface-container-high hover:text-on-surface",
    success:
      "bg-tertiary-container/35 text-tertiary-light hover:bg-tertiary-container/60",
    danger:
      "bg-error-container/35 text-error-light hover:bg-error-container/60",
  }[tone];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${size === "sm" ? "h-8 w-8" : "h-9 w-9"} ${toneClass}`}
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

function formatMoney(amount: number | null | undefined, currency?: string | null) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "Brak danych";
  return `${amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || "PLN"}`;
}

function formatPaymentDate(value?: string | null) {
  if (!value) return "Brak daty";

  return formatDateTime(value).replace(", 00:00", "");
}

// Full class names only: Tailwind generates classes it can read literally in the source.
function getCompactGridClass(showClient: boolean, showActions: boolean) {
  if (showClient && showActions) return "grid-cols-[96px_minmax(140px,1fr)_minmax(150px,1.2fr)_minmax(150px,0.8fr)_150px_96px_112px]";
  if (showClient) return "grid-cols-[96px_minmax(140px,1fr)_minmax(150px,1.2fr)_minmax(150px,0.8fr)_150px_96px]";
  if (showActions) return "grid-cols-[96px_minmax(200px,1.4fr)_minmax(150px,0.8fr)_150px_96px_112px]";
  return "grid-cols-[96px_minmax(200px,1.4fr)_minmax(150px,0.8fr)_150px_96px]";
}

function getGridClass(showClient: boolean, showActions: boolean) {
  if (showClient && showActions) {
    return "grid-cols-[110px_minmax(130px,0.9fr)_minmax(150px,1fr)_minmax(130px,0.7fr)_120px_90px_162px]";
  }

  if (showClient) {
    return "grid-cols-[110px_minmax(120px,0.8fr)_minmax(180px,1.2fr)_minmax(140px,0.8fr)_120px_100px]";
  }

  if (showActions) {
    return "grid-cols-[120px_minmax(190px,1.2fr)_minmax(150px,0.8fr)_120px_100px_162px]";
  }

  return "grid-cols-[120px_minmax(220px,1.3fr)_minmax(160px,0.8fr)_120px_110px]";
}
