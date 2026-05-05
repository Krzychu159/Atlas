import { Banknote, TrendingUp } from "lucide-react";

export default function DashboardRevenueCard() {
  return (
    <div className="card-shell p-6 relative overflow-hidden">
      <div className="absolute right-0 top-0 h-full w-[55%] bg-[radial-gradient(circle_at_top_right,rgba(0,82,255,0.14),transparent_60%)]" />

      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-[var(--radius-lg)] bg-primary/15 text-primary-light flex items-center justify-center">
            <Banknote size={20} />
          </div>
          <p className="text-section-title">Przychód </p>
        </div>

        <p className="mt-6 text-[2.45rem] leading-none font-semibold tracking-tight">
          2 236,45 zł
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="bg-surface-container-low rounded-[var(--radius-lg)] p-4">
            <div className="flex items-center gap-2 text-tertiary-light">
              <TrendingUp size={15} />
              <p className="text-sm font-semibold">+18%</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-on-surface-variant">
              Wczoraj
            </p>
          </div>

          <div className="bg-surface-container-low rounded-[var(--radius-lg)] p-4">
            <div className="flex items-center gap-2 text-primary-light">
              <TrendingUp size={15} />
              <p className="text-sm font-semibold">+32%</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-on-surface-variant">
              Ostatni miesiąc
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
