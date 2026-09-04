import {
  BanknoteArrowDown,
  CircleCheck,
  Clock3,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { formatMoney } from "@/app/lib/formatters/money";
import type { ExpenseStatistics } from "@/app/lib/owner/expenses";

type ExpenseStatsProps = {
  statistics: ExpenseStatistics;
  isLoading: boolean;
};

// Sekcja: Podsumowanie wydatków
export default function ExpenseStats({ statistics, isLoading }: ExpenseStatsProps) {
  const cards = [
    {
      label: "Suma wydatków",
      value: statistics.grossAmount,
      meta: `${statistics.expenseCount} dokumentów`,
      icon: <BanknoteArrowDown size={18} />,
      tone: "primary",
    },
    {
      label: "Opłacone",
      value: statistics.paidGrossAmount,
      meta: `${statistics.paidCount} rozliczonych`,
      icon: <CircleCheck size={18} />,
      tone: "success",
    },
    {
      label: "Do zapłaty",
      value: statistics.unpaidGrossAmount,
      meta: `${statistics.unpaidCount} oczekujących`,
      icon: <Clock3 size={18} />,
      tone: "warning",
    },
    {
      label: "Zaległe",
      value: statistics.overdueGrossAmount,
      meta: `${statistics.overdueCount} po terminie`,
      icon: <TriangleAlert size={18} />,
      tone: "danger",
    },
  ] as const;

  return (
    <section>
      <div className="grid auto-cols-[82%] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-[45%] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible lg:pb-0">
        {cards.map((card) => (
          <article
            key={card.label}
            className={`snap-start rounded-[var(--radius-xl)] border bg-surface-container p-4 shadow-soft ${statToneClasses[card.tone]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-label text-on-surface-muted">{card.label}</p>
              <span className="text-current">{card.icon}</span>
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-tight text-on-surface">
              {isLoading ? "—" : formatMoney(card.value, "PLN")}
            </p>
            <p className="mt-2 text-xs text-on-surface-muted">{card.meta}</p>
          </article>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-4 rounded-[var(--radius-xl)] bg-surface-container-low px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary-light">
            <TrendingUp size={18} />
          </span>
          <div>
            <p className="text-label text-on-surface-muted">Wynik operacyjny brutto</p>
            <p className="mt-1 text-lg font-semibold text-on-surface">
              {formatMoney(statistics.operatingProfitGrossAmount, "PLN")}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 text-sm sm:text-right">
          <div>
            <p className="text-xs text-on-surface-muted">Przychód brutto</p>
            <p className="mt-1 font-semibold">
              {formatMoney(statistics.revenueGrossAmount, "PLN")}
            </p>
          </div>
          <div>
            <p className="text-xs text-on-surface-muted">Opłaty operatora</p>
            <p className="mt-1 font-semibold">
              {formatMoney(statistics.paymentProviderFeeAmount, "PLN")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const statToneClasses = {
  primary: "border-primary-light/10 text-primary-light",
  success: "border-tertiary/15 text-tertiary-light",
  warning: "border-warning/15 text-warning-light",
  danger: "border-error/20 text-error-light",
};
