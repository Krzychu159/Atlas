"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
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
import { DateNavigator, ViewSwitch } from "./components/ScheduleControls";
import ScheduleFilters from "./components/ScheduleFilters";
import { OutlookRequiredState } from "./components/ScheduleStates";
import { DaySchedule, WeekSchedule } from "./components/ScheduleViews";
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
import { showOwnerError, showOwnerSuccess } from "../components/owner-toast";

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

  async function loadOutlookStatus() {
    try {
      setIsStatusLoading(true);
      const data = await getOutlookStatus();
      setOutlookStatus(data);
    } catch (err) {
      showOwnerError(err, "Nie udało się sprawdzić połączenia Outlook.", {
        id: "owner-schedule-outlook-status",
      });
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
      showOwnerError(err, "Nie udało się pobrać trenerów i lokalizacji.", {
        id: "owner-schedule-resources",
      });
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
        trainerId: trainerFilter ? Number(trainerFilter) : undefined,
        status:
          statusFilter !== "all" && statusFilter !== "without-cancelled"
            ? statusFilter
            : undefined,
      });
      setSessions(data);
    } catch (err) {
      showOwnerError(err, "Nie udało się pobrać sesji.", {
        id: "owner-schedule-sessions",
      });
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
  }, [
    outlookStatus?.isConnected,
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
        showOwnerSuccess("Sesja została zaktualizowana.", {
          id: "owner-session-updated",
        });
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
          <OutlookRequiredState />
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
              : `new-${toDateInputValue(createSessionDate)}`
            : "closed"
        }
        open={isSessionModalOpen}
        session={selectedSession}
        anchorDate={selectedSession ? anchorDate : createSessionDate}
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
