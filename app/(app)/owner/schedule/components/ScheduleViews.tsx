"use client";

import { groupSeatsLabel } from "@/app/lib/group-sessions";
import { MapPin, Plus, UserRound } from "lucide-react";
import { getSessionOutlookColor } from "@/app/lib/calendar/outlook-colors";
import type { CalendarSession } from "../types";
import {
  dayNames,
  formatDayLabel,
  formatFullDate,
  formatTime,
  shortDayNames,
} from "../date-utils";
import { getSessionTitle, getToneClasses } from "../session-utils";
import { LoadingState } from "./ScheduleStates";
import SessionMetaChip from "./SessionMetaChip";

export function WeekSchedule<TSession extends CalendarSession>({
  days,
  sessions,
  isLoading,
  onSelectSession,
  onCreateSession,
}: {
  days: Date[];
  sessions: TSession[];
  isLoading: boolean;
  onSelectSession: (session: TSession) => void;
  onCreateSession?: (date: Date) => void;
}) {
  return (
    <section className="card-shell overflow-hidden p-4">
      {isLoading ? (
        <LoadingState />
      ) : (
        <div className={days.length === 7 ? "grid gap-3 lg:grid-cols-3 2xl:grid-cols-7" : "grid gap-3 lg:grid-cols-3 2xl:grid-cols-6"}>
          {days.map((day) => {
            const daySessions = sessions.filter((session) =>
              overlapsDay(session, day),
            );

            return (
              <div
                key={day.toISOString()}
                className="min-h-[360px] rounded-[var(--radius-lg)] bg-surface-container-low p-3"
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">
                      {shortDayNames[day.getDay()]}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-muted">
                      {formatDayLabel(day)}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                    {daySessions.length}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {daySessions.length > 0 ? (
                    <>
                      {daySessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          compact
                          onSelect={onSelectSession}
                        />
                      ))}
                      {onCreateSession ? <AddSessionCard compact onClick={() => onCreateSession(day)} /> : null}
                    </>
                  ) : (
                    onCreateSession ? <AddSessionCard compact onClick={() => onCreateSession(day)} /> : <p className="py-4 text-xs text-on-surface-muted">Brak zajęć</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function DaySchedule<TSession extends CalendarSession>({
  date,
  sessions,
  isLoading,
  onSelectSession,
  onCreateSession,
}: {
  date: Date;
  sessions: TSession[];
  isLoading: boolean;
  onSelectSession: (session: TSession) => void;
  onCreateSession?: (date: Date) => void;
}) {
  const daySessions = sessions.filter((session) =>
    overlapsDay(session, date),
  );

  return (
    <section className="card-shell p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-section-title">{dayNames[date.getDay()]}</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            {formatFullDate(date)}
          </p>
        </div>
        <span className="w-fit rounded-full bg-surface-container-low px-3 py-1 text-sm font-semibold text-primary-light">
          {daySessions.length} sesji
        </span>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {isLoading ? (
          <LoadingState />
        ) : daySessions.length > 0 ? (
          <>
            {daySessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onSelect={onSelectSession}
              />
            ))}
            {onCreateSession ? <AddSessionCard onClick={() => onCreateSession(date)} /> : null}
          </>
        ) : onCreateSession ? (
          <AddSessionCard onClick={() => onCreateSession(date)} />
        ) : <p className="text-sm text-on-surface-muted">Brak zajęć</p>}
      </div>
    </section>
  );
}

function SessionCard<TSession extends CalendarSession>({
  session,
  compact,
  onSelect,
}: {
  session: TSession;
  compact?: boolean;
  onSelect: (session: TSession) => void;
}) {
  const color = getSessionOutlookColor(session);
  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      className={[
        "w-full rounded-[var(--radius-lg)] border p-3 text-left transition hover:-translate-y-0.5 hover:border-primary-light/35 hover:bg-surface-container-high",
        getToneClasses(session),
        session.isGroupSession === true ? "ring-2 ring-primary-light/30 bg-surface-container" : "",
        compact ? "" : "md:p-4",
      ].join(" ")}
    >
      {session.isGroupSession === true ? <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-primary/15 px-2 py-1 font-semibold text-primary-light">Grupowe</span>
        <span className="text-on-surface-variant">{groupSeatsLabel(session)}</span>
        {session.isFullyBooked === true ? <span className="font-semibold text-on-surface-variant">Brak miejsc</span> : null}
      </div> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-light">
            {formatTime(session.startAt)} - {formatTime(session.endAt)}
          </p>
          <p
            className={[
              "mt-2 font-semibold text-on-surface",
              compact ? "text-sm" : "text-base",
            ].join(" ")}
          >
            {getSessionTitle(session)}
          </p>
        </div>
      </div>

      <div
        className={[
          "mt-3 grid gap-2",
          compact ? "grid-cols-1" : "sm:grid-cols-2",
        ].join(" ")}
      >
        <SessionMetaChip
          icon={<UserRound size={14} />}
          label="Trener"
          value={session.trainerFullName || "Brak"}
          tone="primary"
          style={{ backgroundColor: color.bg, borderLeft: `4px solid ${color.border}`, color: color.text }}
        />
        <SessionMetaChip
          icon={<MapPin size={14} />}
          label="Lokalizacja"
          value={session.locationName || "Brak"}
          tone="neutral"
        />
      </div>

      {!compact && session.clientsDisplayName ? (
        <p className="mt-3 rounded-[var(--radius-md)] bg-black/15 px-3 py-2 text-xs text-on-surface-variant">
          {session.clientsDisplayName}
        </p>
      ) : null}
    </button>
  );
}

function AddSessionCard({
  compact,
  onClick,
}: {
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-primary-light/35 bg-surface-container-lowest/35 text-sm font-semibold text-primary-light transition hover:border-primary-light hover:bg-primary/10",
        compact ? "min-h-20 px-3 py-4" : "min-h-28 px-4 py-5",
      ].join(" ")}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
        <Plus size={18} />
      </span>
      Dodaj sesję
    </button>
  );
}

function overlapsDay(session: CalendarSession, day: Date) {
  const start = new Date(day); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return Date.parse(session.startAt) < end.getTime() && Date.parse(session.endAt) > start.getTime();
}
