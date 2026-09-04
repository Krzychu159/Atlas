import {
  BadgeDollarSign,
  Banknote,
  CalendarDays,
  Clock3,
  Landmark,
  Percent,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { formatMoney } from "@/app/lib/formatters/money";
import type {
  RevenueStatistics,
  TrainerCostStatistics,
} from "@/app/lib/owner/analytics";
import type { ExpenseStatistics } from "@/app/lib/owner/expenses";

type StatisticsOverviewProps = {
  revenue: RevenueStatistics;
  expenses: ExpenseStatistics;
  trainerCosts: TrainerCostStatistics;
  operatingProfit: number;
  isLoading: boolean;
};

// Sekcja: Podsumowanie przychodów, kosztów i trenerów
export default function StatisticsOverview({
  revenue,
  expenses,
  trainerCosts,
  operatingProfit,
  isLoading,
}: StatisticsOverviewProps) {
  const cards = [
    {
      label: "Przychód netto",
      value: formatMoney(revenue.netAmount),
      meta: `Brutto ${formatMoney(revenue.grossAmount)}`,
      icon: <Landmark size={19} />,
      tone: "primary",
    },
    {
      label: "Koszty brutto",
      value: formatMoney(expenses.grossAmount),
      meta: `VAT ${formatMoney(expenses.vatAmount)}`,
      icon: <Banknote size={19} />,
      tone: "warning",
    },
    {
      label: "Zysk operacyjny netto",
      value: formatMoney(operatingProfit),
      meta: operatingProfit >= 0 ? "Wynik dodatni" : "Wynik ujemny",
      icon: <TrendingUp size={19} />,
      tone: operatingProfit >= 0 ? "success" : "error",
    },
    {
      label: "Prowizje operatorów",
      value: formatMoney(revenue.providerFeeAmount),
      meta: revenue.grossAmount
        ? `${formatPercent((revenue.providerFeeAmount / revenue.grossAmount) * 100)} przychodu`
        : "Brak prowizji",
      icon: <Percent size={19} />,
      tone: "neutral",
    },
  ] as const;

  const secondary = [
    {
      label: "Koszt trenerów",
      value: formatMoney(trainerCosts.trainerCostAmount),
      icon: <UsersRound size={17} />,
    },
    {
      label: "Marża trenerów",
      value: formatPercent(trainerCosts.profitMarginPercent),
      icon: <BadgeDollarSign size={17} />,
    },
    {
      label: "Sesje",
      value: formatNumber(trainerCosts.sessionsCount),
      icon: <CalendarDays size={17} />,
    },
    {
      label: "Godziny rozliczeniowe",
      value: formatNumber(trainerCosts.billableHours, 1),
      icon: <Clock3 size={17} />,
    },
  ];

  return (
    <section className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="card-shell min-h-36 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-label text-on-surface-muted">{card.label}</p>
              <span className={toneClasses[card.tone]}>{card.icon}</span>
            </div>
            {isLoading ? (
              <div className="mt-5 h-8 w-2/3 animate-pulse rounded bg-white/5" />
            ) : (
              <p className="mt-5 text-2xl font-semibold text-on-surface">
                {card.value}
              </p>
            )}
            <p className="mt-2 text-xs text-on-surface-muted">{card.meta}</p>
          </article>
        ))}
      </div>

      {/* <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {secondary.map((item) => (
          <article
            key={item.label}
            className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-white/5 text-primary-light">
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-on-surface-muted">{item.label}</p>
              <p className="mt-0.5 truncate font-semibold text-on-surface">
                {item.value}
              </p>
            </div>
          </article>
        ))}
      </div> */}
    </section>
  );
}

const toneClasses = {
  primary:
    "flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary-light",
  success:
    "flex h-10 w-10 items-center justify-center rounded-full bg-tertiary-container/40 text-tertiary-light",
  warning:
    "flex h-10 w-10 items-center justify-center rounded-full bg-warning-container/40 text-warning-light",
  error:
    "flex h-10 w-10 items-center justify-center rounded-full bg-error-container/40 text-error-light",
  neutral:
    "flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-on-surface-variant",
};

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("pl-PL", { maximumFractionDigits }).format(
    value || 0,
  );
}

function formatPercent(value: number) {
  return `${formatNumber(value, 1)}%`;
}
