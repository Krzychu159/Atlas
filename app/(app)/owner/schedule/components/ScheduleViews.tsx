"use client";

import { MapPin, UserRound, WalletCards } from "lucide-react";
import type { OwnerSession } from "@/app/lib/owner/sessions";
import {
  dayNames,
  formatDayLabel,
  formatFullDate,
  formatTime,
  isSameDay,
  shortDayNames,
} from "../date-utils";
import {
  getParticipantsLabel,
  getSessionPackageName,
  getSessionTitle,
  getToneClasses,
} from "../session-utils";
import { EmptyDay, LoadingState } from "./ScheduleStates";
import SessionMetaChip from "./SessionMetaChip";

export function WeekSchedule({
  days,
  sessions,
  isLoading,
  onSelectSession,
}: {
  days: Date[];
  sessions: OwnerSession[];
  isLoading: boolean;
  onSelectSession: (session: OwnerSession) => void;
}) {
  return (
    <section className="card-shell overflow-hidden p-4">
      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-3 lg:grid-cols-3 2xl:grid-cols-6">
          {days.map((day) => {
            const daySessions = sessions.filter((session) =>
              isSameDay(new Date(session.startAt), day),
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
                    daySessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        compact
                        onSelect={onSelectSession}
                      />
                    ))
                  ) : (
                    <EmptyDay />
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

export function DaySchedule({
  date,
  sessions,
  isLoading,
  onSelectSession,
}: {
  date: Date;
  sessions: OwnerSession[];
  isLoading: boolean;
  onSelectSession: (session: OwnerSession) => void;
}) {
  const daySessions = sessions.filter((session) =>
    isSameDay(new Date(session.startAt), date),
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
          daySessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onSelect={onSelectSession}
            />
          ))
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-8 text-center text-on-surface-variant xl:col-span-2">
            Brak sesji w tym dniu.
          </div>
        )}
      </div>
    </section>
  );
}

function SessionCard({
  session,
  compact,
  onSelect,
}: {
  session: OwnerSession;
  compact?: boolean;
  onSelect: (session: OwnerSession) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      className={[
        "w-full rounded-[var(--radius-lg)] border p-3 text-left transition hover:-translate-y-0.5 hover:border-primary-light/35 hover:bg-surface-container-high",
        getToneClasses(session),
        compact ? "" : "md:p-4",
      ].join(" ")}
    >
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
        <span className="shrink-0 rounded-full bg-black/20 px-2 py-1 text-[11px] font-semibold text-on-surface">
          {getParticipantsLabel(session)}
        </span>
      </div>

      <div
        className={[
          "mt-3 grid gap-2",
          compact ? "grid-cols-1" : "sm:grid-cols-3",
        ].join(" ")}
      >
        <SessionMetaChip
          icon={<UserRound size={14} />}
          label="Trener"
          value={session.trainerFullName || "Brak"}
          tone="primary"
        />
        <SessionMetaChip
          icon={<MapPin size={14} />}
          label="Lokalizacja"
          value={session.locationName || "Brak"}
          tone="neutral"
        />
        <SessionMetaChip
          icon={<WalletCards size={14} />}
          label="Pakiet"
          value={getSessionPackageName(session)}
          tone="success"
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
