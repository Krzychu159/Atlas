import { Clock3, ReceiptText, Wallet } from "lucide-react";
import type { TrainerMonthlySettlement } from "@/app/lib/owner/settlements";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 2,
  }).format(value);
}

function SummaryCard({ label, value, icon, description, tone, isLoading }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  tone?: "success" | "pending";
  isLoading: boolean;
}) {
  return (
    <div className="card-shell p-4 md:p-5" aria-busy={isLoading}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-lowest text-primary-light" aria-hidden="true">
          {icon}
        </span>
      </div>
      {isLoading ? (
        <div className="mt-3 animate-pulse motion-reduce:animate-none" aria-hidden="true">
          <div className="h-7 w-24 rounded bg-surface-container-high" />
          <div className="mt-2 h-4 w-40 max-w-full rounded bg-surface-container-high" />
        </div>
      ) : (
        <>
          <p className={`mt-3 text-[1.75rem] font-semibold leading-none tabular-nums ${tone === "pending" ? "text-warning-light" : "text-on-surface"}`}>
            {value}
          </p>
          <p className={`mt-2 flex items-center gap-1.5 text-xs ${tone === "success" ? "text-tertiary-light" : tone === "pending" ? "text-warning-light" : "text-on-surface-variant"}`}>
            {tone ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" /> : null}
            {description}
          </p>
        </>
      )}
    </div>
  );
}

export default function SettlementSummary({ settlements, isLoading = false }: {
  settlements: TrainerMonthlySettlement[];
  isLoading?: boolean;
}) {
  const totalAmount = settlements.reduce((sum, item) => sum + (item.isPaid ? 0 : item.totalAmount), 0);
  const totalHours = settlements.reduce((sum, item) => sum + item.totalHours, 0);
  const totalSessions = settlements.reduce((sum, item) => sum + item.totalSessions, 0);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <SummaryCard
        label="Do wypłaty"
        value={formatMoney(totalAmount)}
        icon={<Wallet size={17} />}
        description={totalAmount > 0 ? `${formatMoney(totalAmount)} czeka na rozliczenie` : "Wszystko rozliczone"}
        tone={totalAmount > 0 ? "pending" : "success"}
        isLoading={isLoading}
      />
      <SummaryCard
        label="Roboczogodziny"
        value={`${totalHours.toLocaleString("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`}
        icon={<Clock3 size={17} />}
        description="Łączny czas sesji w tym miesiącu"
        isLoading={isLoading}
      />
      <SummaryCard
        label="Sesje"
        value={totalSessions}
        icon={<ReceiptText size={17} />}
        description="Zrealizowane treningi"
        isLoading={isLoading}
      />
    </div>
  );
}
