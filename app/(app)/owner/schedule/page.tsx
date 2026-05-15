"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { getOutlookStatus, type OutlookStatus } from "@/app/lib/owner/outlook";
import { getOwnerSessions, type OwnerSession } from "@/app/lib/owner/sessions";

type ScheduleView = "day" | "week";

const dayNames = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
];

const shortDayNames = ["Nd", "Pon", "Wt", "Śr", "Czw", "Pt", "Sob"];

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);

  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);

  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);

  return copy;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(value: Date) {
  return value.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getSessionType(session: OwnerSession) {
  return (
    session.actualSessionType ||
    session.plannedSessionType ||
    session.primaryOutlookCategory ||
    "Sesja"
  );
}

function getSessionTitle(session: OwnerSession) {
  return session.title || getSessionType(session);
}

function getParticipantsLabel(session: OwnerSession) {
  const count =
    session.actualParticipantsCount ??
    session.participantsCount ??
    session.participants?.length ??
    0;

  if (session.locationLimit) return `${count}/${session.locationLimit}`;

  return `${count}`;
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getSessionTone(session: OwnerSession) {
  const status = (session.status || "").toLowerCase();

  if (status.includes("cancel")) return "danger";
  if (status.includes("complete") || status.includes("done")) return "success";
  if (status.includes("progress") || status.includes("active")) return "primary";

  return "neutral";
}

function getToneClasses(session: OwnerSession) {
  const tone = getSessionTone(session);

  if (tone === "danger") {
    return "border-error/25 bg-error-container/20 text-error-light";
  }

  if (tone === "success") {
    return "border-tertiary/25 bg-tertiary-container/20 text-tertiary-light";
  }

  if (tone === "primary") {
    return "border-primary/35 bg-primary/15 text-primary-light";
  }

  return "border-white/8 bg-surface-container-low text-on-surface";
}

function sortSessions(sessions: OwnerSession[]) {
  return [...sessions].sort(
    (first, second) =>
      new Date(first.startAt).getTime() - new Date(second.startAt).getTime(),
  );
}

function getPeriod(view: ScheduleView, anchorDate: Date) {
  if (view === "day") {
    const from = startOfDay(anchorDate);
    const to = endOfDay(anchorDate);

    return {
      from,
      to,
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
      label: formatFullDate(anchorDate),
    };
  }

  const from = startOfWeek(anchorDate);
  const saturday = addDays(from, 5);
  const to = endOfDay(saturday);

  return {
    from,
    to,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    label: `${formatDayLabel(from)} - ${formatDayLabel(saturday)}`,
  };
}

export default function SchedulePage() {
  const [view, setView] = useState<ScheduleView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [outlookStatus, setOutlookStatus] = useState<OutlookStatus | null>(
    null,
  );
  const [sessions, setSessions] = useState<OwnerSession[]>([]);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);

  const period = useMemo(() => getPeriod(view, anchorDate), [anchorDate, view]);
  const visibleSessions = useMemo(() => sortSessions(sessions), [sessions]);
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(anchorDate);

    return Array.from({ length: 6 }, (_, index) => addDays(weekStart, index));
  }, [anchorDate]);

  async function loadOutlookStatus() {
    try {
      setIsStatusLoading(true);
      const data = await getOutlookStatus();
      setOutlookStatus(data);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nie udało się sprawdzić połączenia Outlook.",
        { id: "owner-schedule-outlook-status" },
      );
      setOutlookStatus(null);
    } finally {
      setIsStatusLoading(false);
    }
  }

  async function loadSessions() {
    try {
      setIsSessionsLoading(true);
      const data = await getOwnerSessions({
        from: period.fromIso,
        to: period.toIso,
      });
      setSessions(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Nie udało się pobrać sesji.",
        { id: "owner-schedule-sessions" },
      );
      setSessions([]);
    } finally {
      setIsSessionsLoading(false);
    }
  }

  useEffect(() => {
    loadOutlookStatus();
  }, []);

  useEffect(() => {
    if (!outlookStatus?.isConnected) return;

    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlookStatus?.isConnected, period.fromIso, period.toIso]);

  function movePeriod(direction: -1 | 1) {
    setAnchorDate((current) => addDays(current, view === "week" ? 7 * direction : direction));
  }

  const connected = Boolean(outlookStatus?.isConnected);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Grafik</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Sesje treningowe
          </h1>
          <p className="mt-3 max-w-[680px] text-sm leading-6 text-on-surface-variant">
            Widok sesji zsynchronizowanych z kalendarzem Microsoft Outlook.
            Aktualnie dostępny jest tylko podgląd grafiku.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container p-1">
            {(["day", "week"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={[
                  "h-10 rounded-[10px] px-4 text-sm font-semibold transition",
                  view === item
                    ? "bg-primary text-on-primary shadow-soft"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                ].join(" ")}
              >
                {item === "day" ? "Dzień" : "Tydzień"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container p-1">
            <button
              type="button"
              onClick={() => movePeriod(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
              aria-label="Poprzedni zakres"
            >
              <ChevronLeft size={18} />
            </button>
            <label className="flex h-10 min-w-[210px] items-center justify-center gap-2 rounded-[10px] bg-surface-container-low px-3 text-sm font-semibold text-on-surface">
              <CalendarDays size={16} className="text-primary-light" />
              {view === "day" ? (
                <input
                  type="date"
                  value={toDateInputValue(anchorDate)}
                  onChange={(event) =>
                    setAnchorDate(new Date(`${event.target.value}T12:00:00`))
                  }
                  className="min-h-0 w-[130px] border-0 bg-transparent p-0 text-sm font-semibold"
                />
              ) : (
                <span>{period.label}</span>
              )}
            </label>
            <button
              type="button"
              onClick={() => movePeriod(1)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
              aria-label="Następny zakres"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {isStatusLoading ? (
        <div className="card-shell p-6 text-on-surface-variant">
          Sprawdzanie połączenia z Microsoft Outlook...
        </div>
      ) : !connected ? (
        <OutlookRequiredState />
      ) : (
        <>
          <ScheduleSummary
            sessions={visibleSessions}
            email={outlookStatus?.email}
            onRefresh={loadSessions}
            isRefreshing={isSessionsLoading}
          />

          {view === "week" ? (
            <WeekSchedule
              days={weekDays}
              sessions={visibleSessions}
              isLoading={isSessionsLoading}
            />
          ) : (
            <DaySchedule
              date={anchorDate}
              sessions={visibleSessions}
              isLoading={isSessionsLoading}
            />
          )}
        </>
      )}
    </div>
  );
}

function OutlookRequiredState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[var(--radius-xl)] bg-surface-container p-6 text-center shadow-soft">
      <div className="max-w-[520px]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] bg-surface-container-low text-primary-light">
          <CalendarDays size={30} />
        </div>
        <p className="mt-6 font-display text-2xl font-semibold">
          Połącz konto Microsoft
        </p>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          Grafik korzysta z integracji Outlook. Najpierw połącz konto Microsoft
          w ustawieniach, potem wróć tutaj, żeby zobaczyć sesje.
        </p>
        <Link
          href="/owner/settings"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-[var(--radius-lg)] bg-primary px-5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary-container"
        >
          Przejdź do ustawień
        </Link>
      </div>
    </div>
  );
}

function ScheduleSummary({
  sessions,
  email,
  onRefresh,
  isRefreshing,
}: {
  sessions: OwnerSession[];
  email?: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const trainers = new Set(
    sessions.map((session) => session.trainerFullName).filter(Boolean),
  );
  const locations = new Set(
    sessions.map((session) => session.locationName).filter(Boolean),
  );

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
      <SummaryTile label="Sesje" value={sessions.length} icon={<Clock3 size={18} />} />
      <SummaryTile label="Trenerzy" value={trainers.size} icon={<Users size={18} />} />
      <SummaryTile
        label="Lokalizacje"
        value={locations.size || "-"}
        icon={<MapPin size={18} />}
      />
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex h-full min-h-16 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container px-5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high disabled:opacity-60"
      >
        <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
        Odśwież
      </button>
      {email ? (
        <div className="rounded-[var(--radius-lg)] bg-tertiary-container/20 px-4 py-3 text-sm text-tertiary-light md:col-span-4">
          Połączone konto Outlook: <span className="font-semibold">{email}</span>
        </div>
      ) : null}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label text-on-surface-muted">{label}</p>
        <span className="text-primary-light">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold leading-none">{value}</p>
    </div>
  );
}

function WeekSchedule({
  days,
  sessions,
  isLoading,
}: {
  days: Date[];
  sessions: OwnerSession[];
  isLoading: boolean;
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
                      <SessionCard key={session.id} session={session} compact />
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

function DaySchedule({
  date,
  sessions,
  isLoading,
}: {
  date: Date;
  sessions: OwnerSession[];
  isLoading: boolean;
}) {
  const daySessions = sessions.filter((session) =>
    isSameDay(new Date(session.startAt), date),
  );

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="card-shell p-4 md:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-section-title">{dayNames[date.getDay()]}</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              {formatFullDate(date)}
            </p>
          </div>
          <span className="rounded-full bg-surface-container-low px-3 py-1 text-sm font-semibold text-primary-light">
            {daySessions.length} sesji
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {isLoading ? (
            <LoadingState />
          ) : daySessions.length > 0 ? (
            daySessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))
          ) : (
            <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-8 text-center text-on-surface-variant">
              Brak sesji w tym dniu.
            </div>
          )}
        </div>
      </div>

      <aside className="card-shell p-5">
        <p className="text-section-title">Dzień w skrócie</p>
        <div className="mt-5 flex flex-col gap-3">
          {daySessions.slice(0, 5).map((session) => (
            <div
              key={session.id}
              className="rounded-[var(--radius-lg)] bg-surface-container-low p-4"
            >
              <p className="text-sm font-semibold">{formatTime(session.startAt)}</p>
              <p className="mt-1 truncate text-sm text-on-surface-variant">
                {getSessionTitle(session)}
              </p>
            </div>
          ))}
          {!daySessions.length ? (
            <p className="text-sm leading-6 text-on-surface-variant">
              Wybierz inny dzień albo przełącz na tydzień, żeby zobaczyć szerszy
              zakres grafiku.
            </p>
          ) : null}
        </div>
      </aside>
    </section>
  );
}

function SessionCard({
  session,
  compact,
}: {
  session: OwnerSession;
  compact?: boolean;
}) {
  return (
    <article
      className={[
        "rounded-[var(--radius-lg)] border p-3",
        getToneClasses(session),
        compact ? "" : "md:p-4",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
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
        <span className="shrink-0 rounded-full bg-black/20 px-2 py-1 text-[11px] font-semibold">
          {getParticipantsLabel(session)}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 text-xs text-on-surface-variant">
        <span className="truncate">{getSessionType(session)}</span>
        <span className="truncate">
          {session.trainerFullName || "Brak trenera"}
        </span>
        <span className="truncate">
          {session.locationName || "Brak lokalizacji"}
        </span>
      </div>

      {!compact && session.clientsDisplayName ? (
        <p className="mt-3 rounded-[var(--radius-md)] bg-black/15 px-3 py-2 text-xs text-on-surface-variant">
          {session.clientsDisplayName}
        </p>
      ) : null}
    </article>
  );
}

function EmptyDay() {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-white/8 px-4 text-center text-sm text-on-surface-muted">
      Brak sesji
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-6 text-on-surface-variant">
      Ładowanie sesji...
    </div>
  );
}
