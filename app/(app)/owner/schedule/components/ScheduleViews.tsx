"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Plus } from "lucide-react";
import type { CalendarSession } from "../types";
import { dayNames, formatFullDate, isSameDay, shortDayNames } from "../date-utils";
import { getHourRange, layoutDay, type PositionedSession } from "../calendar-layout";
import { DEFAULT_SLOT_MINUTES, createSlotPress, roundSlotMinutes, slotStartDate } from "../slot-press";
import SessionBlock, { SESSION_STATUS_DOTS, statusDotClassName } from "./SessionBlock";
import { getSessionStatusLabel } from "../session-utils";

// 60-minute sessions are the norm, so one hour gets enough height for time, client, trainer and location.
const HOUR_HEIGHT = 72;
const PX_PER_MINUTE = HOUR_HEIGHT / 60;
const MIN_BLOCK_HEIGHT = 24;
const GUTTER_WIDTH = 56;
// A day widens for overlapping sessions so each card keeps a readable name; beyond
// MAX_WIDENED_COLUMNS the cards narrow instead of pushing every other day off screen.
const MIN_BLOCK_WIDTH = 96;
const MAX_WIDENED_COLUMNS = 4;
// Wide enough for a 60-minute card to show its trainer and location.
const MIN_DAY_WIDTH = 160;

type ScheduleViewProps<TSession extends CalendarSession> = {
  sessions: TSession[];
  isLoading: boolean;
  selectedSessionId?: TSession["id"] | null;
  pendingSessionId?: TSession["id"] | null;
  onSelectSession: (session: TSession) => void;
  /** `startAt` is set when the user picked a time slot in the grid. */
  onCreateSession?: (date: Date, startAt?: Date) => void;
};

type SlotPress = ReturnType<typeof createSlotPress>;

export function WeekSchedule<TSession extends CalendarSession>({
  days,
  ...props
}: ScheduleViewProps<TSession> & { days: Date[] }) {
  return <TimeGrid days={days} {...props} />;
}

export function DaySchedule<TSession extends CalendarSession>({
  date,
  ...props
}: ScheduleViewProps<TSession> & { date: Date }) {
  const days = useMemo(() => [date], [date]);
  return <TimeGrid days={days} {...props} />;
}

