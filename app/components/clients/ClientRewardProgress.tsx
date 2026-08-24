import { CalendarDays, Info } from "lucide-react";
import {
  CLIENT_REWARD_MILESTONES,
  getClientRewardProgress,
} from "@/app/lib/clients/rewards";

export default function ClientRewardProgress({
  trainingStartDate,
}: {
  trainingStartDate?: string | null;
}) {
  const { completedMonths, progressPercent, hasTrainingStartDate } =
    getClientRewardProgress(trainingStartDate);
  const tooltip = hasTrainingStartDate
    ? "Nagrody odblokowują się co 6 miesięcy, do 24. miesiąca treningów."
    : "Ustaw datę rozpoczęcia treningów, aby rozpocząć naliczanie nagród.";
  const monthsLabel = hasTrainingStartDate
    ? completedMonths >= 24
      ? "24+ mies."
      : `${completedMonths} mies.`
    : "Brak daty";

  return (
    <div className="min-w-0" title={tooltip}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-primary-light" />
          <p className="text-label text-on-surface-muted">Nagrody</p>
          <Info
            size={13}
            className="text-on-surface-muted"
            aria-label={tooltip}
          />
        </div>
        <p className="shrink-0 text-xs font-semibold text-on-surface">
          {monthsLabel}
        </p>
      </div>

      <div className="relative mt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-container-low"
          role="progressbar"
          aria-label="Postęp do 24 miesięcy treningów"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <div
            className="h-full rounded-full bg-primary-gradient transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {CLIENT_REWARD_MILESTONES.map((milestone) => {
          const reached = completedMonths >= milestone;

          return (
            <span
              key={milestone}
              className={[
                "pointer-events-none absolute top-1/2 h-3 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full",
                reached ? "bg-primary-light" : "bg-white/20",
              ].join(" ")}
              style={{ left: `${(milestone / 24) * 100}%` }}
            />
          );
        })}
      </div>

      <div className="relative mt-2 h-3 text-[9px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {CLIENT_REWARD_MILESTONES.map((milestone) => {
          const reached = completedMonths >= milestone;

          return (
            <span
              key={milestone}
              className={[
                "absolute whitespace-nowrap",
                milestone === 24 ? "-translate-x-full" : "-translate-x-1/2",
                reached ? "text-primary-light" : "",
              ].join(" ")}
              style={{ left: `${(milestone / 24) * 100}%` }}
            >
              {milestone} mies.
            </span>
          );
        })}
      </div>
    </div>
  );
}
