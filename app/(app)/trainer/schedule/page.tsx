"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import { ApiError } from "@/app/lib/backend";
import { trainerPaymentError } from "@/app/lib/trainer/payment-errors";
import { getOutlookStatus, type OutlookStatus } from "@/app/lib/calendar/outlook";
import { updateTrainerPortalSession, createTrainerPortalSession, getTrainerPortalClients, getTrainerPortalMe, getTrainerPortalSession, getTrainerPortalSessions, type TrainerPortalMe, type TrainerSessionDetails, type TrainerSessionPayload } from "@/app/lib/trainer/portal";
import { trainerPortalClientsToClients, trainerPortalMeToLocations, trainerPortalMeToTrainer, trainerPortalSessionsToCalendarSessions } from "@/app/lib/trainer/portal-mappers";
import { DateNavigator, ViewSwitch } from "@/app/(app)/owner/schedule/components/ScheduleControls";
import { DaySchedule, WeekSchedule } from "@/app/(app)/owner/schedule/components/ScheduleViews";
import SessionEditorModal from "@/app/(app)/owner/schedule/components/SessionEditorModal";
import { scheduleStatusFilterOptions } from "@/app/(app)/owner/schedule/options";
import { addDays, getPeriod, startOfWeek, toDateInputValue } from "@/app/(app)/owner/schedule/date-utils";
import { matchesStatusFilter, sortSessions, toSessionPayload } from "@/app/(app)/owner/schedule/session-utils";
import type { CalendarSession, ScheduleView, SessionFormValues, SessionStatusFilter } from "@/app/(app)/owner/schedule/types";
import { useSessionCorrectionRevision } from "@/app/lib/session-corrections";
import type { Client } from "@/app/lib/owner/clients";
import TrainerSessionDetailsModal from "./components/TrainerSessionDetailsModal";

