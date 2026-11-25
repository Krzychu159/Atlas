"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { AvailabilityScheduleTrainer, AvailabilitySlot } from "@/app/lib/availability";
import { formatDayLabel, formatTime, toMinutes } from "@/app/lib/availability-time";
import { getOutlookColor } from "@/app/lib/calendar/outlook-colors";

const HOUR_HEIGHT = 56;
const PX_PER_MINUTE = HOUR_HEIGHT / 60;
const GUTTER = 52;
const GRID_LINES = `repeating-linear-gradient(to bottom, rgb(255 255 255 / 0.06) 0 1px, transparent 1px ${HOUR_HEIGHT}px)`;

/** Hours shown: everything any visible trainer has, at least 08:00–20:00. */
function hourRange(trainers: AvailabilityScheduleTrainer[], days: string[]) {
  let start = 8 * 60;
  let end = 20 * 60;
  for (const trainer of trainers) {
    for (const day of trainer.days) {
      if (!days.includes(day.date)) continue;
      for (const item of [...day.availability, ...day.busy]) {
        const from = toMinutes(item.start);
        const to = toMinutes(item.end);
        if (from !== null) start = Math.min(start, from);
        if (to !== null) end = Math.max(end, to);
      }
    }
  }
  return { startHour: Math.floor(start / 60), endHour: Math.min(24, Math.ceil(end / 60)) };
}

