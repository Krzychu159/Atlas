"use client";

import { ApiError } from "@/app/lib/backend";
import { userMessage } from "@/app/lib/user-messages";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, Plus, RefreshCw } from "lucide-react";
import { useOwnerRead } from "../components/use-owner-read";
import { OwnerReadState } from "../components/OwnerReadState";
import { Button } from "@/app/components/ui/button";
import { getCurrentUser } from "@/app/lib/auth/current-user";
import { getClients, getOwnerClients, type Client } from "@/app/lib/owner/clients";
import {
  matchesOwnerLocationId,
  useOwnerLocationFilter,
} from "@/app/lib/owner/location-filter";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import { getOutlookStatus } from "@/app/lib/owner/outlook";
import {
  createSession,
  deleteSession,
  getSession,
  syncSessionToOutlook,
  createSessionSeries,
  getOwnerSessions,
  updateSession,
  type OwnerSession,
  type SessionRecurrence,
} from "@/app/lib/owner/sessions";
import { getTrainers, type Trainer } from "@/app/lib/owner/trainers";
import { DateNavigator, ViewSwitch } from "./components/ScheduleControls";
import ScheduleFilters, { countScheduleFilters, ScheduleFiltersToggle } from "./components/ScheduleFilters";
import { OutlookRequiredState } from "./components/ScheduleStates";
import { DaySchedule, WeekSchedule } from "./components/ScheduleViews";
import { completeConsultation, correctCompletedSession, correctionErrorMessage, isConsultationForm } from "@/app/(app)/owner/schedule/session-utils";
import OutlookIssuesPanel from "./components/OutlookIssuesPanel";
import { notifySessionCorrected, useSessionCorrectionRevision } from "@/app/lib/session-corrections";
import SessionEditorModal from "./components/SessionEditorModal";
import {
  addDays,
  getPeriod,
  startOfWeek,
  toDateInputValue,
} from "./date-utils";
import {
  matchesStatusFilter,
  sortSessions,
  toSessionPayload,
} from "./session-utils";
import type {
  ScheduleView,
  SessionFormValues,
  SessionStatusFilter,
} from "./types";
import { showOwnerError, showOwnerInfo, showOwnerSuccess } from "../components/owner-toast";

const EMPTY_TRAINERS: Trainer[] = [];
const EMPTY_LOCATIONS: Location[] = [];
const EMPTY_CLIENTS: Client[] = [];
const EMPTY_SESSIONS: OwnerSession[] = [];
const ISSUES_SECTION_ID = "problemy-z-kalendarzem";