function TimeGrid<TSession extends CalendarSession>({
  days,
  sessions,
  isLoading,
  selectedSessionId,
  pendingSessionId,
  onSelectSession,
  onCreateSession,
}: ScheduleViewProps<TSession> & { days: Date[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // One controller for the whole grid: only one press can be in progress at a time.
  const [slotPress] = useState(() => createSlotPress());
  useEffect(() => {
    const swallowClick = (event: MouseEvent) => {
      if (!slotPress.shouldSuppressClick()) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("click", swallowClick, true);
    return () => {
      document.removeEventListener("click", swallowClick, true);
      slotPress.cancel();
    };
  }, [slotPress]);
  const isWeek = days.length > 1;
  const today = useToday();
  const periodKey = `${days[0]?.toDateString()}:${days.length}`;

  // Phones show one day at a time; the week strip picks which one.
  const [mobileDayKey, setMobileDayKey] = useState<string | null>(null);
  const pickedIndex = days.findIndex((day) => day.toDateString() === mobileDayKey);
  const mobileIndex = pickedIndex >= 0 ? pickedIndex : Math.max(0, days.findIndex((day) => isSameDay(day, today)));

  const { startHour, endHour } = useMemo(() => getHourRange(sessions, days), [sessions, days]);
  const columns = useMemo(
    () =>
      days.map((day) => {
        const items = layoutDay(sessions, day, startHour);
        return { day, items, maxColumns: Math.max(1, ...items.map((item) => item.columns)) };
      }),
    [days, sessions, startHour],
  );
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT;
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const hasAnySession = columns.some((column) => column.items.length > 0);

  const dayWidth = (maxColumns: number) => Math.max(MIN_DAY_WIDTH, Math.min(maxColumns, MAX_WIDENED_COLUMNS) * MIN_BLOCK_WIDTH);
  const gridStyle = {
    "--grid-cols": `${GUTTER_WIDTH}px ${columns.map((column) => `minmax(${dayWidth(column.maxColumns)}px,1fr)`).join(" ")}`,
    "--grid-cols-mobile": `${GUTTER_WIDTH - 8}px minmax(${dayWidth(columns[mobileIndex]?.maxColumns ?? 1)}px,1fr)`,
  } as CSSProperties;

  // Bring the working part of the day into view once per period, after its sessions arrive.
  const scrolledPeriod = useRef<string | null>(null);
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || isLoading || scrolledPeriod.current === periodKey) return;
    scrolledPeriod.current = periodKey;
    const firstStart = Math.min(...columns.flatMap((column) => column.items.map((item) => item.top)));
    const showsToday = days.some((day) => isSameDay(day, today));
    const nowOffset = (new Date().getHours() * 60 + new Date().getMinutes()) - startHour * 60;
    const target = showsToday && nowOffset > 0 && nowOffset < totalHeight / PX_PER_MINUTE
      ? Math.min(nowOffset - 60, Number.isFinite(firstStart) ? firstStart : Infinity)
      : Number.isFinite(firstStart) ? firstStart : 60;
    container.scrollTop = Math.max(0, (target - 15) * PX_PER_MINUTE);
  }, [columns, days, isLoading, periodKey, startHour, today, totalHeight]);

  return (
    <section aria-busy={isLoading} className="card-shell relative overflow-hidden">
      {isWeek ? (
        <div role="tablist" aria-label="Dzień tygodnia" className="flex gap-1 overflow-x-auto bg-surface-container-low p-2 md:hidden">
          {columns.map(({ day, items }, index) => {
            const active = index === mobileIndex;
            return (
              <button
                key={day.toISOString()}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMobileDayKey(day.toDateString())}
                className={[
                  "flex min-w-[52px] flex-1 flex-col items-center rounded-[var(--radius-md)] px-2 py-2 transition",
                  active ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container",
                ].join(" ")}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider">{shortDayNames[day.getDay()]}</span>
                <span className={`mt-0.5 text-base font-semibold ${isSameDay(day, today) && !active ? "text-primary-light" : ""}`}>{day.getDate()}</span>
                <span className={`text-[10px] ${active ? "text-on-primary/80" : "text-on-surface-muted"}`}>{items.length ? items.length : "–"}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {isLoading ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-0.5 animate-pulse bg-primary-light" role="status">
          <span className="sr-only">Ładowanie sesji…</span>
        </div>
      ) : null}
      {isWeek && !isLoading && !hasAnySession ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-30 hidden justify-center md:flex">
          <span className="rounded-full bg-surface-container-high px-4 py-2 text-sm text-on-surface-variant shadow-soft">
            Brak sesji w tym tygodniu
          </span>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="relative h-[min(1040px,calc(100dvh-220px))] min-h-[480px] overflow-auto overscroll-contain"
      >
        <div style={gridStyle} className="grid min-w-full grid-cols-[var(--grid-cols-mobile)] md:grid-cols-[var(--grid-cols)]">
          {/* Header row */}
          <div className="sticky left-0 top-0 z-30 bg-surface-container" />
          {columns.map(({ day, items }, index) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                className={[
                  "sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-l border-white/[0.06] bg-surface-container px-3 py-2.5",
                  index === mobileIndex ? "" : "max-md:hidden",
                ].join(" ")}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={[
                      "flex h-9 min-w-9 shrink-0 items-center justify-center rounded-[var(--radius-default)] px-1.5 font-display text-lg font-semibold tabular-nums",
                      isToday ? "bg-primary text-on-primary" : "text-on-surface",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className={`block truncate text-sm font-semibold ${isToday ? "text-primary-light" : "text-on-surface"}`}>
                      {isWeek ? shortDayNames[day.getDay()] : dayNames[day.getDay()]}
                    </span>
                    <span className="block truncate text-xs text-on-surface-muted">
                      {isWeek ? null : `${day.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })} · `}
                      {sessionCountLabel(items.length)}
                    </span>
                  </span>
                </div>
                {onCreateSession ? (
                  <button
                    type="button"
                    onClick={() => onCreateSession(day)}
                    aria-label={`Dodaj sesję: ${formatFullDate(day)}`}
                    title="Dodaj sesję"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-default)] text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary-light focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)] focus-visible:outline-none"
                  >
                    <Plus size={17} />
                  </button>
                ) : null}
              </div>
            );
          })}

          {/* Body row */}
          <div className="sticky left-0 z-10 bg-surface-container" style={{ height: totalHeight }}>
            {hours.map((hour, index) => (
              <span
                key={hour}
                className="absolute right-2 text-[11px] font-medium tabular-nums text-on-surface-muted"
                style={{ top: index === 0 ? 4 : index * HOUR_HEIGHT - 7 }}
              >
                {`${String(hour).padStart(2, "0")}:00`}
              </span>
            ))}
            <NowLabel days={days} startHour={startHour} endHour={endHour} />
          </div>
          {columns.map(({ day, items }, index) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              items={items}
              startHour={startHour}
              endHour={endHour}
              isToday={isSameDay(day, today)}
              hiddenOnMobile={index !== mobileIndex}
              isLoading={isLoading}
              showEmpty={!isLoading && items.length === 0 && (!isWeek || !hasAnySession)}
              emptyHintMobileOnly={isWeek}
              slotPress={onCreateSession ? slotPress : null}
              selectedSessionId={selectedSessionId}
              pendingSessionId={pendingSessionId}
              onSelectSession={onSelectSession}
              onCreateSession={onCreateSession}
            />
          ))}
        </div>
      </div>

      <StatusLegend />
    </section>
  );
}

