"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  ReceiptText,
  RefreshCw,
  UsersRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { OwnerTextArea } from "../components/OwnerFormControls";
import {
  confirmClientPayment,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getPendingPayments,
  isPendingPayment,
  rejectClientPayment,
  type ClientPayment,
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
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
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
      await confirmClientPayment(payment.id);
      setPayments((current) =>
        current.filter((item) => item.id !== payment.id),
      );
      showOwnerSuccess("Wpłata została potwierdzona.", {
        id: `owner-payment-confirmed-${payment.id}`,
      });
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
      setPayments((current) =>
        current.filter((item) => item.id !== paymentToReject.id),
      );
      setPaymentToReject(null);
      setRejectReason("");
      showOwnerSuccess("Wpłata została odrzucona.", {
        id: `owner-payment-rejected-${paymentToReject.id}`,
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się odrzucić wpłaty.", {
        id: `owner-payment-reject-error-${paymentToReject.id}`,
      });
    } finally {
      setProcessingId(null);
    }
  }

  const summary = useMemo(() => getPendingPaymentsSummary(payments), [payments]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Panel ownera</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Płatności
          </h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
            Kolejka wpłat zgłoszonych przez klientów. Wpłaty dodane ręcznie
            przez staff są potwierdzane przez backend od razu i trafiają do
            historii konkretnego klienta.
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
          label="Do potwierdzenia"
          value={String(summary.count)}
          icon={<Clock3 size={18} />}
        />
        <PaymentStat
          label="Kwota zgłoszeń"
          value={formatMoney(summary.amount, summary.currency)}
          icon={<ReceiptText size={18} />}
        />
        <PaymentStat
          label="Klienci"
          value={String(summary.clientsCount)}
          icon={<UsersRound size={18} />}
        />
      </section>

      <section className="card-shell p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-section-title">Zgłoszenia klientów</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Potwierdzenie księguje zgłoszoną wpłatę. Odrzucenie wymaga
              krótkiego powodu, który zostaje wysłany do backendu.
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
              <PendingPaymentRow
                key={payment.id}
                payment={payment}
                processing={processingId === payment.id}
                onConfirm={() => handleConfirm(payment)}
                onReject={() => {
                  setPaymentToReject(payment);
                  setRejectReason("");
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-8 text-center text-on-surface-variant">
            Brak wpłat oczekujących na potwierdzenie.
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

function PendingPaymentRow({
  payment,
  processing,
  onConfirm,
  onReject,
}: {
  payment: ClientPayment;
  processing: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_auto] xl:items-center">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-on-surface">
            {payment.clientName || `Klient #${payment.clientId}`}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {payment.packageName || "Pakiet nierozpoznany"} ·{" "}
            {formatDate(payment.paymentDate)}
          </p>
          {payment.note ? (
            <p className="mt-2 line-clamp-2 text-xs text-on-surface-muted">
              {payment.note}
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-label text-on-surface-muted">Kwota</p>
          <p className="mt-1 text-lg font-semibold text-tertiary-light">
            {formatMoney(payment.amount, payment.currency)}
          </p>
        </div>

        <div>
          <p className="text-label text-on-surface-muted">Zgłoszenie</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill label={getPaymentStatusLabel(payment.status)} />
            <StatusPill label={getPaymentMethodLabel(payment.method)} muted />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button
            size="sm"
            icon={<CheckCircle2 size={15} />}
            onClick={onConfirm}
            disabled={processing || !isPendingPayment(payment)}
          >
            Potwierdź
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<XCircle size={15} />}
            onClick={onReject}
            disabled={processing || !isPendingPayment(payment)}
          >
            Odrzuć
          </Button>
          <ButtonLinkLike href={`/owner/clients/${payment.clientId}/payments`} />
        </div>
      </div>
    </article>
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
              {payment.packageName || "Pakiet nierozpoznany"}
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

function getPendingPaymentsSummary(payments: ClientPayment[]) {
  const clientIds = new Set<number>();

  return payments.reduce(
    (summary, payment) => {
      clientIds.add(payment.clientId);

      return {
        count: summary.count + 1,
        amount: summary.amount + payment.amount,
        currency: payment.currency || summary.currency,
        clientsCount: clientIds.size,
      };
    },
    { count: 0, amount: 0, currency: "PLN", clientsCount: 0 },
  );
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
