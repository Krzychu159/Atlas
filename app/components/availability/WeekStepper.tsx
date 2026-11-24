"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysIso, formatWeekRange, mondayOf, studioToday } from "@/app/lib/availability-time";

const iconButton =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-default)] text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent";

/** Previous / next week between two Mondays, with "Ten tydzień" / "Przyszły tydzień" next to the dates. */
export function WeekStepper({
  weekStart,
  minWeek,
  maxWeek,
  onChange,
  className = "",
}: {
  weekStart: string;
  minWeek: string;
  maxWeek: string;
  onChange: (weekStart: string) => void;
  className?: string;
}) {
  const thisWeek = mondayOf(studioToday());
  const hint = weekStart === thisWeek ? "Ten tydzień" : weekStart === addDaysIso(thisWeek, 7) ? "Przyszły tydzień" : null;
  return (
    <div className={`flex min-w-0 items-center gap-1 rounded-[var(--radius-lg)] bg-surface-container p-1 ${className}`}>
      <button type="button" className={iconButton} aria-label="Poprzedni tydzień" disabled={weekStart <= minWeek} onClick={() => onChange(addDaysIso(weekStart, -7))}>
        <ChevronLeft size={18} />
      </button>
      <div className="flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-[var(--radius-default)] bg-surface-container-low px-3 text-sm font-semibold text-on-surface sm:min-w-[240px]">
        <CalendarDays size={16} className="shrink-0 text-primary-light" aria-hidden="true" />
        <span className="truncate">{formatWeekRange(weekStart)}</span>
        {hint ? <span className="hidden text-xs font-medium text-on-surface-muted sm:inline">· {hint}</span> : null}
      </div>
      <button type="button" className={iconButton} aria-label="Następny tydzień" disabled={weekStart >= maxWeek} onClick={() => onChange(addDaysIso(weekStart, 7))}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
