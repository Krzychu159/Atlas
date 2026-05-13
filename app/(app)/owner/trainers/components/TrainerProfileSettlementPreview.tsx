import Link from "next/link";
import { ArrowRight, CheckCircle2, ReceiptText } from "lucide-react";
import type { TrainerMonthlySettlement } from "@/app/lib/owner/settlements";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TrainerProfileSettlementPreview({
  settlement,
}: {
  settlement: TrainerMonthlySettlement | null;
}) {
  if (!settlement) {
    return (
      <section className="card-shell p-6">
        <p className="text-section-title">Rozliczenia</p>
        <div className="mt-5 rounded-[var(--radius-lg)] bg-surface-container-low p-5 text-on-surface-variant">
          Brak danych rozliczeniowych dla bieżącego miesiąca.
        </div>
      </section>
    );
  }

  const href = `/owner/trainers/${settlement.trainerId}/settlements?year=${settlement.year}&month=${settlement.month}`;

  return (
    <section className="card-shell p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-section-title">Rozliczenia</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Bieżący miesiąc: {settlement.month}/{settlement.year}
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container-low text-primary-light">
          <ReceiptText size={20} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniStat label="Sesje" value={settlement.totalSessions} />
        <MiniStat label="Godziny" value={settlement.totalHours.toFixed(1)} />
      </div>

      <div className="mt-4 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
        <p className="text-label text-on-surface-muted">Do wypłaty</p>
        <p className="mt-2 text-3xl font-semibold text-tertiary-light">
          {formatMoney(settlement.totalAmount)}
        </p>
        <span
          className={[
            "mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
            settlement.isPaid
              ? "bg-tertiary-container text-tertiary-light"
              : "bg-warning-container text-warning-light",
          ].join(" ")}
        >
          <CheckCircle2 size={14} />
          {settlement.isPaid ? "Wypłacone" : "Do wypłaty"}
        </span>
      </div>

      <Link
        href={href}
        prefetch={false}
        className="mt-4 flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low text-sm font-semibold text-primary-light transition hover:bg-surface-container-high hover:text-on-surface"
      >
        Szczegóły rozliczenia
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <p className="text-label text-on-surface-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-on-surface">{value}</p>
    </div>
  );
}
