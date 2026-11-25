"use client";

import type { AvailabilityScheduleTrainer } from "@/app/lib/availability";
import { getOutlookColor } from "@/app/lib/calendar/outlook-colors";

const statusLabels = {
  Open: { label: "Do potwierdzenia", className: "text-warning-light" },
  Submitted: { label: "Potwierdzony", className: "text-tertiary-light" },
  Missed: { label: "Brak potwierdzenia", className: "text-error-light" },
} as const;

const chip =
  "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]";
const chipState = (active: boolean) =>
  active ? "bg-primary/20 text-on-surface ring-1 ring-primary-light/60" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface";

/**
 * Trainers above the availability calendar. Several can be picked at once (e.g. two candidates for a
 * substitute); none picked means everybody. With `statusWeek` each chip also shows that week's confirmation.
 */
export function TrainerStrip({
  trainers,
  selectedIds,
  onChange,
  statusWeek,
  loading,
}: {
  trainers: AvailabilityScheduleTrainer[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  statusWeek?: string;
  loading?: boolean;
}) {
  if (loading && !trainers.length) return <span className="h-9 w-64 animate-pulse rounded-full bg-surface-container" aria-hidden="true" />;
  return (
    <div role="group" aria-label="Pokaż trenerów" className="flex flex-wrap gap-1.5">
      <button type="button" aria-pressed={!selectedIds.length} onClick={() => onChange([])} className={`${chip} ${chipState(!selectedIds.length)}`}>
        Wszyscy
      </button>
      {trainers.map((trainer) => {
        const active = selectedIds.includes(trainer.trainerId);
        const week = statusWeek ? trainer.weeks.find((item) => item.weekStart === statusWeek) : undefined;
        const status = week ? statusLabels[week.status] : null;
        return (
          <button key={trainer.trainerId} type="button" aria-pressed={active}
            title={active ? `Ukryj: ${trainer.name}` : `Pokaż: ${trainer.name}`}
            onClick={() => onChange(active ? selectedIds.filter((id) => id !== trainer.trainerId) : [...selectedIds, trainer.trainerId])}
            className={`${chip} ${chipState(active)}`}>
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: getOutlookColor(trainer.outlookCategoryColor).bg }} />
            {trainer.name}
            {status ? (
              <span className={`font-medium ${status.className}`}>
                · {status.label}{week?.status === "Submitted" && week.submittedAfterDeadline ? " po terminie" : ""}
              </span>
            ) : null}
            {week?.hasPendingChangeRequest ? <span className="font-medium text-warning-light">· prośba</span> : null}
          </button>
        );
      })}
    </div>
  );
}
