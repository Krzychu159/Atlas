import { Clock3, ReceiptText, Wallet } from "lucide-react";
import type { TrainerMonthlySettlement } from "@/app/lib/owner/settlements";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

function SummaryCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="card-shell p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-label text-on-surface-variant">{label}</p>
        <div className="text-primary-light">{icon}</div>
      </div>
      <p
        className={`mt-6 text-[2rem] font-semibold leading-none ${
          highlight ? "text-tertiary-light" : "text-on-surface"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function SettlementSummary({
  settlements,
}: {
  settlements: TrainerMonthlySettlement[];
}) {
  const totalAmount = settlements.reduce(
    (sum, item) => sum + item.totalAmount,
    0,
  );
  const totalHours = settlements.reduce((sum, item) => sum + item.totalHours, 0);
  const totalSessions = settlements.reduce(
    (sum, item) => sum + item.totalSessions,
    0,
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <SummaryCard
        label="Do wypłaty"
        value={formatMoney(totalAmount)}
        icon={<Wallet size={22} />}
        highlight
      />
      <SummaryCard
        label="Roboczogodziny"
        value={totalHours.toFixed(1)}
        icon={<Clock3 size={22} />}
      />
      <SummaryCard
        label="Sesje"
        value={totalSessions}
        icon={<ReceiptText size={22} />}
      />
    </div>
  );
}
