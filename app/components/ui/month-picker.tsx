"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatMonthValue,
  isMonthInRange,
  parseMonthValue,
  polishMonthNames,
  shiftMonthValue,
  toMonthValue,
} from "@/app/lib/formatters/month";
import {
  openNativePicker,
  pickerFooterButtonClassName,
  pickerNavButtonClassName,
  PickerPanel,
  prefersNativePicker,
  usePickerPopover,
} from "./picker-popover";

type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name, e.g. "Miesiąc rozliczenia". */
  ariaLabel: string;
  min?: string;
  max?: string;
  id?: string;
  disabled?: boolean;
  align?: "start" | "end";
  /** Classes of the visible trigger button. */
  className?: string;
  icon?: ReactNode;
};

function currentMonthValue() {
  const now = new Date();
  return toMonthValue(now.getFullYear(), now.getMonth() + 1);
}

// Month field that always reads in Polish. Mouse users get the ATLAS popover;
// touch devices open the system picker of the hidden native input.
export function MonthPicker({ value, onChange, ariaLabel, min, max, id, disabled = false, align = "start", className, icon }: MonthPickerProps) {
  const { open, host, show, close, rootRef, triggerRef } = usePickerPopover();
  const nativeRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(value);
  const focusCursor = useRef(false);
  const dialogId = useId();
  const label = formatMonthValue(value);
  const today = currentMonthValue();
  const cursorYear = parseMonthValue(cursor)?.year ?? parseMonthValue(today)?.year ?? 2026;

  useEffect(() => {
    if (!open || !focusCursor.current) return;
    focusCursor.current = false;
    document.querySelector<HTMLButtonElement>(`#${CSS.escape(dialogId)} [data-month="${cursor}"]`)?.focus();
  }, [open, cursor, dialogId]);

  function initialCursor() {
    if (isMonthInRange(value, min, max)) return value;
    if (isMonthInRange(today, min, max)) return today;
    return max && today > max ? max : min ?? today;
  }

  function toggle() {
    if (disabled) return;
    if (open) { close(); return; }
    if (prefersNativePicker() && openNativePicker(nativeRef.current)) return;
    focusCursor.current = true;
    setCursor(initialCursor());
    show();
  }

  function select(next: string) {
    if (!isMonthInRange(next, min, max)) return;
    close();
    if (next !== value) onChange(next);
  }

  // Year buttons clamp to the allowed range; arrow keys never land on a disabled month.
  function moveCursor(delta: number, { clamp = false, focus = true } = {}) {
    let next = shiftMonthValue(cursor, delta);
    if (next && clamp) next = min && next < min ? min : max && next > max ? max : next;
    if (!next || !isMonthInRange(next, min, max)) return;
    focusCursor.current = focus;
    setCursor(next);
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const deltas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, PageUp: -12, PageDown: 12 };
    const delta = deltas[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    moveCursor(delta);
  }

  const canPrevYear = !min || toMonthValue(cursorYear - 1, 12) >= min;
  const canNextYear = !max || toMonthValue(cursorYear + 1, 1) <= max;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={`${ariaLabel}: ${label}`}
        className={className ?? "flex h-12 w-full items-center gap-3 rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest px-4 text-left text-sm font-semibold text-on-surface transition hover:border-white/10 hover:bg-surface-container-low focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_24%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {icon === undefined ? <CalendarDays size={17} aria-hidden="true" className="shrink-0 text-primary-light" /> : icon}
      </button>
      <input
        ref={nativeRef}
        type="month"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => { if (isMonthInRange(event.target.value, min, max) && event.target.value !== value) onChange(event.target.value); }}
        className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
      />
      {host ? (
        <PickerPanel host={host} anchorRef={rootRef} id={dialogId} label={ariaLabel} align={align} onClose={close} className="w-[288px]">
          <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="Poprzedni rok" disabled={!canPrevYear} onClick={() => moveCursor(-12, { clamp: true, focus: false })} className={pickerNavButtonClassName}>
              <ChevronLeft size={17} />
            </button>
            <p aria-live="polite" className="font-display text-base font-semibold tabular-nums text-on-surface">{cursorYear}</p>
            <button type="button" aria-label="Następny rok" disabled={!canNextYear} onClick={() => moveCursor(12, { clamp: true, focus: false })} className={pickerNavButtonClassName}>
              <ChevronRight size={17} />
            </button>
          </div>
          <div role="group" aria-label={`Miesiące ${cursorYear}`} onKeyDown={handleGridKeyDown} className="mt-2 grid grid-cols-3 gap-1.5">
            {polishMonthNames.map(({ month, short, long }) => {
              const monthValue = toMonthValue(cursorYear, month);
              const selected = monthValue === value;
              const current = monthValue === today;
              const available = isMonthInRange(monthValue, min, max);
              return (
                <button
                  key={month}
                  type="button"
                  data-month={monthValue}
                  tabIndex={monthValue === cursor ? 0 : -1}
                  disabled={!available}
                  aria-pressed={selected}
                  aria-current={current ? "date" : undefined}
                  aria-label={`${long} ${cursorYear}`}
                  onClick={() => select(monthValue)}
                  className={[
                    "h-10 rounded-[var(--radius-md)] text-sm font-semibold capitalize transition focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-35",
                    selected ? "bg-primary text-on-primary" : current ? "bg-primary/15 text-primary-light hover:bg-primary/25" : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface",
                  ].join(" ")}
                >
                  {short}
                </button>
              );
            })}
          </div>
          {isMonthInRange(today, min, max) ? (
            <div className="mt-2 flex justify-end border-t border-white/5 pt-2">
              <button type="button" onClick={() => select(today)} className={pickerFooterButtonClassName}>
                Bieżący miesiąc
              </button>
            </div>
          ) : null}
        </PickerPanel>
      ) : null}
    </div>
  );
}
