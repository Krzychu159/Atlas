"use client";

import { ApiError } from "@/app/lib/backend";
import { userMessage } from "@/app/lib/user-messages";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useOwnerRead } from "../components/use-owner-read";
import { OwnerReadState } from "../components/OwnerReadState";
import { Button } from "@/app/components/ui/button";
import { getCurrentUser } from "@/app/lib/auth/current-user";
import { getClients, type Client } from "@/app/lib/owner/clients";
import {
  matchesOwnerLocationId,
  useOwnerLocationFilter,
} from "@/app/lib/owner/location-filter";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import { getOutlookStatus } from "@/app/lib/owner/outlook";
import {
  createSession,
  getSession,
  createSessionSeries,
  getOwnerSessions,
  updateSession,
  type OwnerSession,
  type SessionRecurrence,
} from "@/app/lib/owner/sessions";
import { getTrainers, type Trainer } from "@/app/lib/owner/trainers";
import { DateNavigator, ViewSwitch } from "./components/ScheduleControls";
import ScheduleFilters from "./components/ScheduleFilters";
import { OutlookRequiredState } from "./components/ScheduleStates";
import { DaySchedule, WeekSchedule } from "./components/ScheduleViews";
import { correctCompletedSession } from "@/app/(app)/owner/schedule/session-utils";
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
  const [selectedSession, setSelectedSession] = useState<OwnerSession | null>(
    null,
  );
  const [createSessionDate, setCreateSessionDate] = useState(() => new Date());
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
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
  const scopedClients = useMemo(
    () =>
      clients.filter((client) =>
        matchesOwnerLocationId(client, selectedLocationId),
      ),
    [clients, selectedLocationId],
  );
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

  function openCreateModal(date = anchorDate) {
    detailRead.current?.abort();
    setSelectedSession(null);
    setCreateSessionDate(date);
    setIsSessionModalOpen(true);
  }

  async function openEditModal(session: OwnerSession) {
    detailRead.current?.abort();
    const controller = new AbortController();
    detailRead.current = controller;
    try {
      const detailed = await getSession(session.id, controller.signal);
      if (controller.signal.aborted) return;
      setSelectedSession(detailed);
      setIsSessionModalOpen(true);
    } catch (err) {
      if (!controller.signal.aborted) showOwnerError(err, "Nie udało się pobrać szczegółów sesji.");
    }
  }

  async function handleSaveSession(values: SessionFormValues, recurrence?: SessionRecurrence) {
    if (isSavingSession) return;
    if (selectedSession?.canEdit === false) { showOwnerError(new Error("Te zajęcia są dostępne tylko do podglądu."), "Te zajęcia są dostępne tylko do podglądu."); return; }
    try {
      setIsSavingSession(true);
      if (selectedSession?.status === "Completed") {
        await correctCompletedSession(selectedSession, values);
        showOwnerSuccess("Korekta została zapisana.");
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
        return;
      }
      const payload = toSessionPayload(values, selectedSession);

      if (selectedSession) {
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
        showOwnerSuccess("Sesja została dodana.", {
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
            onStatusFilterChange={setStatusFilter}
            onTrainerFilterChange={setTrainerFilter}
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
            onSelectSession={openEditModal}
            onCreateSession={openCreateModal}
          />
        ) : (
          <DaySchedule
            date={anchorDate}
            sessions={visibleSessions}
            isLoading={isSessionsLoading}
            onSelectSession={openEditModal}
            onCreateSession={openCreateModal}
          />
        )}
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
        trainers={modalTrainers}
        locations={scopedLocations}
        clients={scopedClients}
        defaultTrainerId={defaultTrainerId}
        isSaving={isSavingSession}
        onClose={() => {
          if (isSavingSession) return;
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
