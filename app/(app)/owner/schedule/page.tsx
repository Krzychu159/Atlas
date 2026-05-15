"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { getOutlookStatus, type OutlookStatus } from "@/app/lib/owner/outlook";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import { getClients, type Client } from "@/app/lib/owner/clients";
import {
  createSession,
  getOwnerSessions,
  updateSession,
  type OwnerSession,
  type SessionParticipantPayload,
  type SessionPayload,
} from "@/app/lib/owner/sessions";
import { getTrainers, type Trainer } from "@/app/lib/owner/trainers";

type ScheduleView = "day" | "week";

type SessionFormValues = {
  title: string;
  startAt: string;
  endAt: string;
  trainerId: string;
  locationId: string;
  status: string;
  plannedSessionType: string;
  outlookCategories: string;
  participantIds: string[];
  note: string;
};

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

const statusOptions = [
  { value: "", label: "Domyślnie" },
  { value: "Planned", label: "Zaplanowana" },
  { value: "Active", label: "Aktywna" },
  { value: "Completed", label: "Zrealizowana" },
  { value: "Cancelled", label: "Anulowana" },
];

const sessionTypeOptions = [
  { value: "", label: "Domyślnie" },
  { value: "PersonalTraining", label: "Trening personalny" },
  { value: "DuoTraining", label: "Trening 2:1" },
  { value: "GroupTraining", label: "Trening grupowy" },
  { value: "Consultation", label: "Konsultacja" },
];

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

function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
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

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function sortSessions(sessions: OwnerSession[]) {
  return [...sessions].sort(
    (first, second) =>
      new Date(first.startAt).getTime() - new Date(second.startAt).getTime(),
  );
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

function getSessionStatusLabel(status?: string | null) {
  const normalized = (status || "").toLowerCase();

  if (normalized.includes("cancel")) return "Anulowana";
  if (normalized.includes("complete") || normalized.includes("done")) {
    return "Zrealizowana";
  }
  if (normalized.includes("active")) return "Aktywna";

  return "Zaplanowana";
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

function getBillingScenario(session: OwnerSession) {
  const participant = session.participants?.find(
    (item) => item.actualBillingType || item.plannedBillingType,
  );

  return (
    participant?.actualBillingType ||
    participant?.plannedBillingType ||
    session.primaryOutlookCategory ||
    "Brak billing"
  );
}

function getSessionTone(session: OwnerSession) {
  const status = (session.status || "").toLowerCase();

  if (status.includes("cancel")) return "danger";
  if (status.includes("complete") || status.includes("done")) return "success";
  if (status.includes("progress") || status.includes("active"))
    return "primary";

  return "neutral";
}

function getToneClasses(session: OwnerSession) {
  const tone = getSessionTone(session);

  if (tone === "danger") {
    return "border-error/25 bg-error-container/20";
  }

  if (tone === "success") {
    return "border-tertiary/25 bg-tertiary-container/20";
  }

  if (tone === "primary") {
    return "border-primary/35 bg-primary/15";
  }

  return "border-white/8 bg-surface-container-low";
}

function getDefaultFormValues({
  session,
  date,
  trainers,
  locations,
}: {
  session: OwnerSession | null;
  date: Date;
  trainers: Trainer[];
  locations: Location[];
}): SessionFormValues {
  if (session) {
    return {
      title: session.title || "",
      startAt: toDateTimeLocalValue(new Date(session.startAt)),
      endAt: toDateTimeLocalValue(new Date(session.endAt)),
      trainerId: String(session.trainerId || ""),
      locationId: String(session.locationId || ""),
      status: session.status || "",
      plannedSessionType: session.plannedSessionType || "",
      outlookCategories: session.outlookCategories?.join(", ") || "",
      participantIds:
        session.participants
          ?.map((participant) => String(participant.clientId))
          .filter(Boolean) || [],
      note: session.note || "",
    };
  }

  const start = new Date(date);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + 1);

  return {
    title: "",
    startAt: toDateTimeLocalValue(start),
    endAt: toDateTimeLocalValue(end),
    trainerId: trainers[0]?.id ? String(trainers[0].id) : "",
    locationId: locations[0]?.id ? String(locations[0].id) : "",
    status: "",
    plannedSessionType: "",
    outlookCategories: "",
    participantIds: [],
    note: "",
  };
}

function toSessionPayload(
  values: SessionFormValues,
  session: OwnerSession | null,
): SessionPayload {
  const trainerId = Number(values.trainerId);
  const locationId = Number(values.locationId);

  if (!trainerId) throw new Error("Wybierz trenera.");
  if (!locationId) throw new Error("Wybierz lokalizację.");
  if (!values.startAt || !values.endAt)
    throw new Error("Uzupełnij czas sesji.");

  if (!values.participantIds.length)
    throw new Error("Wybierz przynajmniej jednego klienta.");

  const startAt = new Date(values.startAt).toISOString();
  const endAt = new Date(values.endAt).toISOString();

  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw new Error("Koniec sesji musi być później niż start.");
  }

  const payload: SessionPayload = {
    title: values.title.trim() || null,
    note: values.note.trim() || null,
    startAt,
    endAt,
    trainerId,
    locationId,
  };

  if (values.status) {
    payload.status = values.status;
  }

  if (values.plannedSessionType) {
    payload.plannedSessionType = values.plannedSessionType;
  }

  const outlookCategories = values.outlookCategories
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (outlookCategories.length > 0) {
    payload.outlookCategories = outlookCategories;
  }

  payload.participants = values.participantIds.map((clientId) =>
    getParticipantPayload(Number(clientId), session),
  );

  return payload;
}

