"use client";

import { Banknote, CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { formatMoney } from "@/app/lib/formatters/money";
import type { ClientRefund } from "@/app/lib/owner/clients";

export default function ClientRefundsSection({
  refunds,
  loading,
  onConfirm,
}: {
  refunds: ClientRefund[];
  loading: boolean;
  onConfirm: (refund: ClientRefund) => void;
}) {
  return (
    <section className="card-shell p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-label text-on-surface-muted">Rozliczenia</p>
          <h2 className="mt-2 font-display text-[1.65rem] font-semibold leading-tight">
            Zwroty klienta
          </h2>
        </div>
        <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs font-semibold text-primary-light">
          {refunds.length}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {loading ? (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
            Pobieranie zwrotów...
          </div>
        ) : refunds.length ? (
          refunds.map((refund, index) => (
            <RefundRow
              key={`${refund.clientPackageId}-${refund.confirmedAt || "pending"}-${index}`}
              refund={refund}
              onConfirm={() => onConfirm(refund)}
            />
          ))
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
            Brak zwrotów do wyświetlenia.
          </div>
        )}
      </div>
    </section>
  );
}

function RefundRow({
  refund,
  onConfirm,
}: {
  refund: ClientRefund;
  onConfirm: () => void;
}) {
  const pending = isPendingRefund(refund);

  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-on-surface">
              {refund.packageName || "Pakiet klienta"}
            </p>
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                pending
                  ? "bg-warning-container/35 text-warning-light"
                  : "bg-tertiary/15 text-tertiary-light",
              ].join(" ")}
            >
              {pending ? <Clock3 size={12} /> : <CheckCircle2 size={12} />}
              {pending ? "Oczekuje na potwierdzenie" : "Zwrot potwierdzony"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-on-surface-variant">
            <span className="inline-flex items-center gap-1.5 font-semibold text-on-surface">
              <Banknote size={15} className="text-primary-light" />
              {formatMoney(refund.amount, refund.currency)}
            </span>
            <span>{getDispositionLabel(refund.disposition)}</span>
            {refund.confirmedAt ? (
              <span>Potwierdzono: {formatDate(refund.confirmedAt)}</span>
            ) : null}
            {refund.reference ? <span>Potwierdzenie: {refund.reference}</span> : null}
          </div>
        </div>

        {pending ? (
          <Button type="button" variant="secondary" size="sm" onClick={onConfirm}>
            Potwierdź wykonany zwrot
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function isPendingRefund(refund: ClientRefund) {
  return refund.disposition === "RefundPending" && !refund.confirmedAt;
}

function getDispositionLabel(disposition?: string | null) {
  if (disposition === "RefundPending") return "Zwrot uzgodniony";
  if (disposition === "Refunded") return "Zwrot wykonany";
  if (disposition === "Retain") return "Pozostałe wejścia zachowane";
  return "Rozliczenie zwrotu";
}

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