export default function SchedulePage() {
  const [view, setView] = useState<ScheduleView>("week");
  const { selectedLocationId } = useOwnerLocationFilter();
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const outlook = useOwnerRead("outlook", getOutlookStatus, "Nie udało się sprawdzić połączenia z Outlookiem.");
  const connected = Boolean(outlook.data?.isConnected);
  const loadResources = useCallback(async (signal: AbortSignal) => {
    const [trainers, locations, clients, currentUser] = await Promise.all([
      getTrainers(signal), getLocations(signal), getClients(signal), getCurrentUser().catch(() => null),
    ]);
    const currentTrainer = trainers.find(trainer => String(trainer.userId) === currentUser?.id || trainer.email.toLowerCase() === currentUser?.email.toLowerCase());
    return { trainers, locations: locations.filter(item => item.isActive), clients, defaultTrainerId: currentTrainer?.id ?? null };
  }, []);
  const resources = useOwnerRead("schedule-resources", loadResources, "Nie udało się pobrać trenerów, klientów i lokalizacji.", 0, 0, connected);
  const trainers = resources.data?.trainers ?? EMPTY_TRAINERS;
  const locations = resources.data?.locations ?? EMPTY_LOCATIONS;
  const clients = resources.data?.clients ?? EMPTY_CLIENTS;
  const defaultTrainerId = resources.data?.defaultTrainerId ?? null;
  const [statusFilter, setStatusFilter] =
    useState<SessionStatusFilter>("without-cancelled");
  const [trainerFilter, setTrainerFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = countScheduleFilters(statusFilter, trainerFilter);
  const [selectedSession, setSelectedSession] = useState<OwnerSession | null>(
    null,
  );
  const [createSessionDate, setCreateSessionDate] = useState(() => new Date());
  const [createSessionStartAt, setCreateSessionStartAt] = useState<Date | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<number | null>(null);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [issueCount, setIssueCount] = useState<number | null>(null);
  const requestedSessionHandled = useRef(false);
  const calendarRevision = useSessionCorrectionRevision();
  const [sessionRevision, setSessionRevision] = useState(0);

  const period = useMemo(() => getPeriod(view, anchorDate), [anchorDate, view]);
  const scopedTrainers = useMemo(
    () =>
      trainers.filter((trainer) =>
        matchesOwnerLocationId(trainer, selectedLocationId),
      ),
    [selectedLocationId, trainers],
  );
  const scopedLocations = useMemo(
    () =>
      selectedLocationId
        ? locations.filter((location) => location.id === selectedLocationId)
        : locations,
    [locations, selectedLocationId],
  );
  const loadClientOptions = useCallback(async (search: string, page: number, locationId: number, signal: AbortSignal) => {
    const result = await getOwnerClients({ page, pageSize: 25, search: search || undefined, locationId, isArchived: false, sort: "name" }, signal);
    return { items: result.items ?? [], totalCount: result.totalCount, totalPages: result.totalPages };
  }, []);
  const modalTrainers = useMemo(() => {
    const currentTrainer = trainers.find(
      (trainer) => trainer.id === defaultTrainerId,
    );

    if (!currentTrainer) return scopedTrainers;

    return [
      currentTrainer,
      ...scopedTrainers.filter((trainer) => trainer.id !== currentTrainer.id),
    ];
  }, [defaultTrainerId, scopedTrainers, trainers]);
  const effectiveTrainerFilter = !trainerFilter || scopedTrainers.some(trainer => String(trainer.id) === trainerFilter) ? trainerFilter : "";
  const backendStatus = statusFilter === "all" || statusFilter === "without-cancelled" ? undefined : statusFilter;
  const sessionQuery = useMemo(() => ({ from: period.fromIso, to: period.toIso,
    trainerId: effectiveTrainerFilter ? Number(effectiveTrainerFilter) : undefined,
    locationId: selectedLocationId ?? undefined, status: backendStatus,
  }), [period.fromIso, period.toIso, effectiveTrainerFilter, selectedLocationId, backendStatus]);
  const readSessions = useCallback((signal: AbortSignal) => getOwnerSessions(sessionQuery, signal), [sessionQuery]);
  const sessionList = useOwnerRead(JSON.stringify(sessionQuery), readSessions, "Nie udało się pobrać sesji.", calendarRevision, 0, connected);
  const sessions = sessionList.data ?? EMPTY_SESSIONS;
  const isSessionsLoading = sessionList.loading;
  const isResourcesLoading = resources.loading;
  const detailRead = useRef<AbortController | null>(null);
  useEffect(() => () => detailRead.current?.abort(), [sessionQuery]);
  async function loadSessions() {
    try { await sessionList.reload(); } catch { /* The section displays its read error. */ }
  }

  const visibleSessions = useMemo(
    () =>
      sortSessions(
        sessions.filter(
          (session) =>
            matchesOwnerLocationId(session, selectedLocationId) &&
            matchesStatusFilter(session, statusFilter),
        ),
      ),
    [selectedLocationId, sessions, statusFilter],
  );
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(anchorDate);

    return Array.from({ length: 6 }, (_, index) => addDays(weekStart, index));
  }, [anchorDate]);

  useEffect(() => {
    if (!trainerFilter) return;

    const selectedTrainerVisible = scopedTrainers.some(
      (trainer) => String(trainer.id) === trainerFilter,
    );

    if (!selectedTrainerVisible) {
      void Promise.resolve().then(() => setTrainerFilter(""));
    }
  }, [scopedTrainers, trainerFilter]);

  function movePeriod(direction: -1 | 1) {
    setAnchorDate((current) =>
      addDays(current, view === "week" ? 7 * direction : direction),
    );
  }

  function openCreateModal(date = anchorDate, startAt?: Date) {
    detailRead.current?.abort();
    setPendingSessionId(null);
    setSelectedSession(null);
    setCreateSessionDate(date);
    setCreateSessionStartAt(startAt ?? null);
    setIsSessionModalOpen(true);
  }

  // Calendar issues in settings link here with ?sessionId=…
  useEffect(() => {
    if (!connected || requestedSessionHandled.current) return;
    requestedSessionHandled.current = true;
    const sessionId = Number(/[?&]sessionId=(\d+)/.exec(globalThis.location?.search ?? "")?.[1]);
    if (!Number.isSafeInteger(sessionId) || sessionId <= 0) return;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    void openEditModal({ id: sessionId });
    // openEditModal only reads refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  async function handleDeleteSession() {
    // A completed session is billed; it is corrected as "not held" instead of being deleted.
    if (!selectedSession || isSavingSession || selectedSession.status === "Completed") return;
    setSessionError(null);
    setIsSavingSession(true);
    try {
      await deleteSession(selectedSession.id);
      showOwnerSuccess("Sesja została usunięta z grafiku.");
      notifySessionCorrected();
      setIsSessionModalOpen(false);
      setSelectedSession(null);
      await loadSessions();
    } catch (err) {
      setSessionError(userMessage(err instanceof Error ? err.message : null, "Nie udało się usunąć sesji. Spróbuj ponownie."));
    } finally {
      setIsSavingSession(false);
    }
  }

  async function handleSyncSessionToOutlook() {
    if (!selectedSession || isSavingSession) return;
    setSessionError(null);
    setIsSavingSession(true);
    try {
      await syncSessionToOutlook(selectedSession.id);
      showOwnerSuccess("Sesja została wysłana do Outlooka.");
    } catch (err) {
      setSessionError(userMessage(err instanceof Error ? err.message : null, "Nie udało się wysłać sesji do Outlooka. Sprawdź połączenie z kalendarzem i spróbuj ponownie."));
    } finally {
      setIsSavingSession(false);
    }
  }

  async function openEditModal(session: Pick<OwnerSession, "id">) {
    setSessionError(null);
    detailRead.current?.abort();
    const controller = new AbortController();
    detailRead.current = controller;
    setPendingSessionId(session.id);
    try {
      const detailed = await getSession(session.id, controller.signal);
      if (controller.signal.aborted) return;
      setSelectedSession(detailed);
      setIsSessionModalOpen(true);
    } catch (err) {
      if (!controller.signal.aborted) showOwnerError(err, "Nie udało się pobrać szczegółów sesji.");
    } finally {
      if (detailRead.current === controller) setPendingSessionId(null);
    }
  }

  async function handleSaveSession(values: SessionFormValues, recurrence?: SessionRecurrence) {
    if (isSavingSession) return;
    if (selectedSession?.canEdit === false) { showOwnerError(new Error("Te zajęcia są dostępne tylko do podglądu."), "Te zajęcia są dostępne tylko do podglądu."); return; }
    setSessionError(null);
    if (selectedSession?.status === "Completed") {
      let mode: Awaited<ReturnType<typeof correctCompletedSession>>;
      try {
        setIsSavingSession(true);
        mode = await correctCompletedSession(selectedSession, values);
      } catch (err) {
        // Keep the entered correction so the owner can fix the cause and save again.
        setSessionError(correctionErrorMessage(err));
        setIsSavingSession(false);
        return;
      }
      try {
        showOwnerSuccess(mode === "not-held" ? "Sesja nie jest już rozliczona jako zrealizowana. Wejścia i salda klientów zostały przeliczone." : "Korekta została zapisana.");
        notifySessionCorrected();
        // A refresh failure must not turn a successful correction into a retry.
        try {
          const refreshed = await getSession(selectedSession.id);
          setSelectedSession(refreshed);
          setSessionRevision((current) => current + 1);
        } catch (err) {
          setIsSessionModalOpen(false);
          setSelectedSession(null);
          showOwnerError(err, "Korekta zapisana, ale nie udało się odświeżyć szczegółów.");
        }
        await loadSessions();
      } finally {
        setIsSavingSession(false);
      }
      return;
    }
    try {
      setIsSavingSession(true);
      const completingConsultation = Boolean(selectedSession) && isConsultationForm(values) && values.status === "Completed";
      // Save other edits with the current status, then complete through the dedicated endpoint.
      const payload = toSessionPayload(completingConsultation ? { ...values, status: selectedSession?.status || "" } : values, selectedSession);

      if (selectedSession && completingConsultation) {
        await updateSession(selectedSession.id, payload);
        await completeConsultation(selectedSession.id);
        notifySessionCorrected();
        showOwnerSuccess("Konsultacja została zakończona.", { id: "owner-session-updated" });
      } else if (selectedSession) {
        await updateSession(selectedSession.id, payload);
        showOwnerSuccess("Sesja została zaktualizowana.", {
          id: "owner-session-updated",
        });
      } else if (recurrence) {
        const result = await createSessionSeries(payload, recurrence);
        if (result.outlookSeriesSynced === false) {
          showOwnerInfo(userMessage(result.outlookSyncWarning, "Seria treningów jest zapisana w ATLAS, ale nie pojawiła się w Outlooku. Ponów synchronizację w ustawieniach."), {
            id: "owner-session-series-warning",
          });
        } else {
          showOwnerSuccess("Seria sesji została dodana.", {
            id: "owner-session-series-created",
          });
        }
      } else {
        await createSession(payload);
        showOwnerSuccess(isConsultationForm(values) ? "Konsultacja została dodana." : "Sesja została dodana.", {
          id: "owner-session-created",
        });
      }

      await loadSessions();
      setIsSessionModalOpen(false);
      setSelectedSession(null);
    } catch (err) {
      showOwnerError(err, "Nie udało się zapisać sesji.", {
        id: "owner-session-save-error",
      });
      if (err instanceof ApiError) {
        await loadSessions();
        if (selectedSession) {
          try { setSelectedSession(await getSession(selectedSession.id)); setSessionRevision(current => current + 1); }
          catch (refreshError) { setIsSessionModalOpen(false); setSelectedSession(null); showOwnerError(refreshError, "Nie udało się odświeżyć szczegółów zajęć."); }
        }
      }
    } finally {
      setIsSavingSession(false);
    }
  }


  return (
    <>
      <div className="flex w-full flex-col gap-3 pb-10 md:gap-4">
        <div className="flex flex-col gap-3 md:gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-label text-primary-light max-md:hidden">Grafik</p>
              <h1 className="font-display text-[1.5rem] font-semibold leading-[0.95] tracking-tight md:mt-2 md:text-[2.25rem]">
                Sesje treningowe
              </h1>
              <p className="mt-3 max-w-[680px] text-sm leading-6 text-on-surface-variant max-md:hidden">
                Planuj sesje i zarządzaj nimi. Grafik jest połączony z kalendarzem Microsoft Outlook.
              </p>
            </div>
            {connected ? (
              <Button
                icon={<Plus size={16} />}
                className="shrink-0 md:hidden"
                onClick={() => openCreateModal()}
                disabled={isResourcesLoading || resources.data === undefined}
              >
                Dodaj sesję
              </Button>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex gap-2 max-md:order-2">
              <div className="min-w-0 flex-1 [&>div]:h-full">
                <ViewSwitch value={view} onChange={setView} />
              </div>
              {connected ? (
                <>
                  <ScheduleFiltersToggle open={filtersOpen} activeCount={activeFilterCount} onOpenChange={setFiltersOpen} />
                  <CalendarIssuesButton count={issueCount} className="md:hidden" />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-12 w-12 shrink-0 md:hidden"
                    icon={<RefreshCw size={16} className={isSessionsLoading ? "animate-spin" : ""} />}
                    onClick={loadSessions}
                    disabled={isSessionsLoading}
                    aria-label="Odśwież grafik"
                    title="Odśwież grafik"
                  />
                </>
              ) : null}
            </div>
            <DateNavigator
              view={view}
              anchorDate={anchorDate}
              periodLabel={period.label}
              onDateChange={setAnchorDate}
              onMove={movePeriod}
            />
            {connected ? (
              <div className="hidden gap-2 md:ml-auto md:flex 2xl:ml-0">
                <CalendarIssuesButton count={issueCount} />
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-12 w-12"
                  icon={
                    <RefreshCw
                      size={16}
                      className={isSessionsLoading ? "animate-spin" : ""}
                    />
                  }
                  onClick={loadSessions}
                  disabled={isSessionsLoading}
                  aria-label="Odśwież grafik"
                  title="Odśwież grafik"
                />
                <Button
                  icon={<Plus size={16} />}
                  className="flex-1 sm:flex-none"
                  onClick={() => openCreateModal()}
                  disabled={isResourcesLoading || resources.data === undefined}
                >
                  Dodaj sesję
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {connected ? (
          <ScheduleFilters
            statusFilter={statusFilter}
            trainerFilter={trainerFilter}
            trainers={scopedTrainers}
            visibleCount={visibleSessions.length}
            mobileOpen={filtersOpen}
            onStatusFilterChange={setStatusFilter}
            onTrainerFilterChange={setTrainerFilter}
            onClear={() => {
              setStatusFilter("without-cancelled");
              setTrainerFilter("");
            }}
          />
        ) : null}

        <OwnerReadState loading={false} error={outlook.error} retry={outlook.retry} label="Sprawdzanie połączenia..." />
        {connected ? <>
          <OwnerReadState loading={false} error={resources.error} retry={resources.retry} label="Ładowanie danych grafiku..." />
          <OwnerReadState loading={false} error={sessionList.error} retry={sessionList.retry} label="Ładowanie sesji..." />
        </> : null}
        {outlook.loading ? (
          <div className="card-shell p-6 text-on-surface-variant">
            Sprawdzanie połączenia z Microsoft Outlook...
          </div>
        ) : !connected ? (
          outlook.error ? null : <OutlookRequiredState />
        ) : view === "week" ? (
          <WeekSchedule
            days={weekDays}
            sessions={visibleSessions}
            isLoading={isSessionsLoading}
            selectedSessionId={isSessionModalOpen ? selectedSession?.id : null}
            pendingSessionId={pendingSessionId}
            onSelectSession={openEditModal}
            onCreateSession={openCreateModal}
          />
        ) : (
          <DaySchedule
            date={anchorDate}
            sessions={visibleSessions}
            isLoading={isSessionsLoading}
            selectedSessionId={isSessionModalOpen ? selectedSession?.id : null}
            pendingSessionId={pendingSessionId}
            onSelectSession={openEditModal}
            onCreateSession={openCreateModal}
          />
        )}
        {connected ? <OutlookIssuesPanel id={ISSUES_SECTION_ID} onCountChange={setIssueCount} onOpenSession={id => void openEditModal({ id })} /> : null}
      </div>

      <SessionEditorModal
        allowCorrectionHistory
        allowRecurringSessions
        allowPublicSessions
        key={
          isSessionModalOpen
            ? selectedSession
              ? `session-${selectedSession.id}-${sessionRevision}`
              : `new-${toDateInputValue(createSessionDate)}`
            : "closed"
        }
        open={isSessionModalOpen}
        session={selectedSession}
        anchorDate={selectedSession ? anchorDate : createSessionDate}
        defaultStartAt={selectedSession ? null : createSessionStartAt}
        trainers={modalTrainers}
        locations={scopedLocations}
        clients={clients}
        loadClientOptions={loadClientOptions}
        defaultTrainerId={defaultTrainerId}
        isSaving={isSavingSession}
        saveError={sessionError}
        onDelete={selectedSession && selectedSession.status !== "Completed" ? handleDeleteSession : undefined}
        onSyncOutlook={selectedSession && selectedSession.status !== "Cancelled" ? handleSyncSessionToOutlook : undefined}
        onClose={() => {
          if (isSavingSession) return;
          setSessionError(null);
          detailRead.current?.abort();
          setIsSessionModalOpen(false);
          setSelectedSession(null);
        }}
        onSubmit={handleSaveSession}
        onGroupEnrollmentChanged={async () => {
          if (!selectedSession) return;
          const [updated] = await Promise.all([getSession(selectedSession.id), loadSessions()]);
          setSelectedSession(updated);
        }}
      />
    </>
  );
}

function CalendarIssuesButton({ count, className = "" }: { count: number | null; className?: string }) {
  const hasIssues = (count ?? 0) > 0;
  const label = hasIssues ? `Problemy z kalendarzem: ${count}. Przejdź do listy` : "Brak problemów z kalendarzem";
  return (
    <Button
      variant="secondary"
      size="icon"
      className={["relative h-12 w-12 shrink-0", className].join(" ")}
      icon={<CircleAlert size={18} className={hasIssues ? "text-error-light" : "text-on-surface-muted"} />}
      disabled={!hasIssues}
      onClick={() => document.getElementById(ISSUES_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" })}
      aria-label={label}
      title={label}
    >
      {hasIssues ? <span aria-hidden="true" className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-error ring-2 ring-surface-container-low" /> : null}
    </Button>
  );
}
