"use client";

import { useState, type ReactNode } from "react";
import { Copy, Loader2, Plus, X } from "lucide-react";
import { Tooltip } from "@/app/components/ui/tooltip";
import type { AvailabilityDayMode, AvailabilityRange } from "@/app/lib/availability";
import { formatRange, sortRanges, suggestNextRange, toMinutes, validateRanges } from "@/app/lib/availability-time";
import { isDraftComplete, type DayDraft } from "@/app/lib/availability-days";
import { TimeField } from "./TimeField";

export type DayModeOption = { value: AvailabilityDayMode; label: string };

export const WEEK_DAY_MODES: readonly DayModeOption[] = [
  { value: "Template", label: "Jak zwykle" },
  { value: "Custom", label: "Inne godziny" },
  { value: "Off", label: "Wolne" },
];

export const TEMPLATE_DAY_MODES: readonly DayModeOption[] = [
  { value: "Custom", label: "Godziny" },
  { value: "Off", label: "Wolne" },
];

/** Placed in a row's `action` slot: copies that day's setting onto the following days. */
export function CopyToNextDaysButton({ weekday, onCopy }: { weekday: string; onCopy: () => void }) {
  return (
    <Tooltip label="Skopiuj te godziny na kolejne dni" align="start">
      <button
        type="button"
        aria-label={`Skopiuj godziny z dnia ${weekday} na kolejne dni`}
        onClick={onCopy}
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-default)] text-on-surface-muted transition hover:bg-surface-container hover:text-primary-light focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]"
      >
        <Copy size={14} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

export function AvailabilityDayRow({
  weekday,
  dateLabel,
  isToday,
  draft,
  templateRanges = [],
  modes,
  readOnly,
  note,
  changed,
  saveState,
  errorMessage,
  onRetry,
  onChange,
  onCommit,
  action,
}: {
  weekday: string;
  dateLabel?: string;
  isToday?: boolean;
  draft: DayDraft;
  /** Hours from the regular schedule, shown for "Jak zwykle". */
  templateRanges?: AvailabilityRange[];
  modes: readonly DayModeOption[];
  /** Shows the hours without any controls (a past day or a locked week). */
  readOnly?: boolean;
  note?: string;
  changed?: boolean;
  saveState?: "saving" | "error" | null;
  /** Why the last save of this day was refused, as the studio's system explained it. */
  errorMessage?: string;
  onRetry?: () => void;
  onChange?: (draft: DayDraft) => void;
  /** Called when the change is complete and should be kept (mode switch, removing hours, leaving the row). */
  onCommit?: (draft: DayDraft) => void;
  action?: ReactNode;
}) {
  const [focusWithin, setFocusWithin] = useState(false);
  const [addedIndex, setAddedIndex] = useState<number | null>(null);
  const errors = draft.mode === "Custom" ? validateRanges(draft.ranges) : [];
  const showErrors = !focusWithin;
  const shownRanges = draft.mode === "Template" ? templateRanges : draft.mode === "Off" ? [] : draft.ranges;

  function update(next: DayDraft, commit: boolean) {
    onChange?.(next);
    if (commit && isDraftComplete(next)) onCommit?.(next);
  }

  function selectMode(mode: AvailabilityDayMode) {
    if (mode === draft.mode) return;
    if (mode !== "Custom") return update({ mode, ranges: [] }, true);
    const ranges = draft.mode === "Template" && templateRanges.length ? templateRanges : draft.ranges.length ? draft.ranges : [suggestNextRange([])];
    update({ mode, ranges: sortRanges(ranges) }, true);
  }

  function setRange(index: number, field: keyof AvailabilityRange, value: string) {
    update({ ...draft, ranges: draft.ranges.map((range, i) => (i === index ? { ...range, [field]: value } : range)) }, false);
  }

  return (
    <div
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setFocusWithin(false);
        setAddedIndex(null);
        if (!readOnly && draft.mode === "Custom" && isDraftComplete(draft)) onCommit?.({ ...draft, ranges: sortRanges(draft.ranges) });
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          event.target.blur();
        }
      }}
      className={[
        "grid gap-3 rounded-[var(--radius-lg)] bg-surface-container-low p-3 transition md:items-start md:gap-4 md:p-4",
        readOnly && !note ? "md:grid-cols-[7.5rem_minmax(0,1fr)]" : "md:grid-cols-[7.5rem_auto_minmax(0,1fr)]",
        changed ? "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary-light)_45%,transparent)]" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3 md:block">
        <div className="flex items-baseline gap-2 md:block">
          <p className={`text-sm font-semibold capitalize ${isToday ? "text-primary-light" : "text-on-surface"}`}>{weekday}</p>
          {dateLabel ? <p className="text-xs text-on-surface-muted md:mt-0.5">{dateLabel}</p> : null}
        </div>
        <div className="flex items-center gap-1 md:mt-2 md:-ml-2">
          {saveState ? <span className="md:pl-2"><SaveState state={saveState} onRetry={onRetry} /></span> : action}
        </div>
      </div>

      {readOnly ? (
        note ? (
          // An invisible copy of the switch keeps the hours aligned with the editable days.
          <div className="relative md:self-start">
            <div aria-hidden="true" className="invisible hidden p-1 md:flex">
              {modes.map((mode) => <span key={mode.value} className="h-9 whitespace-nowrap px-3 text-xs font-semibold">{mode.label}</span>)}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted md:absolute md:inset-y-0 md:left-3 md:flex md:items-center">{note}</p>
          </div>
        ) : null
      ) : (
        <div role="group" aria-label={`Dostępność: ${weekday}`} className="flex rounded-[var(--radius-lg)] bg-surface-container p-1 md:self-start">
          {modes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              aria-pressed={draft.mode === mode.value}
              onClick={() => selectMode(mode.value)}
              className={[
                "h-9 flex-1 whitespace-nowrap rounded-[var(--radius-default)] px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)] md:flex-none",
                draft.mode === mode.value ? "bg-primary text-on-primary shadow-soft" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
              ].join(" ")}
            >
              {mode.label}
            </button>
          ))}
        </div>
      )}

      <div className="min-w-0 space-y-2">
        {!readOnly && draft.mode === "Custom" ? (
          <div className="flex flex-wrap items-start gap-2">
            {draft.ranges.map((range, index) => (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 rounded-[var(--radius-lg)] bg-surface-container p-1">
                  <TimeField label={`${weekday}, przedział ${index + 1}: od`} value={range.start} invalid={showErrors && Boolean(errors[index])} autoFocus={addedIndex === index} onChange={(value) => setRange(index, "start", value)} />
                  <span aria-hidden="true" className="text-on-surface-muted">–</span>
                  <TimeField label={`${weekday}, przedział ${index + 1}: do`} value={range.end} invalid={showErrors && Boolean(errors[index])} onChange={(value) => setRange(index, "end", value)} />
                  <button
                    type="button"
                    onClick={() => update({ ...draft, ranges: draft.ranges.filter((_, i) => i !== index) }, true)}
                    aria-label={`Usuń przedział ${index + 1}`}
                    className="flex h-10 w-9 items-center justify-center rounded-[var(--radius-default)] text-on-surface-muted transition hover:bg-surface-container-high hover:text-error-light focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>
                {showErrors && errors[index] ? <p className="max-w-[15rem] text-xs leading-5 text-error-light">{errors[index]}</p> : null}
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setAddedIndex(draft.ranges.length);
                update({ ...draft, ranges: [...draft.ranges, suggestNextRange(draft.ranges)] }, false);
              }}
              className="flex h-12 items-center gap-1.5 rounded-[var(--radius-lg)] px-3 text-xs font-semibold text-primary-light transition hover:bg-surface-container focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]"
            >
              <Plus size={15} aria-hidden="true" /> Dodaj godziny
            </button>
            {!draft.ranges.length ? <p className="w-full text-xs text-warning-light">Dodaj godziny albo wybierz „Wolne”.</p> : null}
          </div>
        ) : (
          <ReadOnlyRanges ranges={shownRanges} mode={draft.mode} readOnly={readOnly} />
        )}
        <DayTimeline ranges={shownRanges.filter((_, index) => draft.mode !== "Custom" || !errors[index])} muted={draft.mode === "Template" && !readOnly} />
        {errorMessage ? <p role="alert" className="text-xs leading-5 text-error-light">{errorMessage}</p> : null}
      </div>
    </div>
  );
}

