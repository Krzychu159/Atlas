"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { showOwnerError, showOwnerSuccess } from "@/app/(app)/owner/components/owner-toast";
import { getClients, type Client } from "@/app/lib/owner/clients";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import { getOutlookStatus, type OutlookStatus } from "@/app/lib/owner/outlook";
import {
  createSession,
  getOwnerSessions,
  updateSession,
  type OwnerSession,
} from "@/app/lib/owner/sessions";
import { getTrainers, type Trainer } from "@/app/lib/owner/trainers";
import { isForbiddenError } from "@/app/lib/backend";
import {
  createTrainerPortalSession,
  getTrainerPortalClients,
  getTrainerPortalMe,
  getTrainerPortalSession,
  getTrainerPortalSessions,
  updateTrainerPortalSession,
  type TrainerPortalMe,
} from "@/app/lib/trainer/portal";
import {
  trainerPortalClientsToClients,
  trainerPortalMeToLocations,
  trainerPortalMeToTrainer,
  trainerPortalSessionsToOwnerSessions,
} from "@/app/lib/trainer/portal-mappers";
import {
  DateNavigator,
  ViewSwitch,
} from "@/app/(app)/owner/schedule/components/ScheduleControls";
import ScheduleFilters from "@/app/(app)/owner/schedule/components/ScheduleFilters";
import { OutlookRequiredState } from "@/app/(app)/owner/schedule/components/ScheduleStates";
import {
  DaySchedule,
  WeekSchedule,
} from "@/app/(app)/owner/schedule/components/ScheduleViews";
import SessionEditorModal from "@/app/(app)/owner/schedule/components/SessionEditorModal";
import {
  addDays,
  getPeriod,
  startOfWeek,
  toDateInputValue,
} from "@/app/(app)/owner/schedule/date-utils";
import {
  matchesStatusFilter,
  sortSessions,
  toSessionPayload,
} from "@/app/(app)/owner/schedule/session-utils";
import type {
  ScheduleView,
  SessionFormValues,
  SessionStatusFilter,
} from "@/app/(app)/owner/schedule/types";