function getParticipantPayload(
  clientId: number,
  session: OwnerSession | null,
): SessionParticipantPayload {
  const existing = session?.participants?.find(
    (participant) => participant.clientId === clientId,
  );

  return {
    clientId,
    countsAgainstPackage: existing?.countsAgainstPackage ?? true,
    sessionsCharged: existing?.sessionsCharged ?? 1,
    note: existing?.note ?? null,
  };
}

function getClientDisplayName(client: Client) {
  const fullName = client.fullName?.trim();
  const composedName = `${client.firstName || ""} ${client.lastName || ""}`.trim();

  return fullName || composedName || `Klient #${client.id}`;
}

export default function SchedulePage() {
  const [view, setView] = useState<ScheduleView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [outlookStatus, setOutlookStatus] = useState<OutlookStatus | null>(
    null,
  );
  const [sessions, setSessions] = useState<OwnerSession[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedSession, setSelectedSession] = useState<OwnerSession | null>(
    null,
  );
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [isResourcesLoading, setIsResourcesLoading] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);

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

  async function loadResources() {
    try {
      setIsResourcesLoading(true);
      const [trainersData, locationsData, clientsData] = await Promise.all([
        getTrainers(),
        getLocations(),
        getClients(),
      ]);
      setTrainers(trainersData);
      setLocations(locationsData.filter((item) => item.isActive));
      setClients(clientsData);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nie udało się pobrać trenerów i lokalizacji.",
        { id: "owner-schedule-resources" },
      );
    } finally {
      setIsResourcesLoading(false);
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

    loadResources();
  }, [outlookStatus?.isConnected]);

  useEffect(() => {
    if (!outlookStatus?.isConnected) return;

    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlookStatus?.isConnected, period.fromIso, period.toIso]);

  function movePeriod(direction: -1 | 1) {
    setAnchorDate((current) =>
      addDays(current, view === "week" ? 7 * direction : direction),
    );
  }

  function openCreateModal() {
    setSelectedSession(null);
    setIsSessionModalOpen(true);
  }

  function openEditModal(session: OwnerSession) {
    setSelectedSession(session);
    setIsSessionModalOpen(true);
  }

  async function handleSaveSession(values: SessionFormValues) {
    try {
      setIsSavingSession(true);
      const payload = toSessionPayload(values, selectedSession);

      if (selectedSession) {
        await updateSession(selectedSession.id, payload);
        toast.success("Sesja została zaktualizowana.", {
          id: "owner-session-updated",
        });
      } else {
        await createSession(payload);
        toast.success("Sesja została dodana.", { id: "owner-session-created" });
      }

      await loadSessions();
      setIsSessionModalOpen(false);
      setSelectedSession(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Nie udało się zapisać sesji.",
        { id: "owner-session-save-error" },
      );
    } finally {
      setIsSavingSession(false);
    }
  }

  const connected = Boolean(outlookStatus?.isConnected);

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-label text-primary-light">Grafik</p>
            <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
              Sesje treningowe
            </h1>
            <p className="mt-3 max-w-[680px] text-sm leading-6 text-on-surface-variant">
              Widok sesji połączony z integracją Microsoft Outlook.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <ViewSwitch value={view} onChange={setView} />
            <DateNavigator
              view={view}
              anchorDate={anchorDate}
              periodLabel={period.label}
              onDateChange={setAnchorDate}
              onMove={movePeriod}
            />
            {connected ? (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  icon={
                    <RefreshCw
                      size={16}
                      className={isSessionsLoading ? "animate-spin" : ""}
                    />
                  }
                  onClick={loadSessions}
                  disabled={isSessionsLoading}
                >
                  Odśwież
                </Button>
                <Button
                  icon={<Plus size={16} />}
                  onClick={openCreateModal}
                  disabled={isResourcesLoading}
                >
                  Dodaj sesję
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {isStatusLoading ? (
          <div className="card-shell p-6 text-on-surface-variant">
            Sprawdzanie połączenia z Microsoft Outlook...
          </div>
        ) : !connected ? (
          <OutlookRequiredState />
        ) : view === "week" ? (
          <WeekSchedule
            days={weekDays}
            sessions={visibleSessions}
            isLoading={isSessionsLoading}
            onSelectSession={openEditModal}
          />
        ) : (
          <DaySchedule
            date={anchorDate}
            sessions={visibleSessions}
            isLoading={isSessionsLoading}
            onSelectSession={openEditModal}
          />
        )}
      </div>

      <SessionEditorModal
        key={
          isSessionModalOpen
            ? selectedSession
              ? `session-${selectedSession.id}`
              : `new-${toDateInputValue(anchorDate)}`
            : "closed"
        }
        open={isSessionModalOpen}
        session={selectedSession}
        anchorDate={anchorDate}
        trainers={trainers}
        locations={locations}
        clients={clients}
        isSaving={isSavingSession}
        onClose={() => {
          setIsSessionModalOpen(false);
          setSelectedSession(null);
        }}
        onSubmit={handleSaveSession}
      />
    </>
  );
}