const GRID_LINES = `repeating-linear-gradient(to bottom, rgb(255 255 255 / 0.06) 0 1px, transparent 1px ${HOUR_HEIGHT / 2}px, rgb(255 255 255 / 0.025) ${HOUR_HEIGHT / 2}px ${HOUR_HEIGHT / 2 + 1}px, transparent ${HOUR_HEIGHT / 2 + 1}px ${HOUR_HEIGHT}px)`;

// Sessions, the empty-day hint and other controls handle their own clicks.
function isEmptySlotTarget(target: EventTarget | null) {
  return target instanceof Element && !target.closest("button, a, input, [data-slot-ignore]");
}

function formatMinutes(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function DayColumn<TSession extends CalendarSession>({
  day,
  items,
  startHour,
  endHour,
  isToday,
  hiddenOnMobile,
  isLoading,
  showEmpty,
  emptyHintMobileOnly,
  slotPress,
  selectedSessionId,
  pendingSessionId,
  onSelectSession,
  onCreateSession,
}: {
  day: Date;
  items: PositionedSession<TSession>[];
  startHour: number;
  endHour: number;
  isToday: boolean;
  hiddenOnMobile: boolean;
  isLoading: boolean;
  showEmpty: boolean;
  emptyHintMobileOnly: boolean;
  slotPress: SlotPress | null;
} & Pick<ScheduleViewProps<TSession>, "selectedSessionId" | "pendingSessionId" | "onSelectSession" | "onCreateSession">) {
  const [hoverMinutes, setHoverMinutes] = useState<number | null>(null);
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT;
  const minutesAt = (column: HTMLElement, clientY: number) =>
    startHour * 60 + (clientY - column.getBoundingClientRect().top) / PX_PER_MINUTE;

  // Mouse: single click. Touch: long press only, so swiping keeps scrolling natively.
  const slotHandlers = slotPress && onCreateSession ? {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isEmptySlotTarget(event.target)) return;
      const startAt = slotStartDate(day, minutesAt(event.currentTarget, event.clientY));
      slotPress.down(event, () => onCreateSession(startAt, startAt));
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      slotPress.move(event);
      if (event.pointerType !== "mouse") return;
      const next = isEmptySlotTarget(event.target) ? roundSlotMinutes(minutesAt(event.currentTarget, event.clientY)) : null;
      setHoverMinutes((current) => (current === next ? current : next));
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => slotPress.end(event),
    onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => slotPress.end(event),
    onPointerLeave: (event: React.PointerEvent<HTMLDivElement>) => {
      slotPress.end(event);
      setHoverMinutes(null);
    },
    onClick: (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isEmptySlotTarget(event.target) || !slotPress.click(event)) return;
      const startAt = slotStartDate(day, minutesAt(event.currentTarget, event.clientY));
      setHoverMinutes(null);
      onCreateSession(startAt, startAt);
    },
    onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => {
      if (isEmptySlotTarget(event.target) && slotPress.shouldPreventContextMenu()) event.preventDefault();
    },
  } : {};

  const ghostTop = hoverMinutes === null ? 0 : (hoverMinutes - startHour * 60) * PX_PER_MINUTE;
  const ghostHeight = hoverMinutes === null ? 0 : Math.max(Math.min(DEFAULT_SLOT_MINUTES * PX_PER_MINUTE, totalHeight - ghostTop) - 2, 20);

  return (
    <div
      {...slotHandlers}
      className={[
        "relative border-l border-white/[0.06]",
        slotHandlers.onClick ? "cursor-pointer select-none [-webkit-touch-callout:none]" : "",
        isToday ? "bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]" : "",
        hiddenOnMobile ? "max-md:hidden" : "",
      ].join(" ")}
      style={{ height: totalHeight, backgroundImage: GRID_LINES }}
    >
      {hoverMinutes !== null && !isLoading ? (
        <div
          aria-hidden="true"
          data-testid="slot-hover"
          className="pointer-events-none absolute inset-x-[3px] flex items-start gap-1 rounded-[var(--radius-default)] border border-dashed border-primary-light/45 bg-primary/10 px-2 py-1 text-[11px] font-semibold tabular-nums text-primary-light"
          style={{ top: ghostTop + 1, height: ghostHeight }}
        >
          <Plus size={12} className="mt-0.5 shrink-0" />
          {formatMinutes(hoverMinutes)}
        </div>
      ) : null}
      <div className={`absolute inset-0 transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        {items.map((item) => {
          const height = Math.max(item.height * PX_PER_MINUTE - 2, MIN_BLOCK_HEIGHT);
          const width = 100 / item.columns;
          return (
            <SessionBlock
              key={item.session.id}
              session={item.session}
              heightPx={height}
              selected={selectedSessionId != null && item.session.id === selectedSessionId}
              pending={pendingSessionId != null && item.session.id === pendingSessionId}
              onSelect={onSelectSession}
              style={{
                top: item.top * PX_PER_MINUTE + 1,
                height,
                left: `calc(${item.column * width}% + 3px)`,
                width: `calc(${width}% - 6px)`,
              }}
            />
          );
        })}
      </div>
      {isToday ? <NowLine startHour={startHour} endHour={endHour} /> : null}
      {showEmpty ? (
        <div className={`pointer-events-none absolute inset-x-0 top-6 flex justify-center px-3 ${emptyHintMobileOnly ? "md:hidden" : ""}`}>
          <EmptyHint onCreate={onCreateSession ? () => onCreateSession(day) : undefined} />
        </div>
      ) : null}
    </div>
  );
}

function sessionCountLabel(count: number) {
  if (count === 0) return "brak sesji";
  if (count === 1) return "1 sesja";
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? `${count} sesje` : `${count} sesji`;
}

function EmptyHint({ onCreate }: { onCreate?: () => void }) {
  return (
    <div data-slot-ignore className="pointer-events-auto flex flex-col items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-high/90 px-5 py-4 text-center shadow-soft">
      <p className="text-sm text-on-surface-variant">Brak sesji w tym dniu</p>
      {onCreate ? <p className="max-w-[240px] text-xs text-on-surface-muted">Kliknij godzinę w siatce (na telefonie przytrzymaj), aby od razu ustawić termin.</p> : null}
      {onCreate ? (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-default)] px-3 text-sm font-semibold text-primary-light transition hover:bg-primary/15"
        >
          <Plus size={16} />
          Dodaj sesję
        </button>
      ) : null}
    </div>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/[0.06] px-4 py-2.5 text-xs text-on-surface-muted">
      {SESSION_STATUS_DOTS.map(({ status }) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${statusDotClassName(status)}`} />
          {getSessionStatusLabel(status)}
        </span>
      ))}
      <span className="basis-full text-on-surface-muted/80 sm:ml-auto sm:basis-auto">Kolor karty odpowiada kategorii z kalendarza Outlook</span>
    </div>
  );
}

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

