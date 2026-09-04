import { CreditCard, WalletCards } from "lucide-react";
import { formatMoney } from "@/app/lib/formatters/money";
import { getPaymentMethodLabel } from "@/app/lib/owner/billing";
import type { AnalyticsBreakdown } from "@/app/lib/owner/analytics";
import type { ExpenseStatistics } from "@/app/lib/owner/expenses";
import type { DictionaryOption } from "../../expenses/expense-config";
import {
  getBreakdownAmount,
  getBreakdownLabel,
} from "../statistics-config";

type RevenueCostsBreakdownsProps = {
  revenueByPaymentMethod: AnalyticsBreakdown[];
  expensesByCategory: ExpenseStatistics["byCategory"];
  categories: DictionaryOption[];
};

// Sekcja: Struktura przychodów i kosztów
export default function RevenueCostsBreakdowns({
  revenueByPaymentMethod,
  expensesByCategory,
  categories,
}: RevenueCostsBreakdownsProps) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      {/* Sekcja: Źródła przychodu */}
      <BreakdownList
        title="Źródła przychodu"
        description="Potwierdzone płatności według metody"
        icon={<CreditCard size={18} />}
        items={revenueByPaymentMethod}
        preferred={["grossAmount", "amount"]}
        label={(item) => {
          const method = Number(
            item.paymentMethod ?? item.method ?? item.key ?? item.id,
          );
          return Number.isFinite(method)
            ? getPaymentMethodLabel(method)
            : getBreakdownLabel(item);
        }}
      />

      {/* Sekcja: Koszty według kategorii */}
      <BreakdownList
        title="Koszty według kategorii"
        description="Struktura dokumentów kosztowych brutto"
        icon={<WalletCards size={18} />}
        items={(expensesByCategory || []) as AnalyticsBreakdown[]}
        preferred={["grossAmount", "amount"]}
        label={(item) => {
          const category = Number(item.category ?? item.key ?? item.id);
          return (
            categories.find((option) => option.value === category)?.label ||
            getBreakdownLabel(item, `Kategoria ${category}`)
          );
        }}
      />
    </section>
  );
}

function BreakdownList({
  title,
  description,
  icon,
  items,
  preferred,
  label = getBreakdownLabel,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: AnalyticsBreakdown[];
  preferred: Array<keyof AnalyticsBreakdown>;
  label?: (item: AnalyticsBreakdown) => string;
}) {
  const rows = [...items]
    .sort(
      (first, second) =>
        getBreakdownAmount(second, preferred) -
        getBreakdownAmount(first, preferred),
    )
    .slice(0, 7);
  const total = rows.reduce(
    (sum, item) =>
      sum + Math.max(0, getBreakdownAmount(item, preferred)),
    0,
  );

  return (
    <article className="card-shell p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary/15 text-primary-light">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
          <p className="mt-1 text-xs text-on-surface-muted">{description}</p>
        </div>
      </div>

      {rows.length ? (
        <div className="mt-5 flex flex-col gap-4">
          {rows.map((item, index) => {
            const amount = getBreakdownAmount(item, preferred);
            const share = total ? (Math.max(0, amount) / total) * 100 : 0;

            return (
              <div key={`${label(item)}-${index}`}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="truncate font-medium text-on-surface">
                    {label(item)}
                  </span>
                  <span className="shrink-0 font-semibold text-on-surface">
                    {formatMoney(amount)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(2, share)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-32 items-center justify-center px-5 py-8 text-center text-sm text-on-surface-muted">
          Brak danych dla tego zestawienia.
        </div>
      )}
    </article>
  );
}
