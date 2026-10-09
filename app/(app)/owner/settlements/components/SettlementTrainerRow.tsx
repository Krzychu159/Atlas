import Link from "next/link";
import { ArrowRight, Clock3, ReceiptText } from "lucide-react";
import type { TrainerMonthlySettlement } from "@/app/lib/owner/settlements";

export const settlementGridClass = "xl:grid-cols-[minmax(180px,1.8fr)_minmax(70px,0.7fr)_minmax(110px,1fr)_minmax(100px,1fr)_120px_44px]";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function SettlementTrainerRow({ settlement, locationId }: {
  settlement: TrainerMonthlySettlement;
  locationId?: number | null;
}) {
  const trainerName = settlement.trainerFullName || `Trener #${settlement.trainerId}`;
  const initials = settlement.trainerFullName?.trim().split(/\s+/).filter(Boolean)
    .map((part) => part[0]).filter((_, index, parts) => index === 0 || index === parts.length - 1)
    .join("").toLocaleUpperCase("pl-PL") || "T";
  const href = {
    pathname: `/owner/trainers/${settlement.trainerId}/settlements`,
    query: {
      year: settlement.year,
      month: settlement.month,
      ...(locationId != null ? { locationId } : {}),
    },
  };
  const isPending = !settlement.isPaid && settlement.totalAmount > 0;
  const amountDue = settlement.isPaid ? 0 : settlement.totalAmount;
  const status = settlement.isPaid ? "Rozliczone" : isPending ? "Do wypłaty" : "Brak wypłaty";
  const statusClass = settlement.isPaid
    ? "bg-tertiary-container/35 text-tertiary-light"
    : isPending
      ? "bg-warning-container/35 text-warning-light"
      : "bg-surface-container-high text-on-surface-muted";

  return (
    <li className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4 rounded-[var(--radius-lg)] bg-surface-container-low p-4 transition hover:bg-surface-container-high/50 xl:gap-3 xl:rounded-none xl:bg-surface-container-lowest xl:px-5 xl:py-3 xl:odd:bg-surface-container-low/55 ${settlementGridClass}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-high text-xs font-semibold text-on-surface" aria-hidden="true">
          {initials}
        </span>
        <p className="min-w-0 break-words text-sm font-semibold text-on-surface">{trainerName}</p>
      </div>

      <Metric icon={<ReceiptText size={14} />} label="Sesje" value={settlement.totalSessions} className="col-start-1 row-start-2 xl:col-auto xl:row-auto" />
      <Metric
        icon={<Clock3 size={14} />}
        label="Roboczogodziny"
        value={`${settlement.totalHours.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} h`}
        className="col-start-1 row-start-3 xl:col-auto xl:row-auto"
      />

      <div className="col-start-2 row-start-2 text-right xl:col-auto xl:row-auto">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted xl:hidden">Do wypłaty</p>
        <p className={`whitespace-nowrap text-sm font-semibold tabular-nums ${isPending ? "text-warning-light" : "text-on-surface"}`}>
          {formatMoney(amountDue)}
        </p>
      </div>

      <div className="col-start-2 row-start-3 text-right xl:col-auto xl:row-auto xl:text-left">
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {status}
        </span>
      </div>

      <Link
        href={href}
        prefetch={false}
        aria-label={`Przejdź do rozliczenia trenera ${trainerName}`}
        title="Szczegóły rozliczenia"
        className="col-start-2 row-start-1 ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-muted transition hover:bg-surface-container-high hover:text-primary-light focus-visible:outline-2 focus-visible:outline-primary-light xl:col-auto xl:row-auto xl:h-9 xl:w-9"
      >
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </li>
  );
}

function Metric({ icon, label, value, className }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  className: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted xl:hidden">{label}</p>
      <p className="flex items-center gap-1.5 text-xs tabular-nums text-on-surface-variant">
        <span className="shrink-0 text-primary-light" aria-hidden="true">{icon}</span>
        {value}
        <span className="sr-only">{label}</span>
      </p>
    </div>
  );
}