// Only the date matters here; re-check every few minutes so the highlight moves at midnight.
function useToday() {
  const now = useNow(5 * 60_000);
  const key = now.toDateString();
  return useMemo(() => new Date(key), [key]);
}

function nowOffsetMinutes(now: Date, startHour: number, endHour: number) {
  const minutes = now.getHours() * 60 + now.getMinutes() - startHour * 60;
  return minutes >= 0 && minutes <= (endHour - startHour) * 60 ? minutes : null;
}

function NowLine({ startHour, endHour }: { startHour: number; endHour: number }) {
  const now = useNow();
  const offset = nowOffsetMinutes(now, startHour, endHour);
  if (offset === null) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-[15]" style={{ top: offset * PX_PER_MINUTE }}>
      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-primary-light" />
      <span className="block h-0.5 -translate-y-1/2 bg-primary-light" />
    </div>
  );
}

function NowLabel({ days, startHour, endHour }: { days: Date[]; startHour: number; endHour: number }) {
  const now = useNow();
  const offset = nowOffsetMinutes(now, startHour, endHour);
  if (offset === null || !days.some((day) => isSameDay(day, now))) return null;
  return (
    <span
      className="absolute right-1 z-10 -translate-y-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-on-primary"
      style={{ top: offset * PX_PER_MINUTE }}
    >
      {now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
