"use client";

import { NativeDateInput } from "@/app/components/ui/native-date-input";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  isSameDay,
  startOfWeek,
  toDateInputValue,
} from "../date-utils";
import type { ScheduleView } from "../types";

const segmentClassName =
  "h-10 rounded-[var(--radius-default)] px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]";

export function ViewSwitch({
  value,
  onChange,
}: {
  value: ScheduleView;
  onChange: (value: ScheduleView) => void;
}) {
  return (
    <div role="group" aria-label="Widok grafiku" className="flex items-center gap-1 rounded-[var(--radius-lg)] bg-surface-container p-1">
      {(["day", "week"] as const).map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={value === item}
          onClick={() => onChange(item)}
          className={[
            segmentClassName,
            "flex-1 sm:flex-none",
            value === item
              ? "bg-primary text-on-primary shadow-soft"
              : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
          ].join(" ")}
        >
          {item === "day" ? "Dzień" : "Tydzień"}
        </button>
      ))}
    </div>
  );
}

export function DateNavigator({
  view,
  anchorDate,
  periodLabel,
  onDateChange,
  onMove,
}: {
  view: ScheduleView;
  anchorDate: Date;
  periodLabel: string;
  onDateChange: (value: Date) => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const today = new Date();
  const showsToday = view === "day" ? isSameDay(anchorDate, today) : isSameDay(startOfWeek(anchorDate), startOfWeek(today));
  const iconButtonClassName =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-default)] text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]";

  return (
    <div className="flex items-center gap-1 rounded-[var(--radius-lg)] bg-surface-container p-1">
      <button
        type="button"
        onClick={() => onMove(-1)}
        className={iconButtonClassName}
        aria-label={view === "day" ? "Poprzedni dzień" : "Poprzedni tydzień"}
      >
        <ChevronLeft size={18} />
      </button>

      <div
        className={[
          "flex h-10 min-w-0 flex-1 items-center justify-center rounded-[var(--radius-default)] bg-surface-container-low text-sm font-semibold text-on-surface",
          view === "day" ? "sm:w-[190px] sm:flex-none" : "gap-2 px-3 sm:min-w-[200px]",
        ].join(" ")}
      >
        {view === "day" ? (
          <NativeDateInput type="date" aria-label="Wybierz dzień"
            value={toDateInputValue(anchorDate)}
            onChange={(event) => { if (event.target.value) onDateChange(new Date(`${event.target.value}T12:00:00`)); }}
            className="h-10 w-full rounded-[var(--radius-default)] bg-transparent px-3 text-sm font-semibold" />
        ) : (
          <>
            <CalendarDays size={16} className="shrink-0 text-primary-light" />
            <span className="truncate whitespace-nowrap">{periodLabel}</span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => onMove(1)}
        className={iconButtonClassName}
        aria-label={view === "day" ? "Następny dzień" : "Następny tydzień"}
      >
        <ChevronRight size={18} />
      </button>

      <button
        type="button"
        onClick={() => onDateChange(new Date())}
        disabled={showsToday}
        className="h-10 shrink-0 rounded-[var(--radius-default)] px-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)] disabled:cursor-default disabled:opacity-45 disabled:hover:bg-transparent"
      >
        Dziś
      </button>
    </div>
  );
}
