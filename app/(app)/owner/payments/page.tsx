"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  confirmClientPayment,
  getPendingPayments,
  type ClientPayment,
} from "@/app/lib/owner/billing";
import {
  showOwnerError,
  showOwnerSuccess,
} from "../components/owner-toast";

const fiscalStorageKey = "atlas-owner-fiscal-printed-payments";

export default function OwnerPaymentsPage() {
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [printedIds, setPrintedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPrintedIds(readPrintedIds());
      void loadPayments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function loadPayments() {
    try {
      setIsLoading(true);
      const data = await getPendingPayments();
      setPayments(data);
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
      showOwnerSuccess("Ta wpłata nie wymaga potwierdzenia.", {
        id: `owner-payment-not-pending-${payment.id}`,
      });
      return;
    }

    try {
      setProcessingId(payment.id);
      const confirmed = await confirmClientPayment(payment.id);
      setPayments((current) =>
        current.map((item) => (item.id === payment.id ? confirmed : item)),
      );
      showOwnerSuccess("Wpłata została oznaczona jako opłacona.", {
        id: `owner-payment-confirmed-${payment.id}`,
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się oznaczyć wpłaty jako opłaconej.", {
        id: `owner-payment-confirm-error-${payment.id}`,
      });
    } finally {
      setProcessingId(null);
    }
  }

  function handleToggleFiscal(paymentId: number) {
    setPrintedIds((current) => {
      const next = current.includes(paymentId)
        ? current.filter((id) => id !== paymentId)
        : [...current, paymentId];

      writePrintedIds(next);
      return next;
    });
  }

  const summary = useMemo(() => getPaymentsSummary(payments), [payments]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Panel ownera</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Płatności
          </h1>
          <p className="mt-3 max-w-[680px] text-sm leading-6 text-on-surface-variant">
            Wpłaty klientów oczekujące na potwierdzenie oraz kontrola
            wystawienia paragonu.
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

      <section className="grid gap-3 md:grid-cols-3">
        <PaymentStat
          label="Oczekujące"
          value={String(summary.count)}
          icon={<WalletCards size={18} />}
        />
        <PaymentStat
          label="Do potwierdzenia"
          value={formatMoney(summary.amount, summary.currency)}
          icon={<ReceiptText size={18} />}
        />
        <PaymentStat
          label="Paragony"
          value={`${printedIds.length}/${payments.length}`}
          icon={<FileCheck2 size={18} />}
        />
      </section>

      <section className="card-shell p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-section-title">Lista wpłat</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Backend udostępnia aktualnie listę wpłat oczekujących.
            </p>
          </div>
          <p className="text-label text-on-surface-muted">
            {payments.length} pozycji
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-5 text-on-surface-variant">
            Ładowanie płatności...
          </div>
        ) : payments.length > 0 ? (
          <div className="flex flex-col gap-3">
            {payments.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                fiscalPrinted={printedIds.includes(payment.id)}
                processing={processingId === payment.id}
                onConfirm={() => handleConfirm(payment)}
                onToggleFiscal={() => handleToggleFiscal(payment.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-8 text-center text-on-surface-variant">
            Brak wpłat oczekujących na potwierdzenie.
          </div>
        )}
      </section>
    </div>
  );
}

function PaymentStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card-shell flex items-center justify-between gap-4 p-5">
      <div>
        <p className="text-label text-on-surface-muted">{label}</p>
        <p className="mt-3 text-2xl font-semibold text-on-surface">{value}</p>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
        {icon}
      </div>
    </div>
  );
}

function PaymentRow({
  payment,
  fiscalPrinted,
  processing,
  onConfirm,
  onToggleFiscal,
}: {
  payment: ClientPayment;
  fiscalPrinted: boolean;
  processing: boolean;
  onConfirm: () => void;
  onToggleFiscal: () => void;
}) {
  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.8fr_0.8fr_auto] lg:items-center">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-on-surface">
            {payment.clientName || `Klient #${payment.clientId}`}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {payment.packageName || "Wpłata bez przypisanego pakietu"}
          </p>
        </div>

        <div>
          <p className="text-label text-on-surface-muted">Kwota</p>
          <p className="mt-1 text-lg font-semibold text-tertiary-light">
            {formatMoney(payment.amount, payment.currency)}
          </p>
        </div>

        <div>
          <p className="text-label text-on-surface-muted">Status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill label={getPaymentStatusLabel(payment.status)} />
            <StatusPill
              label={fiscalPrinted ? "Paragon wystawiony" : "Brak paragonu"}
              muted={!fiscalPrinted}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            size="sm"
            variant="secondary"
            icon={<FileCheck2 size={15} />}
            onClick={onToggleFiscal}
            disabled={fiscalPrinted}
          >
            {fiscalPrinted ? "Paragon wystawiony" : "Wystaw paragon"}
          </Button>
          <Button
            size="sm"
            icon={<CheckCircle2 size={15} />}
            onClick={onConfirm}
            disabled={processing || isConfirmed(payment)}
          >
            {isConfirmed(payment) ? "Opłacone" : "Oznacz opłacone"}
          </Button>
          <ButtonLinkLike href={`/owner/clients/${payment.clientId}/payments`} />
        </div>
      </div>
    </article>
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

function StatusPill({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        muted
          ? "bg-surface-container text-on-surface-muted"
          : "bg-tertiary-light/15 text-tertiary-light",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function getPaymentsSummary(payments: ClientPayment[]) {
  return payments.reduce(
    (summary, payment) => ({
      count: summary.count + (isConfirmed(payment) ? 0 : 1),
      amount: summary.amount + (isConfirmed(payment) ? 0 : payment.amount),
      currency: payment.currency || summary.currency,
    }),
    { count: 0, amount: 0, currency: "PLN" },
  );
}

function isPendingPayment(payment: ClientPayment) {
  return payment.status === 1 && !payment.confirmedAt && !payment.rejectedAt;
}

function isConfirmed(payment: ClientPayment) {
  return payment.status === 2 || Boolean(payment.confirmedAt);
}

function getPaymentStatusLabel(status: number) {
  const labels: Record<number, string> = {
    1: "Oczekuje",
    2: "Opłacone",
    3: "Odrzucone",
    4: "Anulowane",
  };

  return labels[status] || `Status ${status}`;
}

function formatMoney(amount: number, currency?: string | null) {
  return `${amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || "PLN"}`;
}

function readPrintedIds() {
  try {
    const raw = window.localStorage.getItem(fiscalStorageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];

    return Array.isArray(parsed)
      ? parsed.filter((value): value is number => typeof value === "number")
      : [];
  } catch {
    return [];
  }
}

function writePrintedIds(ids: number[]) {
  window.localStorage.setItem(fiscalStorageKey, JSON.stringify(ids));
}