function ViewSwitch({
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

function DateNavigator({
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

      <div className="flex h-10 min-w-[220px] items-center justify-center gap-2 rounded-[10px] bg-surface-container-low px-3 text-sm font-semibold text-on-surface">
        <CalendarDays size={16} className="text-primary-light" />
        {view === "day" ? (
          <input
            type="date"
            value={toDateInputValue(anchorDate)}
            onChange={(event) =>
              onDateChange(new Date(`${event.target.value}T12:00:00`))
            }
            className="h-8 min-h-0 w-[150px] border-0 bg-transparent px-2 py-0 text-sm font-semibold shadow-none"
          />
        ) : (
          <span className="whitespace-nowrap">{periodLabel}</span>
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

function WeekSchedule({
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

function DaySchedule({
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
        <MetaChip
          icon={<UserRound size={14} />}
          label="Trener"
          value={session.trainerFullName || "Brak"}
          tone="primary"
        />
        <MetaChip
          icon={<MapPin size={14} />}
          label="Lokalizacja"
          value={session.locationName || "Brak"}
          tone="neutral"
        />
        <MetaChip
          icon={<WalletCards size={14} />}
          label="BillingScenario"
          value={getBillingScenario(session)}
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

function MetaChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "primary" | "neutral" | "success";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/15 text-primary-light"
      : tone === "success"
        ? "bg-tertiary-container/25 text-tertiary-light"
        : "bg-surface-container text-on-surface-variant";

  return (
    <span
      className={[
        "flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2",
        toneClass,
      ].join(" ")}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[9px] font-semibold uppercase tracking-wider opacity-70">
          {label}
        </span>
        <span className="block truncate text-xs font-semibold">{value}</span>
      </span>
    </span>
  );
}

function SessionEditorModal({
  open,
  session,
  anchorDate,
  trainers,
  locations,
  clients,
  isSaving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  session: OwnerSession | null;
  anchorDate: Date;
  trainers: Trainer[];
  locations: Location[];
  clients: Client[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: SessionFormValues) => void;
}) {
  const [values, setValues] = useState<SessionFormValues>(() =>
    getDefaultFormValues({ session, date: anchorDate, trainers, locations }),
  );

  if (!open) return null;

  const trainerOptions = trainers.map((trainer) => ({
    value: String(trainer.id),
    label: trainer.fullName || `${trainer.firstName} ${trainer.lastName}`,
  }));
  const locationOptions = locations.map((location) => ({
    value: String(location.id),
    label: location.name || location.city || `Lokalizacja ${location.id}`,
  }));
  const selectedClientIds = new Set(values.participantIds);
  const selectedTrainerId = Number(values.trainerId);
  const orderedClients = [...clients].sort((first, second) => {
    const firstSelected = selectedClientIds.has(String(first.id));
    const secondSelected = selectedClientIds.has(String(second.id));

    if (firstSelected !== secondSelected) return firstSelected ? -1 : 1;

    const firstSameTrainer = first.trainerId === selectedTrainerId;
    const secondSameTrainer = second.trainerId === selectedTrainerId;

    if (firstSameTrainer !== secondSameTrainer) {
      return firstSameTrainer ? -1 : 1;
    }

    return getClientDisplayName(first).localeCompare(
      getClientDisplayName(second),
      "pl",
    );
  });

  function updateValue(
    key: Exclude<keyof SessionFormValues, "participantIds">,
    value: string,
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleParticipant(clientId: string) {
    setValues((current) => ({
      ...current,
      participantIds: current.participantIds.includes(clientId)
        ? current.participantIds.filter((id) => id !== clientId)
        : [...current.participantIds, clientId],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <button
        type="button"
        aria-label="Zamknij"
        className="absolute inset-0 bg-black/70 backdrop-blur-[4px]"
        onClick={onClose}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(values);
        }}
        className="relative z-10 max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[var(--radius-xl)] bg-surface-container p-5 shadow-ambient md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label text-primary-light">
              {session ? "Szczegóły sesji" : "Nowa sesja"}
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">
              {session ? getSessionTitle(session) : "Dodaj sesję do grafiku"}
            </h2>
            {session ? (
              <p className="mt-2 text-sm text-on-surface-variant">
                ID #{session.id} · {getSessionStatusLabel(session.status)}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition hover:text-on-surface"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {session ? (
          <div className="mt-5 grid gap-2 md:grid-cols-3">
            <MetaChip
              icon={<UserRound size={14} />}
              label="Trener"
              value={session.trainerFullName || "Brak"}
              tone="primary"
            />
            <MetaChip
              icon={<MapPin size={14} />}
              label="Lokalizacja"
              value={session.locationName || "Brak"}
              tone="neutral"
            />
            <MetaChip
              icon={<WalletCards size={14} />}
              label="BillingScenario"
              value={getBillingScenario(session)}
              tone="success"
            />
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Tytuł" className="md:col-span-2">
            <input
              value={values.title}
              onChange={(event) => updateValue("title", event.target.value)}
              placeholder="Np. Trening personalny"
              className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm outline-none"
            />
          </Field>

          <Field label="Start">
            <input
              type="datetime-local"
              value={values.startAt}
              onChange={(event) => updateValue("startAt", event.target.value)}
              className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm outline-none"
            />
          </Field>

          <Field label="Koniec">
            <input
              type="datetime-local"
              value={values.endAt}
              onChange={(event) => updateValue("endAt", event.target.value)}
              className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm outline-none"
            />
          </Field>

          <Field label="Trener">
            <CustomSelect
              value={values.trainerId}
              options={
                trainerOptions.length
                  ? trainerOptions
                  : [{ value: "", label: "Brak trenerów" }]
              }
              onChange={(value) => updateValue("trainerId", value)}
            />
          </Field>

          <Field label="Lokalizacja">
            <CustomSelect
              value={values.locationId}
              options={
                locationOptions.length
                  ? locationOptions
                  : [{ value: "", label: "Brak lokalizacji" }]
              }
              onChange={(value) => updateValue("locationId", value)}
            />
          </Field>

          <Field label="Klienci sesji" className="md:col-span-2">
            {orderedClients.length ? (
              <div className="grid max-h-[220px] gap-2 overflow-y-auto rounded-[var(--radius-lg)] bg-surface-container-low p-2 md:grid-cols-2">
                {orderedClients.map((client) => {
                  const clientId = String(client.id);
                  const selected = selectedClientIds.has(clientId);

                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => toggleParticipant(clientId)}
                      className={[
                        "flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-left transition",
                        selected
                          ? "border-primary/60 bg-primary/10 text-on-surface"
                          : "border-transparent bg-surface-container text-on-surface-variant hover:border-white/10 hover:text-on-surface",
                      ].join(" ")}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {getClientDisplayName(client)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-on-surface-muted">
                          {client.email || client.phoneNumber || "Brak kontaktu"}
                        </span>
                      </span>
                      <span
                        className={[
                          "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                          selected
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-low text-on-surface-muted",
                        ].join(" ")}
                      >
                        {selected ? "Wybrany" : "Dodaj"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-3 text-sm text-on-surface-muted">
                Brak klientów do przypisania.
              </div>
            )}
          </Field>

          <Field label="Status">
            <CustomSelect
              value={values.status}
              options={statusOptions}
              onChange={(value) => updateValue("status", value)}
            />
          </Field>

          <Field label="Typ sesji">
            <CustomSelect
              value={values.plannedSessionType}
              options={sessionTypeOptions}
              onChange={(value) => updateValue("plannedSessionType", value)}
            />
          </Field>

          <Field label="Kategorie Outlook" className="md:col-span-2">
            <input
              value={values.outlookCategories}
              onChange={(event) =>
                updateValue("outlookCategories", event.target.value)
              }
              placeholder="Np. Personal, Paid"
              className="h-12 w-full rounded-[var(--radius-lg)] bg-surface-container-low px-4 text-sm outline-none"
            />
          </Field>

          <Field label="Notatka" className="md:col-span-2">
            <textarea
              value={values.note}
              onChange={(event) => updateValue("note", event.target.value)}
              rows={4}
              className="w-full resize-none rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-3 text-sm outline-none"
            />
          </Field>
        </div>

        {session?.participants?.length ? (
          <div className="mt-6 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
            <p className="text-label text-on-surface-muted">Uczestnicy</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {session.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="rounded-[var(--radius-md)] bg-surface-container px-3 py-2"
                >
                  <p className="text-sm font-semibold text-on-surface">
                    {participant.clientFullName ||
                      `Klient #${participant.clientId}`}
                  </p>
                  <p className="mt-1 text-xs text-on-surface-muted">
                    {participant.actualBillingType ||
                      participant.plannedBillingType ||
                      "Brak billing"}{" "}
                    · {participant.sessionsCharged} ses.
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Zamknij
          </Button>
          <Button
            type="submit"
            icon={session ? <Save size={16} /> : <Plus size={16} />}
            disabled={isSaving}
          >
            {isSaving
              ? "Zapisywanie..."
              : session
                ? "Zapisz zmiany"
                : "Dodaj sesję"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-label text-on-surface-muted">
        {label}
      </span>
      {children}
    </label>
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
    <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-6 text-on-surface-variant xl:col-span-2">
      Ładowanie sesji...
    </div>
  );
}
