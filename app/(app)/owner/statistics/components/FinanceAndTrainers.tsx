import { Activity, BarChart3 } from "lucide-react";
import { formatMoney } from "@/app/lib/formatters/money";
import type { AnalyticsBreakdown } from "@/app/lib/owner/analytics";
import {
  getBreakdownAmount,
  getBreakdownCount,
  getBreakdownLabel,
  type MonthlyFinancePoint,
} from "../statistics-config";

type FinanceAndTrainersProps = {
  monthlyData: MonthlyFinancePoint[];
  trainers: AnalyticsBreakdown[];
};

// Sekcje: Przychody i koszty oraz rentowność trenerów
export default function FinanceAndTrainers({
  monthlyData,
  trainers,
}: FinanceAndTrainersProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      {/* Sekcja: Przychody i koszty */}
      <MonthlyFinance data={monthlyData} />

      {/* Sekcja: Rentowność trenerów */}
      <TrainerProfitability items={trainers} />
    </section>
  );
}

function MonthlyFinance({ data }: { data: MonthlyFinancePoint[] }) {
  const max = Math.max(
    1,
    ...data.flatMap((item) => [item.revenue, item.expense]),
  );

  return (
    <article className="card-shell p-5 md:p-6">
      <SectionHeading
        icon={<BarChart3 size={18} />}
        title="Przychody i koszty"
        description="Porównanie miesięczne dla wybranego zakresu"
      />
      {data.length ? (
        <div className="mt-6 flex flex-col gap-5">
          {data.map((item) => (
            <div key={item.key}>
              <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                <span className="font-semibold capitalize text-on-surface">
                  {item.label}
                </span>
                <span className="text-on-surface-muted">
                  {formatMoney(item.revenue)} / {formatMoney(item.expense)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <FinanceBar value={item.revenue} max={max} tone="revenue" />
                <FinanceBar value={item.expense} max={max} tone="expense" />
              </div>
            </div>
          ))}
          <div className="flex gap-5 border-t border-white/5 pt-4 text-xs text-on-surface-muted">
            <Legend color="bg-primary" label="Przychód netto" />
            <Legend color="bg-warning" label="Koszty brutto" />
          </div>
        </div>
      ) : (
        <EmptySection label="Brak danych miesięcznych w tym zakresie." />
      )}
    </article>
  );
}

function TrainerProfitability({ items }: { items: AnalyticsBreakdown[] }) {
  const sorted = [...items]
    .sort(
      (first, second) =>
        getBreakdownAmount(second, ["profitAmount"]) -
        getBreakdownAmount(first, ["profitAmount"]),
    )
    .slice(0, 6);
  const max = Math.max(
    1,
    ...sorted.map((item) =>
      Math.abs(getBreakdownAmount(item, ["profitAmount"])),
    ),
  );

  return (
    <article className="card-shell p-5 md:p-6">
      <SectionHeading
        icon={<Activity size={18} />}
        title="Rentowność trenerów"
        description="Zysk i marża wygenerowane przez sesje"
      />
      {sorted.length ? (
        <div className="mt-5 flex flex-col gap-3">
          {sorted.map((item, index) => {
            const profit = getBreakdownAmount(item, ["profitAmount"]);
            const margin = Number(item.profitMarginPercent) || 0;

            return (
              <div
                key={`${getBreakdownLabel(item)}-${index}`}
                className="rounded-[var(--radius-lg)] bg-surface-container-low p-3.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">
                      {getBreakdownLabel(item, `Trener ${index + 1}`)}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-muted">
                      {getBreakdownCount(item)} sesji · marża{" "}
                      {formatPercent(margin)}
                    </p>
                  </div>
                  <p
                    className={
                      profit >= 0
                        ? "font-semibold text-tertiary-light"
                        : "font-semibold text-error-light"
                    }
                  >
                    {formatMoney(profit)}
                  </p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={
                      profit >= 0
                        ? "h-full rounded-full bg-tertiary"
                        : "h-full rounded-full bg-error"
                    }
                    style={{
                      width: `${Math.max(2, (Math.abs(profit) / max) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptySection label="Brak danych o rentowności trenerów." />
      )}
    </article>
  );
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/15 text-primary-light">
        {icon}
      </span>
      <div>
        <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
        <p className="mt-1 text-xs text-on-surface-muted">{description}</p>
      </div>
    </div>
  );
}

function FinanceBar({
  value,
  max,
  tone,
}: {
  value: number;
  max: number;
  tone: "revenue" | "expense";
}) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
      <div
        className={
          tone === "revenue"
            ? "h-full rounded-full bg-primary"
            : "h-full rounded-full bg-warning"
        }
        style={{ width: `${Math.max(value ? 2 : 0, (value / max) * 100)}%` }}
      />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center px-5 py-8 text-center text-sm text-on-surface-muted">
      {label}
    </div>
  );
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 1,
  }).format(value || 0)}%`;
}
