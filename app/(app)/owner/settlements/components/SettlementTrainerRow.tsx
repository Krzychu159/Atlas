import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, ReceiptText } from "lucide-react";
import type { TrainerMonthlySettlement } from "@/app/lib/owner/settlements";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatHours(value: number) {
  return `${value.toFixed(1)} h`;
}

export default function SettlementTrainerRow({
  settlement,
}: {
  settlement: TrainerMonthlySettlement;
}) {
  const trainerName =
    settlement.trainerFullName || `Trener #${settlement.trainerId}`;
  const href = `/owner/trainers/${settlement.trainerId}/settlements?year=${settlement.year}&month=${settlement.month}`;

  return (
    <div className="grid gap-4 rounded-[var(--radius-lg)] bg-surface-container p-4 md:grid-cols-[1.25fr_0.8fr_0.8fr_0.9fr_0.9fr_44px] md:items-center">
      <div className="min-w-0">
        <p className="text-base font-semibold text-on-surface">{trainerName}</p>
        <p className="mt-1 text-label text-on-surface-muted">
          Rozliczenie {settlement.month}/{settlement.year}
        </p>
      </div>

      <Metric
        icon={<ReceiptText size={16} />}
        label="Sesje"
        value={settlement.totalSessions}
      />
      <Metric
        icon={<Clock3 size={16} />}
        label="Godziny"
        value={formatHours(settlement.totalHours)}
      />

      <div>
        <p className="text-label text-on-surface-muted">Do wypłaty</p>
        <p className="mt-1 text-lg font-semibold text-tertiary-light">
          {formatMoney(settlement.totalAmount)}
        </p>
      </div>

      <div>
        <p className="text-label text-on-surface-muted">Status</p>
        <span
          className={[
            "mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
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
        aria-label={`Przejdź do rozliczenia trenera ${trainerName}`}
        className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container-low text-primary-light transition hover:bg-surface-container-high hover:text-on-surface md:ml-auto"
      >
        <ArrowRight size={18} />
      </Link>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-label text-on-surface-muted">
        <span className="text-primary-light">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-on-surface">{value}</p>
    </div>
  );
}