export default function TrainerSchedulePage() {
  const [view, setView] = useState<ScheduleView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [outlookStatus, setOutlookStatus] = useState<OutlookStatus | null>(
    null,
  );
  const [sessions, setSessions] = useState<OwnerSession[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [me, setMe] = useState<TrainerPortalMe | null>(null);
  const [statusFilter, setStatusFilter] =
    useState<SessionStatusFilter>("without-cancelled");
  const [trainerFilter, setTrainerFilter] = useState("");
  const [selectedSession, setSelectedSession] = useState<OwnerSession | null>(
    null,
  );
  const [createSessionDate, setCreateSessionDate] = useState(() => new Date());
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [isResourcesLoading, setIsResourcesLoading] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isTrainerFilterReady, setIsTrainerFilterReady] = useState(false);
  const defaultTrainerApplied = useRef(false);

  const period = useMemo(() => getPeriod(view, anchorDate), [anchorDate, view]);
  const visibleSessions = useMemo(
    () =>
      sortSessions(
        sessions.filter((session) => matchesStatusFilter(session, statusFilter)),
      ),
    [sessions, statusFilter],
  );
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(anchorDate);

    return Array.from({ length: 6 }, (_, index) => addDays(weekStart, index));
  }, [anchorDate]);
  const modalTrainers = useMemo(() => {
    const selectedTrainerId = Number(trainerFilter);

    if (!selectedTrainerId) return trainers;

    const selectedTrainer = trainers.find(
      (trainer) => trainer.id === selectedTrainerId,
    );

    if (!selectedTrainer) return trainers;

    return [
      selectedTrainer,
      ...trainers.filter((trainer) => trainer.id !== selectedTrainerId),
    ];
  }, [trainerFilter, trainers]);

  async function loadOutlookStatus() {
    try {
      setIsStatusLoading(true);
      const data = await getOutlookStatus();
      setOutlookStatus(data);
    } catch (err) {
      showOwnerError(err, "Nie udało się sprawdzić połączenia Outlook.", {
        id: "trainer-schedule-outlook-status",
      });
      setOutlookStatus(null);
    } finally {
      setIsStatusLoading(false);
    }
  }

  async function loadResources() {
    try {
      setIsResourcesLoading(true);
      const meData = await getTrainerPortalMe().catch(() => null);
      const [trainersData, locationsData, clientsData] = await Promise.all([
        getTrainersForTrainerView(meData),
        getLocationsForTrainerView(meData),
        getClientsForTrainerView(meData),
      ]);

      setMe(meData);
      setTrainers(trainersData);
      setLocations(locationsData.filter((item) => item.isActive));
      setClients(clientsData);

      if (!defaultTrainerApplied.current) {
        defaultTrainerApplied.current = true;

        if (meData?.trainerId) {
          setTrainerFilter(String(meData.trainerId));
        }
      }
    } catch (err) {
      showOwnerError(err, "Nie udało się pobrać trenerów, klientów i lokalizacji.", {
        id: "trainer-schedule-resources",
      });
    } finally {
      setIsTrainerFilterReady(true);
      setIsResourcesLoading(false);
    }
  }

  async function getTrainersForTrainerView(meData: TrainerPortalMe | null) {
    try {
      return await getTrainers();
    } catch (err) {
      if (!isForbiddenError(err)) throw err;

      const currentTrainer = trainerPortalMeToTrainer(meData);

      return currentTrainer ? [currentTrainer] : [];
    }
  }

  async function getLocationsForTrainerView(meData: TrainerPortalMe | null) {
    try {
      return await getLocations();
    } catch (err) {
      if (!isForbiddenError(err)) throw err;

      return trainerPortalMeToLocations(meData);
    }
  }

  async function getClientsForTrainerView(meData: TrainerPortalMe | null) {
    try {
      return await getClients();
    } catch (err) {
      if (!isForbiddenError(err)) throw err;

      const portalClients = await getTrainerPortalClients();

      return trainerPortalClientsToClients(portalClients, meData);
    }
  }

  async function loadSessions() {
    try {
      setIsSessionsLoading(true);
      const data = await getSessionsForTrainerView();
      setSessions(data);
    } catch (err) {
      showOwnerError(err, "Nie udało się pobrać sesji.", {
        id: "trainer-schedule-sessions",
      });
      setSessions([]);
    } finally {
      setIsSessionsLoading(false);
    }
  }

  async function getSessionsForTrainerView() {
    try {
      return await getOwnerSessions({
        from: period.fromIso,
        to: period.toIso,
        trainerId: trainerFilter ? Number(trainerFilter) : undefined,
        status:
          statusFilter !== "all" && statusFilter !== "without-cancelled"
            ? statusFilter
            : undefined,
      });
    } catch (err) {
      if (!isForbiddenError(err)) throw err;

      if (
        trainerFilter &&
        me?.trainerId &&
        Number(trainerFilter) !== me.trainerId
      ) {
        return [];
      }

      const portalSessions = await getTrainerPortalSessions();

      return trainerPortalSessionsToOwnerSessions({
        sessions: portalSessions,
        me,
        clients,
      }).filter((session) => {
        const start = new Date(session.startAt).getTime();

        return start >= period.from.getTime() && start <= period.to.getTime();
      });
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOutlookStatus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!outlookStatus?.isConnected) return;

    const timer = window.setTimeout(() => {
      void loadResources();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [outlookStatus?.isConnected]);

  useEffect(() => {
    if (!outlookStatus?.isConnected || !isTrainerFilterReady) return;

    const timer = window.setTimeout(() => {
      void loadSessions();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    outlookStatus?.isConnected,
    isTrainerFilterReady,
    period.fromIso,
    period.toIso,
    trainerFilter,
    statusFilter,
  ]);

  function movePeriod(direction: -1 | 1) {
    setAnchorDate((current) =>
      addDays(current, view === "week" ? 7 * direction : direction),
    );
  }

  function openCreateModal(date = anchorDate) {
    setSelectedSession(null);
    setCreateSessionDate(date);
    setIsSessionModalOpen(true);
  }

  async function openEditModal(session: OwnerSession) {
    if (session.participants?.length) {
      setSelectedSession(session);
      setIsSessionModalOpen(true);
      return;
    }

    try {
      const detailedSession = await getTrainerPortalSession(session.id);

      setSelectedSession(detailedSession);
    } catch {
      setSelectedSession(session);
    }

    setIsSessionModalOpen(true);
  }

  async function handleSaveSession(values: SessionFormValues) {
    try {
      setIsSavingSession(true);
      const payload = toSessionPayload(values, selectedSession);

      if (selectedSession) {
        try {
          await updateSession(selectedSession.id, payload);
        } catch (err) {
          if (!isForbiddenError(err)) throw err;
          await updateTrainerPortalSession(selectedSession.id, payload);
        }
        showOwnerSuccess("Sesja została zaktualizowana.", {
          id: "trainer-session-updated",
        });
      } else {
        try {
          await createSession(payload);
        } catch (err) {
          if (!isForbiddenError(err)) throw err;
          await createTrainerPortalSession(payload);
        }
        showOwnerSuccess("Sesja została dodana.", {
          id: "trainer-session-created",
        });
      }

      await loadSessions();
      setIsSessionModalOpen(false);
      setSelectedSession(null);
    } catch (err) {
      showOwnerError(err, "Nie udało się zapisać sesji.", {
        id: "trainer-session-save-error",
      });
    } finally {
      setIsSavingSession(false);
    }
  }

  const connected = Boolean(outlookStatus?.isConnected);
  const trainerName = me?.fullName ? ` (${me.fullName})` : "";

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-label text-primary-light">Plan</p>
            <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
              Sesje treningowe
            </h1>
            <p className="mt-3 max-w-[760px] text-sm leading-6 text-on-surface-variant">
              Grafik pokazuje wszystkie sesje. Domyślnie filtr trenera ustawia
              się na zalogowanego trenera{trainerName}, ale możesz wybrać
              wszystkich albo konkretną osobę.
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
                  disabled={isSessionsLoading || !isTrainerFilterReady}
                >
                  Odśwież
                </Button>
                <Button
                  icon={<Plus size={16} />}
                  onClick={() => openCreateModal()}
                  disabled={isResourcesLoading}
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
            trainers={trainers}
            visibleCount={visibleSessions.length}
            onStatusFilterChange={setStatusFilter}
            onTrainerFilterChange={setTrainerFilter}
          />
        ) : null}

        {isStatusLoading ? (
          <div className="card-shell p-6 text-on-surface-variant">
            Sprawdzanie połączenia z Microsoft Outlook...
          </div>
        ) : !connected ? (
          <OutlookRequiredState settingsHref="/trainer/settings" />
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
        key={
          isSessionModalOpen
            ? selectedSession
              ? `session-${selectedSession.id}`
              : `new-${toDateInputValue(createSessionDate)}-${trainerFilter}`
            : "closed"
        }
        open={isSessionModalOpen}
        session={selectedSession}
        anchorDate={selectedSession ? anchorDate : createSessionDate}
        trainers={modalTrainers}
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
