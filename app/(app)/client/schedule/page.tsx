"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { showAppError } from "@/app/components/ui/app-toast";
import { isNotFoundError } from "@/app/lib/backend";
import { formatSessionTime } from "@/app/lib/formatters/date";
import {
  getClientPortalDashboard,
  getClientPortalSchedule,
  getClientPortalSubscriptionUsage,
  type ClientPortalTrainer,
  type ClientPortalSession,
  type SubscriptionUsage,
} from "@/app/lib/client/portal";

export default function ClientSchedulePage() {
  const [sessions, setSessions] = useState<ClientPortalSession[]>([]);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [trainer, setTrainer] = useState<ClientPortalTrainer | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [loadedAt, setLoadedAt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  async function loadPlan() {
    try {
      setIsLoading(true);
      const [scheduleData, usageData, dashboardData] = await Promise.allSettled([
        getClientPortalSchedule(),
        getClientPortalSubscriptionUsage(),
        getClientPortalDashboard(),
      ]);

      if (scheduleData.status === "fulfilled") {
        setSessions(scheduleData.value || []);
      } else if (isNotFoundError(scheduleData.reason)) {
        setSessions([]);
      } else {
        throw scheduleData.reason;
      }

      if (usageData.status === "fulfilled") {
        setUsage(usageData.value);
      } else if (isNotFoundError(usageData.reason)) {
        setUsage(null);
      }

      if (dashboardData.status === "fulfilled") {
        setTrainer(dashboardData.value.trainer);
      }

      setLoadedAt(Date.now());
    } catch (err) {
      showAppError(err, "Nie udało się pobrać planu treningów.", {
        id: "client-schedule-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPlan();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addDays(weekStart, index),
      ),
    [weekStart],
  );
  const weekEnd = addDays(weekStart, 7);
  const weekSessions = useMemo(
    () =>
      sessions
        .filter((session) => {
          const time = getTime(session.startAt);
          return time >= weekStart.getTime() && time < weekEnd.getTime();
        })
        .sort(sortSessions),
    [sessions, weekEnd, weekStart],
  );
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, ClientPortalSession[]>();

    weekDays.forEach((day) => map.set(toDateKey(day), []));
    weekSessions.forEach((session) => {
      const key = toDateKey(new Date(session.startAt));
      map.get(key)?.push(session);
    });

    return map;
  }, [weekDays, weekSessions]);
  const nextSession = useMemo(
    () =>
      [...sessions]
        .filter((session) => getTime(session.startAt) >= loadedAt)
        .sort(sortSessions)[0] || null,
    [loadedAt, sessions],
  );
  const usageProgress = usage?.totalSessions
    ? Math.round((usage.usedSessions / usage.totalSessions) * 100)
    : 0;
  const upcomingSessions = useMemo(
    () =>
      [...sessions]
        .filter((session) => getTime(session.startAt) >= loadedAt)
        .sort(sortSessions)
        .slice(0, 8),
    [loadedAt, sessions],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <MobileSchedule
        upcomingSessions={upcomingSessions}
        nextSession={nextSession}
        usage={usage}
        usageProgress={usageProgress}
        trainer={trainer}
        isLoading={isLoading}
        onRefresh={loadPlan}
      />

      <div className="hidden flex-col gap-5 md:flex">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Plan</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Tygodniowy plan treningów
          </h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
            Prosty widok Twoich sesji z godziną, trenerem i lokalizacją.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container p-1">
          <button
            type="button"
            onClick={() => setWeekStart((current) => addDays(current, -7))}
            className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-lowest text-on-surface-variant transition hover:text-on-surface"
            aria-label="Poprzedni tydzień"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-[230px] rounded-[var(--radius-md)] bg-surface-container-lowest px-4 py-3 text-center">
            <p className="text-sm font-semibold">
              {formatWeekRange(weekStart, addDays(weekStart, 6))}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWeekStart((current) => addDays(current, 7))}
            className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-lowest text-on-surface-variant transition hover:text-on-surface"
            aria-label="Następny tydzień"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <PlanMetric
          icon={<CalendarDays size={20} />}
          label="Sesje w tygodniu"
          value={String(weekSessions.length)}
          note="Zaplanowane w wybranym tygodniu"
          loading={isLoading}
        />
        <PlanMetric
          icon={<Dumbbell size={20} />}
          label="Wykorzystanie cyklu"
          value={
            usage
              ? `${usage.usedSessions}/${usage.totalSessions}`
              : "Brak danych"
          }
          note={`${usageProgress}% aktualnego cyklu`}
          loading={isLoading}
        />
        <PlanMetric
          icon={<Clock3 size={20} />}
          label="Najbliższy trening"
          value={nextSession ? formatShortDateTime(nextSession.startAt) : "Brak"}
          note={nextSession?.title || "Najbliższa sesja pojawi się po zaplanowaniu"}
          loading={isLoading}
        />
      </section>

      <section className="card-shell p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {weekDays.map((day) => {
            const daySessions = sessionsByDay.get(toDateKey(day)) || [];

            return (
              <DayColumn
                key={toDateKey(day)}
                day={day}
                sessions={daySessions}
                isToday={toDateKey(day) === toDateKey(new Date())}
              />
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
        <div className="card-shell p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-label text-on-surface-muted">Najbliższe</p>
              <h2 className="mt-3 font-display text-[1.85rem] font-semibold leading-none">
                Kolejne sesje
              </h2>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={loadPlan}>
              Odśwież
            </Button>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {isLoading ? (
              <PlanSkeleton />
            ) : sessions.length ? (
              sessions
                .filter((session) => getTime(session.startAt) >= loadedAt)
                .sort(sortSessions)
                .slice(0, 6)
                .map((session) => (
                  <SessionListRow key={session.id} session={session} />
                ))
            ) : (
              <EmptyState text="Nie masz jeszcze zaplanowanych sesji." />
            )}
          </div>
        </div>

        <div className="card-shell p-5 md:p-6">
          <p className="text-label text-on-surface-muted">Pakiet</p>
          <h2 className="mt-3 font-display text-[1.85rem] font-semibold leading-none">
            Licznik wejść
          </h2>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-surface-container-lowest">
            <div
              className="h-full rounded-full bg-primary-gradient"
              style={{ width: `${Math.max(0, Math.min(usageProgress, 100))}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <UsageTile label="Użyte" value={usage?.usedSessions ?? 0} />
            <UsageTile label="Zostało" value={usage?.remainingSessions ?? 0} />
            <UsageTile label="Razem" value={usage?.totalSessions ?? 0} />
          </div>

          <p className="mt-5 text-sm leading-6 text-on-surface-variant">
            Licznik pochodzi z aktualnego cyklu subskrypcji. Sesje anulowane nie
            powinny zwiększać wykorzystania pakietu.
          </p>
        </div>
      </section>
      </div>
    </div>
  );
}

function MobileSchedule({
  upcomingSessions,
  nextSession,
  usage,
  usageProgress,
  trainer,
  isLoading,
  onRefresh,
}: {
  upcomingSessions: ClientPortalSession[];
  nextSession: ClientPortalSession | null;
  usage: SubscriptionUsage | null;
  usageProgress: number;
  trainer: ClientPortalTrainer | null;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const trainerName = trainer?.fullName || "trenerem";

  return (
    <div className="flex flex-col gap-4 md:hidden">
      <section>
        <p className="text-label text-primary-light">Plan</p>
        <h1 className="mt-2 font-display text-[2.15rem] font-semibold leading-[0.95]">
          Najbliższe treningi
        </h1>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          Szybki podgląd terminów bez kalendarza.
        </p>
      </section>

      <section className="card-shell p-5">
        {isLoading ? (
          <PlanSkeleton />
        ) : nextSession ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label text-primary-light">Najbliższa sesja</p>
                <h2 className="mt-4 font-display text-[1.85rem] font-semibold leading-[1.05]">
                  {nextSession.title || "Trening"}
                </h2>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
                <CalendarDays size={22} />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 text-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-2">
                <Clock3 size={15} className="text-primary-light" />
                {formatShortDateTime(nextSession.startAt)}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin size={15} className="text-primary-light" />
                {nextSession.locationName || "Brak lokalizacji"}
              </span>
              <span className="inline-flex items-center gap-2">
                <UserRound size={15} className="text-primary-light" />
                {nextSession.trainerFullName || trainer?.fullName || "Trener"}
              </span>
            </div>
          </>
        ) : (
          <MobilePlanEmptyState trainer={trainer} trainerName={trainerName} />
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MobilePlanMetric
          label="Najbliższy"
          value={nextSession ? formatSessionTime(nextSession.startAt) : "Brak"}
          note={nextSession?.title || "sesji"}
        />
        <MobilePlanMetric
          label="Pakiet"
          value={usage ? `${usage.usedSessions}/${usage.totalSessions}` : "-"}
          note={usage ? `${usageProgress}% cyklu` : "brak aktywnego cyklu"}
        />
      </section>

      <section className="card-shell p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-label text-on-surface-muted">Terminy</p>
            <h2 className="mt-2 font-display text-[1.55rem] font-semibold leading-none">
              Kolejne sesje
            </h2>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onRefresh}>
            Odśwież
          </Button>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {isLoading ? (
            <PlanSkeleton />
          ) : upcomingSessions.length ? (
            upcomingSessions.map((session) => (
              <SessionListRow key={session.id} session={session} />
            ))
          ) : (
            <EmptyState text="Nie masz zaplanowanych treningów. Ustal pierwszy termin z trenerem." />
          )}
        </div>
      </section>

      <section className="card-shell p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-label text-on-surface-muted">Licznik wejść</p>
            <p className="mt-2 text-[1.55rem] font-semibold">
              {usage?.remainingSessions ?? 0} zostało
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
            <Dumbbell size={22} />
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-surface-container-lowest">
          <div
            className="h-full rounded-full bg-primary-gradient"
            style={{ width: `${Math.max(0, Math.min(usageProgress, 100))}%` }}
          />
        </div>
      </section>
    </div>
  );
}

function MobilePlanEmptyState({
  trainer,
  trainerName,
}: {
  trainer: ClientPortalTrainer | null;
  trainerName: string;
}) {
  return (
    <div>
      <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
        <CalendarDays size={26} />
      </div>
      <h2 className="mt-5 font-display text-[1.85rem] font-semibold leading-[1.05]">
        Brak zaplanowanych treningów
      </h2>
      <p className="mt-4 text-sm leading-6 text-on-surface-variant">
        Zaplanuj najbliższy trening z {trainerName}. Po dodaniu terminu sesja
        pojawi się tutaj automatycznie.
      </p>

      {trainer?.phone || trainer?.email ? (
        <div className="mt-5 grid gap-2">
          {trainer.phone ? (
            <a
              href={`tel:${trainer.phone}`}
              className="flex h-11 items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface"
            >
              <Phone size={15} className="text-primary-light" />
              {trainer.phone}
            </a>
          ) : null}
          {trainer.email ? (
            <a
              href={`mailto:${trainer.email}`}
              className="flex h-11 items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface"
            >
              <Mail size={15} className="text-primary-light" />
              {trainer.email}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MobilePlanMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="card-shell min-h-[118px] p-4">
      <p className="text-label text-on-surface-muted">{label}</p>
      <p className="mt-4 text-[1.55rem] font-semibold leading-none text-primary-light">
        {value}
      </p>
      <p className="mt-2 line-clamp-1 text-sm text-on-surface-variant">{note}</p>
    </div>
  );
}

function DayColumn({
  day,
  sessions,
  isToday,
}: {
  day: Date;
  sessions: ClientPortalSession[];
  isToday: boolean;
}) {
  return (
    <div
      className={[
        "min-h-[260px] rounded-[var(--radius-lg)] bg-surface-container-lowest p-3",
        isToday ? "outline outline-1 outline-primary-light/35" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-label text-on-surface-muted">
            {new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(day)}
          </p>
          <p className="mt-1 text-[1.55rem] font-semibold leading-none">
            {new Intl.DateTimeFormat("pl-PL", { day: "2-digit" }).format(day)}
          </p>
        </div>
        {isToday ? (
          <span className="rounded-full bg-primary/20 px-2.5 py-1 text-xs font-semibold text-primary-light">
            Dziś
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {sessions.length ? (
          sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-[var(--radius-md)] bg-surface-container p-3"
            >
              <p className="text-sm font-semibold text-primary-light">
                {formatSessionTime(session.startAt)} - {formatSessionTime(session.endAt)}
              </p>
              <p className="mt-2 line-clamp-2 text-sm font-semibold">
                {session.title || "Trening"}
              </p>
              <p className="mt-2 truncate text-xs text-on-surface-variant">
                {session.trainerFullName || "Trener"}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-white/10 p-4 text-xs leading-5 text-on-surface-muted">
            Brak treningów
          </div>
        )}
      </div>
    </div>
  );
}

function PlanMetric({
  icon,
  label,
  value,
  note,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  loading: boolean;
}) {
  return (
    <div className="card-shell p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
        {icon}
      </div>
      <p className="mt-5 text-label text-on-surface-muted">{label}</p>
      {loading ? (
        <div className="mt-3 h-7 animate-pulse rounded bg-surface-container-lowest" />
      ) : (
        <p className="mt-3 text-[1.5rem] font-semibold leading-tight">{value}</p>
      )}
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">{note}</p>
    </div>
  );
}

function SessionListRow({ session }: { session: ClientPortalSession }) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">
          {session.title || "Trening"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} className="text-primary-light" />
            {formatShortDateTime(session.startAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="text-primary-light" />
            {session.locationName || "Brak lokalizacji"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserRound size={14} className="text-primary-light" />
            {session.trainerFullName || "Trener"}
          </span>
        </div>
      </div>
      <span className="w-fit rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-primary-light">
        {getSessionStatusLabel(session.status)}
      </span>
    </div>
  );
}

function UsageTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <p className="text-label text-on-surface-muted">{label}</p>
      <p className="mt-2 text-[1.55rem] font-semibold leading-none">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
      {text}
    </div>
  );
}

function PlanSkeleton() {
  return (
    <>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-20 animate-pulse rounded-[var(--radius-lg)] bg-surface-container-lowest"
        />
      ))}
    </>
  );
}

function getWeekStart(date: Date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);

  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);

  return result;
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatWeekRange(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function formatShortDateTime(value?: string | null) {
  if (!value) return "Brak terminu";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sortSessions(first: ClientPortalSession, second: ClientPortalSession) {
  return getTime(first.startAt) - getTime(second.startAt);
}

function getTime(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getSessionStatusLabel(status?: string | null) {
  const normalized = status?.toLowerCase() || "";

  if (normalized.includes("completed") || normalized.includes("done")) {
    return "Zrealizowany";
  }
  if (normalized.includes("cancel")) return "Anulowany";
  if (normalized.includes("confirm")) return "Potwierdzony";
  if (normalized.includes("planned")) return "Zaplanowany";

  return status || "Zaplanowany";
}