function ReadOnlyRanges({ ranges, mode, readOnly }: { ranges: AvailabilityRange[]; mode: AvailabilityDayMode; readOnly?: boolean }) {
  if (!ranges.length) {
    return (
      <p className="flex min-h-10 items-center text-sm text-on-surface-muted">
        {mode === "Template" && !readOnly ? "Brak godzin w stałym grafiku" : "Wolne"}
      </p>
    );
  }
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5">
      {sortRanges(ranges).map((range) => (
        <span
          key={`${range.start}-${range.end}`}
          className={[
            "rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums",
            mode === "Template" && !readOnly ? "bg-surface-container text-on-surface-variant" : "bg-primary/15 text-primary-light",
          ].join(" ")}
        >
          {formatRange(range)}
        </span>
      ))}
    </div>
  );
}

function DayTimeline({ ranges, muted }: { ranges: AvailabilityRange[]; muted?: boolean }) {
  const day = 24 * 60;
  return (
    <div aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-full bg-surface-container">
      {[6, 12, 18].map((hour) => (
        <span key={hour} className="absolute inset-y-0 w-px bg-white/10" style={{ left: `${(hour / 24) * 100}%` }} />
      ))}
      {ranges.map((range) => {
        const start = toMinutes(range.start);
        const end = toMinutes(range.end);
        if (start === null || end === null || end <= start) return null;
        return (
          <span
            key={`${range.start}-${range.end}`}
            className={`absolute inset-y-0 rounded-full ${muted ? "bg-on-surface-muted/60" : "bg-primary-light"}`}
            style={{ left: `${(start / day) * 100}%`, width: `${((end - start) / day) * 100}%` }}
          />
        );
      })}
    </div>
  );
}

function SaveState({ state, onRetry }: { state?: "saving" | "error" | null; onRetry?: () => void }) {
  if (state === "saving") {
    return (
      <span role="status" className="flex items-center gap-1.5 text-xs text-on-surface-muted">
        <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Zapisuję…
      </span>
    );
  }
  if (state === "error") {
    return (
      <span role="alert" className="flex items-center gap-2 whitespace-nowrap text-xs text-error-light">
        Nie zapisano
        {onRetry ? <button type="button" onClick={onRetry} className="font-semibold underline-offset-2 hover:underline">Ponów</button> : null}
      </span>
    );
  }
  return null;
}