export default function TrainerSchedulePage() {
  const [view, setView] = useState<ScheduleView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [me, setMe] = useState<TrainerPortalMe | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [statusFilter, setStatusFilter] = useState<SessionStatusFilter>("without-cancelled");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [outlookError, setOutlookError] = useState<string | null>(null);
  const [outlookStatus, setOutlookStatus] = useState<OutlookStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResourcesLoading, setIsResourcesLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainerSessionDetails | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [createDate, setCreateDate] = useState(() => new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const loadRevision = useRef(0);
  const detailRevision = useRef(0);
  const resourceRevision = useRef(0);
  const saving = useRef(false);
  const dashboardCreateHandled = useRef(false);
  const calendarRevision = useSessionCorrectionRevision();
  const period = useMemo(() => getPeriod(view, anchorDate, true), [view, anchorDate]);
  const locations = useMemo(() => trainerPortalMeToLocations(me), [me]);
  const trainers = useMemo(() => { const trainer = trainerPortalMeToTrainer(me); return trainer ? [trainer] : []; }, [me]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(anchorDate), index)), [anchorDate]);
  const visibleSessions = useMemo(() => sortSessions(sessions.filter(session => {
    const start = Date.parse(session.startAt), end = Date.parse(session.endAt);
    return start <= period.to.getTime() && end > period.from.getTime() && matchesStatusFilter(session, statusFilter);
  })), [sessions, period, statusFilter]);

  const loadSessions = useCallback(async () => {
    const revision = ++loadRevision.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getTrainerPortalSessions();
      if (revision !== loadRevision.current) return;
      setSessions(trainerPortalSessionsToCalendarSessions({ sessions: data }));
    } catch (error) {
      if (revision !== loadRevision.current) return;
      setLoadError(trainerPaymentError(error, "Nie udało się pobrać zajęć. Spróbuj ponownie."));
    } finally {
      if (revision === loadRevision.current) setIsLoading(false);
    }
  }, []);

  const loadResources = useCallback(async () => {
    const revision = ++resourceRevision.current;
    setIsResourcesLoading(true);
    setResourcesError(null);
    try {
      const [meData, clientData] = await Promise.all([getTrainerPortalMe(), getTrainerPortalClients()]);
      if (revision !== resourceRevision.current) return;
      setMe(meData);
      setClients(trainerPortalClientsToClients(clientData, meData));
    } catch (error) {
      if (revision !== resourceRevision.current) return;
      setResourcesError(trainerPaymentError(error, "Nie udało się pobrać danych potrzebnych do dodania zajęć."));
    } finally { if (revision === resourceRevision.current) setIsResourcesLoading(false); }
  }, []);

  useEffect(() => {
    void loadSessions();
    return () => { loadRevision.current += 1; detailRevision.current += 1; };
  }, [loadSessions, calendarRevision]);
  useEffect(() => { void loadResources(); return () => { resourceRevision.current += 1; }; }, [loadResources]);
  useEffect(() => {
    let active = true;
    getOutlookStatus().then(data => { if (active) setOutlookStatus(data); }).catch(error => {
      if (active) setOutlookError(trainerPaymentError(error, "Nie udało się sprawdzić połączenia z Outlookiem."));
    });
    return () => { active = false; };
  }, []);

  function openCreate(date = anchorDate) {
    if (isResourcesLoading || resourcesError || !me?.trainerId || !locations.length || saving.current) return;
    setCreateDate(date);
    setIsCreateOpen(true);
  }
  const openDetails = useCallback(async (session: Pick<CalendarSession, "id">) => {
    const revision = ++detailRevision.current;
    setIsDetailLoading(true);
    setSelectedSession(null);
    try {
      const details = await getTrainerPortalSession(session.id);
      if (revision === detailRevision.current) setSelectedSession(details);
    } catch (error) {
      if (revision === detailRevision.current) showAppError(new Error(trainerPaymentError(error, "Nie udało się pobrać szczegółów zajęć.")), "Nie udało się pobrać szczegółów zajęć.");
    } finally { if (revision === detailRevision.current) setIsDetailLoading(false); }
  }, []);
  async function handleCreate(values: SessionFormValues) {
    if (saving.current || !me?.trainerId || resourcesError) return;
    try {
      if (Number(values.trainerId) !== me.trainerId) throw new Error("Możesz dodawać tylko własne zajęcia.");
      if (!locations.some(location => location.id === Number(values.locationId))) throw new Error("Wybierz dostępną lokalizację.");
      if (!values.title.trim()) throw new Error("Podaj tytuł zajęć.");
      if (!["Planned", "Active"].includes(values.status)) throw new Error("Wybierz status zajęć.");
      if (values.participantIds.some(id => !clients.some(client => client.id === Number(id)))) throw new Error("Wybierz uczestników z listy swoich klientów.");
      const sessionsCharged = Number(values.newParticipantSessionsCharged);
      if (values.participantIds.length && (!values.newParticipantSessionsCharged?.trim() || !Number.isSafeInteger(sessionsCharged) || sessionsCharged < 0)) throw new Error("Podaj poprawną liczbę wejść na uczestnika.");
      const formPayload = toSessionPayload(values, null);
      const payload: TrainerSessionPayload = {
        title: values.title.trim(), note: values.note.trim() || null,
        startAt: formPayload.startAt, endAt: formPayload.endAt,
        trainerId: me.trainerId, locationId: Number(values.locationId), status: values.status,
        isPubliclyBookable: values.isPubliclyBookable,
        publicSlug: values.isPubliclyBookable ? values.publicSlug.trim() : null,
        publicCapacity: formPayload.publicCapacity ?? null,
        eventRules: formPayload.eventRules,
        registrationClosesBeforeMinutes: formPayload.registrationClosesBeforeMinutes,
        cancellationClosesBeforeMinutes: formPayload.cancellationClosesBeforeMinutes,
        plannedSessionType: values.isPubliclyBookable ? "Group" : values.plannedSessionType || null,
        outlookCategories: values.outlookCategories.split(",").map(value => value.trim()).filter(Boolean),
        participants: values.participantIds.map(id => ({ clientId: Number(id), countsAgainstPackage: values.newParticipantCountsAgainstPackage === true, sessionsCharged, note: null })),
      };
      saving.current = true;
      setIsSaving(true);
      await createTrainerPortalSession(payload);
      setIsCreateOpen(false);
      showAppSuccess("Zajęcia zostały dodane.");
      await loadSessions();
    } catch (error) {
      const message = trainerPaymentError(error, "Nie udało się dodać zajęć. Sprawdź wpisane dane i dostępność miejsc.");
      showAppError(new Error(message), message);
      if (error instanceof ApiError) await loadSessions();
    } finally { saving.current = false; setIsSaving(false); }
  }
  async function handleEdit(values: SessionFormValues) {
    const session = selectedSession;
    if (saving.current || !session || session.canEdit !== true || session.trainerId !== me?.trainerId) return;
    try {
      if (Number(values.trainerId) !== session.trainerId) throw new Error("Możesz edytować tylko własne zajęcia.");
      if (Number(values.locationId) !== session.locationId && !locations.some(location => location.id === Number(values.locationId))) throw new Error("Wybierz dostępną lokalizację.");
      if (!values.title.trim()) throw new Error("Podaj tytuł zajęć.");
      if (session.status === "Completed" && !values.correctionReason?.trim()) throw new Error("Podaj powód korekty.");
      const payload = toSessionPayload(values, session);
      if (values.participantsEdited) {
        if (!session.participants) throw new Error("Lista uczestników jest niedostępna. Odśwież zajęcia przed zmianą zapisów.");
        const oldIds = new Set((session.participants || []).map(participant => participant.clientId));
        if (values.participantIds.some(id => !oldIds.has(Number(id)) && !clients.some(client => client.id === Number(id)))) throw new Error("Wybierz uczestników z dostępnej listy klientów.");
        const charged = Number(values.newParticipantSessionsCharged);
        if (values.participantIds.some(id => !oldIds.has(Number(id))) && (!Number.isSafeInteger(charged) || charged < 0)) throw new Error("Podaj poprawną liczbę wejść na uczestnika.");
        payload.participants = values.participantIds.map(id => {
          const existing = session.participants?.find(participant => participant.clientId === Number(id));
          return { clientId: Number(id), countsAgainstPackage: existing?.countsAgainstPackage ?? values.newParticipantCountsAgainstPackage === true, sessionsCharged: existing?.sessionsCharged ?? charged, note: existing?.note ?? null };
        });
      }
      saving.current = true; setIsSaving(true);
      await updateTrainerPortalSession(session.id, { ...payload, title: values.title.trim(), correctionReason: values.correctionReason?.trim() || null });
      setIsEditOpen(false);
      showAppSuccess("Zmiany w zajęciach zostały zapisane.");
      await loadSessions();
      await openDetails({ id: session.id });
    } catch (error) {
      showAppError(new Error(trainerPaymentError(error, "Nie udało się zapisać zmian w zajęciach.")), "Nie udało się zapisać zmian w zajęciach.");
      if (error instanceof ApiError) {
        await loadSessions();
        try { setSelectedSession(await getTrainerPortalSession(session.id)); setEditorRevision(current => current + 1); }
        catch (refreshError) { setIsEditOpen(false); setSelectedSession(null); showAppError(new Error(trainerPaymentError(refreshError, "Nie udało się odświeżyć szczegółów zajęć.")), "Nie udało się odświeżyć szczegółów zajęć."); }
      }
    } finally { saving.current = false; setIsSaving(false); }
  }
  const canCreate = !isResourcesLoading && !resourcesError && Boolean(me?.trainerId) && locations.length > 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = Number(params.get("sessionId"));
    const date = params.get("date");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date + "T12:00:00"))) {
      setAnchorDate(new Date(date + "T12:00:00"));
      setView("day");
    }
    if (Number.isSafeInteger(sessionId) && sessionId > 0) void openDetails({ id: sessionId });
  }, [openDetails]);

  useEffect(() => {
    if (dashboardCreateHandled.current || isResourcesLoading || resourcesError) return;
    if (new URLSearchParams(window.location.search).get("action") !== "new") return;
    if (!canCreate) return;
    dashboardCreateHandled.current = true;
    setCreateDate(new Date());
    setIsCreateOpen(true);
  }, [canCreate, isResourcesLoading, resourcesError]);

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="text-label text-primary-light">Plan</p><h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-tight tracking-tight">Moje zajęcia</h1><p className="mt-3 text-sm leading-6 text-on-surface-variant">Własne treningi i zajęcia grupowe. Wybierz zajęcia, aby zobaczyć uczestników i szczegóły.</p></div>
          <div className="flex flex-wrap items-center gap-3"><ViewSwitch value={view} onChange={setView} /><DateNavigator view={view} anchorDate={anchorDate} periodLabel={period.label} onDateChange={setAnchorDate} onMove={direction => setAnchorDate(date => addDays(date, (view === "week" ? 7 : 1) * direction))} />
            <Button variant="secondary" icon={<RefreshCw size={16} />} disabled={isLoading || isSaving} onClick={() => void loadSessions()}>Odśwież</Button><Button icon={<Plus size={16} />} disabled={!canCreate || isSaving} onClick={() => openCreate()}>Dodaj sesję</Button></div>
        </div>
        <div className="card-shell flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><CustomSelect label="Status zajęć" value={statusFilter} options={scheduleStatusFilterOptions} onChange={value => setStatusFilter(value as SessionStatusFilter)} /><p className="text-sm text-on-surface-muted">{!isLoading && !loadError ? visibleSessions.length + " zajęć w wybranym terminie" : ""}</p></div>
        {resourcesError ? <div role="alert" className="card-shell p-4 text-sm text-on-surface-variant">{resourcesError}<Button variant="secondary" className="mt-3" onClick={() => void loadResources()}>Spróbuj ponownie</Button></div> : !isResourcesLoading && !locations.length ? <p className="card-shell p-4 text-sm text-on-surface-variant">Nie masz przypisanej lokalizacji. Ustal ją z właścicielem studia przed dodaniem zajęć.</p> : null}
        {outlookError || outlookStatus?.isConnected === false ? <div className="card-shell p-4 text-sm text-on-surface-variant">{outlookError || "Połącz Outlook, aby korzystać z synchronizacji kalendarza."}<Link href="/trainer/settings" className="ml-2 font-semibold text-primary-light">Ustawienia połączenia</Link></div> : null}
        {isDetailLoading ? <p role="status" className="text-sm text-on-surface-variant">Pobieranie szczegółów zajęć…</p> : null}
        {loadError && !isLoading ? <div role="alert" className="card-shell p-5 text-on-surface-variant">{loadError}<Button variant="secondary" className="mt-3" onClick={() => void loadSessions()}>Spróbuj ponownie</Button></div> : <>
          {!isLoading && !visibleSessions.length ? <p className="card-shell p-5 text-sm text-on-surface-variant">Brak zajęć w wybranym terminie i dla wybranego statusu.</p> : null}
          {view === "week" ? <WeekSchedule days={weekDays} sessions={visibleSessions} isLoading={isLoading} onSelectSession={openDetails} onCreateSession={canCreate ? openCreate : undefined} /> : <DaySchedule date={anchorDate} sessions={visibleSessions} isLoading={isLoading} onSelectSession={openDetails} onCreateSession={canCreate ? openCreate : undefined} />}
        </>}
      </div>
      {selectedSession && !isEditOpen ? <TrainerSessionDetailsModal session={selectedSession} onEdit={!isResourcesLoading && !resourcesError && selectedSession.trainerId === me?.trainerId ? () => { if (selectedSession.canEdit === true) setIsEditOpen(true); } : undefined} onClose={() => { detailRevision.current += 1; setSelectedSession(null); }} /> : null}
      {isEditOpen && selectedSession ? <SessionEditorModal key={"edit-" + selectedSession.id + "-" + editorRevision} open session={selectedSession} anchorDate={new Date(selectedSession.startAt)} trainers={trainers} locations={locations} clients={clients} defaultTrainerId={me?.trainerId} trainerAccess allowPublicSessions isSaving={isSaving} onClose={() => { if (!saving.current) setIsEditOpen(false); }} onSubmit={handleEdit} /> : null}
      <SessionEditorModal key={isCreateOpen ? "new-" + toDateInputValue(createDate) : "closed"} open={isCreateOpen} session={null} anchorDate={createDate} trainers={trainers} locations={locations} clients={clients} defaultTrainerId={me?.trainerId} trainerAccess allowPublicSessions isSaving={isSaving} onClose={() => { if (!saving.current) setIsCreateOpen(false); }} onSubmit={handleCreate} />
    </>
  );
}