export function AvailabilityGrid({
  days,
  trainers,
  isLoading,
  today,
  onSelectSession,
  onSelectFree,
}: {
  /** yyyy-MM-dd, in order. */
  days: string[];
  trainers: AvailabilityScheduleTrainer[];
  isLoading: boolean;
  today: string;
  /** Without the handlers the calendar is read-only (the trainer's view of the team). */
  onSelectSession?: (sessionId: number) => void;
  onSelectFree?: (trainer: AvailabilityScheduleTrainer, date: string, slot: AvailabilitySlot) => void;
}) {
  const isWeek = days.length > 1;
  const [mobileDay, setMobileDay] = useState<string | null>(null);
  const activeMobileDay = mobileDay && days.includes(mobileDay) ? mobileDay : days.includes(today) ? today : days[0];
  const { startHour, endHour } = useMemo(() => hourRange(trainers, days), [trainers, days]);
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT;
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  // Names fit on the cards when each trainer has a wide lane.
  const roomy = !isWeek || trainers.length <= 2;
  const laneMin = isWeek ? 30 : 120;
  const dayMin = Math.max(isWeek ? 150 : 0, trainers.length * laneMin);
  const gridStyle = {
    "--cols": `${GUTTER}px repeat(${days.length}, minmax(${dayMin}px, 1fr))`,
    "--cols-mobile": `${GUTTER - 8}px minmax(${Math.max(trainers.length * (isWeek ? 44 : laneMin), 200)}px, 1fr)`,
  } as CSSProperties;

  return (
    <section aria-busy={isLoading} className="card-shell relative overflow-hidden">
      {isWeek ? (
        <div role="tablist" aria-label="Dzień tygodnia" className="flex gap-1 overflow-x-auto bg-surface-container-low p-2 md:hidden">
          {days.map((date) => {
            const label = formatDayLabel(date);
            const active = date === activeMobileDay;
            return (
              <button key={date} type="button" role="tab" aria-selected={active} onClick={() => setMobileDay(date)}
                className={[
                  "flex min-w-[48px] flex-1 flex-col items-center rounded-[var(--radius-md)] px-2 py-2 transition",
                  active ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container",
                ].join(" ")}>
                <span className="text-[11px] font-semibold uppercase tracking-wider">{label.weekday}</span>
                <span className={`mt-0.5 text-base font-semibold ${date === today && !active ? "text-primary-light" : ""}`}>{label.day}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {isLoading ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-0.5 animate-pulse bg-primary-light" role="status">
          <span className="sr-only">Wczytywanie dyspozycji…</span>
        </div>
      ) : null}

      {!trainers.length && !isLoading ? (
        <p className="p-8 text-center text-sm text-on-surface-variant">Brak trenerów do pokazania. Zmień lokalizację albo filtr trenera.</p>
      ) : (
        <div className="relative h-[min(1000px,calc(100dvh-260px))] min-h-[460px] overflow-auto overscroll-contain">
          <div style={gridStyle} className="grid min-w-full grid-cols-[var(--cols-mobile)] md:grid-cols-[var(--cols)]">
            <div className="sticky left-0 top-0 z-30 bg-surface-container" />
            {days.map((date) => {
              const label = formatDayLabel(date);
              const isToday = date === today;
              return (
                <div key={date} className={[
                  "sticky top-0 z-20 border-b border-l border-white/[0.06] bg-surface-container px-2 py-2",
                  date === activeMobileDay ? "" : "max-md:hidden",
                ].join(" ")}>
                  <div className="flex items-center gap-2 px-1">
                    <span className={[
                      "flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-default)] px-1 font-display text-base font-semibold tabular-nums",
                      isToday ? "bg-primary text-on-primary" : "text-on-surface",
                    ].join(" ")}>{label.day}</span>
                    <span className={`text-sm font-semibold capitalize ${isToday ? "text-primary-light" : "text-on-surface"}`}>{label.weekday}</span>
                  </div>
                  {roomy ? (
                    <div className="mt-2 flex gap-1">
                      {trainers.map((trainer) => (
                        <span key={trainer.trainerId} className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[var(--radius-default)] bg-surface-container-low px-2 py-1 text-[11px] font-semibold text-on-surface-variant">
                          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: getOutlookColor(trainer.outlookCategoryColor).bg }} />
                          <span className="truncate">{trainer.name}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="sticky left-0 z-10 bg-surface-container" style={{ height: totalHeight }}>
              {hours.map((hour, index) => (
                <span key={hour} className="absolute right-2 text-[11px] font-medium tabular-nums text-on-surface-muted" style={{ top: index === 0 ? 4 : index * HOUR_HEIGHT - 7 }}>
                  {`${String(hour).padStart(2, "0")}:00`}
                </span>
              ))}
            </div>
            {days.map((date) => (
              <div key={date}
                className={[
                  "relative flex border-l border-white/[0.06]",
                  date === today ? "bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]" : "",
                  date === activeMobileDay ? "" : "max-md:hidden",
                  isLoading ? "opacity-60" : "",
                ].join(" ")}
                style={{ height: totalHeight, backgroundImage: GRID_LINES }}>
                {trainers.map((trainer) => (
                  <TrainerLane key={trainer.trainerId} trainer={trainer} date={date} startHour={startHour} roomy={roomy}
                    onSelectSession={onSelectSession} onSelectFree={onSelectFree} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/[0.06] px-4 py-2.5 text-xs text-on-surface-muted">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-on-surface-muted/30" />Dyspozycja (kolor trenera)</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-3 rounded-[3px] border border-dashed border-white/60" />
          {onSelectFree ? "Przerywana ramka — kliknij, aby dodać zajęcia" : "Przerywana ramka — czas w dyspozycji bez zajęć"}
        </span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-on-surface-muted ring-1 ring-white/20" />Sesja (pełny kolor)</span>
      </div>
    </section>
  );
}

function TrainerLane({
  trainer,
  date,
  startHour,
  roomy,
  onSelectSession,
  onSelectFree,
}: {
  trainer: AvailabilityScheduleTrainer;
  date: string;
  startHour: number;
  roomy: boolean;
  onSelectSession?: (sessionId: number) => void;
  onSelectFree?: (trainer: AvailabilityScheduleTrainer, date: string, slot: AvailabilitySlot) => void;
}) {
  const day = trainer.days.find((item) => item.date === date);
  const color = getOutlookColor(trainer.outlookCategoryColor);
  const position = (start: string, end: string) => {
    const from = toMinutes(start) ?? 0;
    const to = toMinutes(end) ?? from;
    return { top: (from - startHour * 60) * PX_PER_MINUTE, height: Math.max((to - from) * PX_PER_MINUTE, 6) };
  };

  return (
    <div className="relative min-w-0 flex-1 border-l border-white/[0.03] first:border-l-0" aria-label={`${trainer.name}, ${date}`}>
      {day?.availability.map((range) => {
        const { top, height } = position(range.start, range.end);
        return (
          <div key={`a-${range.start}`} aria-hidden="true" className="absolute inset-x-[2px] rounded-[6px]"
            style={{ top: top + 1, height: height - 2, background: `color-mix(in srgb, ${color.bg} 45%, transparent)`, boxShadow: `inset 2px 0 0 color-mix(in srgb, ${color.bg} 80%, white)` }} />
        );
      })}
      {day?.free.map((slot) => {
        const { top, height } = position(slot.start, slot.end);
        const label = `${trainer.name} · dyspozycja ${formatTime(slot.start)}–${formatTime(slot.end)}`;
        const style = { top: top + 2, height: height - 4 };
        const content = roomy && height > 30 ? (
          <span className="px-2 py-1 text-[11px] font-semibold tabular-nums text-white/80 group-hover:text-on-surface">
            Dyspozycja {formatTime(slot.start)}–{formatTime(slot.end)}
          </span>
        ) : null;
        const shape = "group absolute inset-x-[3px] flex items-start justify-start overflow-hidden rounded-[6px] border border-dashed border-white/55 text-left";
        return onSelectFree ? (
          <button key={`f-${slot.startAt}`} type="button" title={label} aria-label={`${label}. Dodaj zajęcia`}
            onClick={() => onSelectFree(trainer, date, slot)}
            className={`${shape} transition hover:border-primary-light hover:bg-primary/20 focus-visible:border-primary-light focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]`}
            style={style}>
            {content}
          </button>
        ) : (
          <div key={`f-${slot.startAt}`} title={label} className={shape} style={style}>{content}</div>
        );
      })}
      {day?.busy.map((busy) => {
        const { top, height } = position(busy.start, busy.end);
        // Another trainer's session comes without a title, so a colleague only sees that the time is taken.
        const title = busy.title ?? "Zajęte";
        const hint = `${trainer.name} · ${formatTime(busy.start)}–${formatTime(busy.end)} · ${title}`;
        const style = { top: top + 1, height: height - 2, background: color.bg, boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.18)" };
        const content = roomy && height > 18 ? (
          <>
            <span className="block truncate pl-1 font-semibold">{title}</span>
            {height > 34 ? <span className="block pl-1 tabular-nums text-white/70">{formatTime(busy.start)}–{formatTime(busy.end)}</span> : null}
          </>
        ) : null;
        const shape = "absolute inset-x-[3px] z-[1] overflow-hidden rounded-[6px] px-1.5 py-0.5 text-left text-[11px] leading-4 text-white";
        return onSelectSession ? (
          <button key={`b-${busy.sessionId}`} type="button" title={hint}
            aria-label={`${trainer.name}, ${formatTime(busy.start)}–${formatTime(busy.end)}: ${title}`}
            onClick={() => onSelectSession(busy.sessionId)}
            className={`${shape} transition hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light`}
            style={style}>
            {content}
          </button>
        ) : (
          <div key={`b-${busy.sessionId}`} title={hint} className={shape} style={style}>{content}</div>
        );
      })}
    </div>
  );
}
