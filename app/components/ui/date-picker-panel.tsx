"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  calendarMonthDays,
  formatCalendarTitle,
  formatDayLabel,
  isWithinBounds,
  parseDateValue,
  polishWeekdays,
  shiftDateMonths,
  shiftDateValue,
  todayDateValue,
} from "@/app/lib/formatters/date-input";
import { pickerFooterButtonClassName, pickerNavButtonClassName } from "./picker-popover";

const MINUTE_STEP = 5;
const pad = (value: number) => String(value).padStart(2, "0");

export function defaultPickerTime(now = new Date()) {
  const minutes = Math.ceil((now.getHours() * 60 + now.getMinutes()) / MINUTE_STEP) * MINUTE_STEP;
  const clamped = Math.min(minutes, 23 * 60 + 55);
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

// Minutes every 5; an exact minute already in the value (e.g. 08:07 from Outlook) stays selectable.
export function minuteOptions(selected?: number) {
  const options = Array.from({ length: 60 / MINUTE_STEP }, (_, index) => index * MINUTE_STEP);
  if (selected !== undefined && !options.includes(selected)) options.push(selected);
  return options.sort((a, b) => a - b);
}

type DatePickerPanelProps = {
  /** Selected day ("YYYY-MM-DD") or "". */
  date: string;
  /** Selected time ("HH:mm") when the field includes time. */
  time?: string | null;
  withTime: boolean;
  min?: string;
  max?: string;
  clearable: boolean;
  onPick: (date: string, time: string | null) => void;
  onClear: () => void;
  onDone: () => void;
};

export function DatePickerPanel({ date, time, withTime, min, max, clearable, onPick, onClear, onDone }: DatePickerPanelProps) {
  const today = todayDateValue();
  const minDay = min?.slice(0, 10);
  const maxDay = max?.slice(0, 10);
  const inRange = (value: string) => isWithinBounds(value, minDay, maxDay);
  const [cursor, setCursor] = useState(() => parseDateValue(date) ? date : inRange(today) ? today : minDay && today < minDay ? minDay : maxDay ?? today);
  const focusCursor = useRef(true);
  const gridRef = useRef<HTMLDivElement>(null);
  const view = parseDateValue(cursor) ?? parseDateValue(today)!;
  const days = calendarMonthDays(view.year, view.month);
  const currentTime = time ?? null;

  useEffect(() => {
    if (!focusCursor.current) return;
    focusCursor.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${cursor}"]`)?.focus();
  }, [cursor]);

  function moveCursor(next: string | null, focus = true) {
    if (!next) return;
    focusCursor.current = focus;
    setCursor(next);
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const weekday = (new Date(`${cursor}T12:00:00Z`).getUTCDay() + 6) % 7;
    const moves: Record<string, () => string | null> = {
      ArrowLeft: () => shiftDateValue(cursor, -1),
      ArrowRight: () => shiftDateValue(cursor, 1),
      ArrowUp: () => shiftDateValue(cursor, -7),
      ArrowDown: () => shiftDateValue(cursor, 7),
      PageUp: () => shiftDateMonths(cursor, event.shiftKey ? -12 : -1),
      PageDown: () => shiftDateMonths(cursor, event.shiftKey ? 12 : 1),
      Home: () => shiftDateValue(cursor, -weekday),
      End: () => shiftDateValue(cursor, 6 - weekday),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveCursor(move());
  }

  function pickDay(value: string) {
    if (!inRange(value)) return;
    onPick(value, withTime ? currentTime ?? defaultPickerTime() : null);
  }

  function pickTime(hour: number, minute: number) {
    const day = parseDateValue(date) ? date : cursor;
    onPick(day, `${pad(hour)}:${pad(minute)}`);
  }

  const [selectedHour, selectedMinute] = currentTime ? currentTime.split(":").map(Number) : [undefined, undefined];
  const prevMonth = shiftDateMonths(cursor, -1);
  const nextMonth = shiftDateMonths(cursor, 1);
  const canPrev = Boolean(prevMonth) && (!minDay || `${prevMonth!.slice(0, 7)}-31` >= minDay);
  const canNext = Boolean(nextMonth) && (!maxDay || `${nextMonth!.slice(0, 7)}-01` <= maxDay);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <div className="w-[264px] shrink-0">
          <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="Poprzedni miesiąc" disabled={!canPrev} onClick={() => moveCursor(prevMonth, false)} className={pickerNavButtonClassName}>
              <ChevronLeft size={17} />
            </button>
            <p aria-live="polite" className="font-display text-sm font-semibold text-on-surface">{formatCalendarTitle(view.year, view.month)}</p>
            <button type="button" aria-label="Następny miesiąc" disabled={!canNext} onClick={() => moveCursor(nextMonth, false)} className={pickerNavButtonClassName}>
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-0.5" aria-hidden="true">
            {polishWeekdays.map((weekday) => (
              <span key={weekday.short} className="flex h-7 items-center justify-center text-[11px] font-semibold uppercase text-on-surface-label">{weekday.short}</span>
            ))}
          </div>
          <div ref={gridRef} role="group" aria-label={formatCalendarTitle(view.year, view.month)} onKeyDown={handleGridKeyDown} className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const selected = day.value === date;
              const isToday = day.value === today;
              const available = inRange(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  data-day={day.value}
                  tabIndex={day.value === cursor ? 0 : -1}
                  disabled={!available}
                  aria-pressed={selected}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={formatDayLabel(day.value)}
                  onClick={() => pickDay(day.value)}
                  className={[
                    "flex h-9 items-center justify-center rounded-[var(--radius-md)] text-sm tabular-nums transition focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-30",
                    selected ? "bg-primary font-semibold text-on-primary" : isToday ? "bg-primary/15 font-semibold text-primary-light hover:bg-primary/25" : day.inMonth ? "text-on-surface hover:bg-white/5" : "text-on-surface-muted hover:bg-white/5",
                  ].join(" ")}
                >
                  {day.day}
                </button>
              );
            })}
          </div>
        </div>
        {withTime ? (
          <div className="flex shrink-0 gap-1 border-l border-white/10 pl-3">
            <TimeColumn label="Godzina" values={Array.from({ length: 24 }, (_, index) => index)} selected={selectedHour}
              onSelect={(hour) => pickTime(hour, selectedMinute ?? 0)} />
            <TimeColumn label="Minuty" values={minuteOptions(selectedMinute)} selected={selectedMinute}
              onSelect={(minute) => pickTime(selectedHour ?? Number(defaultPickerTime().slice(0, 2)), minute)} />
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2">
        {clearable ? <button type="button" onClick={onClear} className={pickerFooterButtonClassName}>Wyczyść</button> : <span />}
        <div className="flex gap-1">
          {inRange(today) ? <button type="button" onClick={() => pickDay(today)} className={pickerFooterButtonClassName}>Dzisiaj</button> : null}
          {withTime ? <button type="button" onClick={onDone} className={`${pickerFooterButtonClassName} bg-primary/15`}>Gotowe</button> : null}
        </div>
      </div>
    </div>
  );
}

function TimeColumn({ label, values, selected, onSelect }: { label: string; values: number[]; selected?: number; onSelect: (value: number) => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (list && active) list.scrollTop = active.offsetTop - list.clientHeight / 2 + active.clientHeight / 2;
  }, [selected]);
  return (
    <div className="flex w-14 flex-col">
      <p className="flex h-9 items-center justify-center text-[11px] font-semibold uppercase tracking-wider text-on-surface-label">{label}</p>
      <div ref={listRef} role="group" aria-label={label} className="relative mt-2 flex h-[256px] flex-col gap-0.5 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent,black_14px,black_calc(100%-14px),transparent)]">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === selected}
            aria-label={`${label}: ${pad(value)}`}
            onClick={() => onSelect(value)}
            className={[
              "flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-sm tabular-nums transition focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]",
              value === selected ? "bg-primary font-semibold text-on-primary" : "text-on-surface hover:bg-white/5",
            ].join(" ")}
          >
            {pad(value)}
          </button>
        ))}
      </div>
    </div>
  );
}
