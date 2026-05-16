"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatDateControlLabel,
  toDateInputValue,
} from "../date-utils";
import type { ScheduleView } from "../types";

export function ViewSwitch({
  value,
  onChange,
}: {
  value: ScheduleView;
  onChange: (value: ScheduleView) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container p-1">
      {(["day", "week"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={[
            "h-10 rounded-[10px] px-4 text-sm font-semibold transition",
            value === item
              ? "bg-primary text-on-primary shadow-soft"
              : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
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
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container p-1">
      <button
        type="button"
        onClick={() => onMove(-1)}
        className="flex h-10 w-10 items-center justify-center rounded-[10px] text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
        aria-label="Poprzedni zakres"
      >
        <ChevronLeft size={18} />
      </button>

      <div
        className={[
          "flex h-10 items-center justify-center rounded-[10px] bg-surface-container-low text-sm font-semibold text-on-surface",
          view === "day" ? "min-w-[170px]" : "min-w-[220px] gap-2 px-3",
        ].join(" ")}
      >
        {view === "day" ? (
          <label className="relative flex h-full w-full cursor-pointer items-center justify-center gap-2 px-3">
            <CalendarDays size={16} className="text-primary-light" />
            <span className="min-w-[92px] text-center tabular-nums">
              {formatDateControlLabel(anchorDate)}
            </span>
            <input
              type="date"
              aria-label="Wybierz dzień"
              value={toDateInputValue(anchorDate)}
              onChange={(event) =>
                onDateChange(new Date(`${event.target.value}T12:00:00`))
              }
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        ) : (
          <>
            <CalendarDays size={16} className="text-primary-light" />
            <span className="whitespace-nowrap">{periodLabel}</span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => onMove(1)}
        className="flex h-10 w-10 items-center justify-center rounded-[10px] text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
        aria-label="Następny zakres"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
