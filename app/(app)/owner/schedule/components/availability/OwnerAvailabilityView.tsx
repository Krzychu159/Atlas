"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquareText, PencilLine, UserRound } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { showAppSuccess } from "@/app/components/ui/app-toast";
import { AvailabilityGrid } from "@/app/components/availability/AvailabilityGrid";
import { TrainerStrip } from "@/app/components/availability/TrainerStrip";
import { OwnerReadState } from "../../../components/OwnerReadState";
import { useOwnerRead } from "../../../components/use-owner-read";
import {
  getAvailabilityChangeRequests,
  getAvailabilitySchedule,
  type AvailabilityScheduleTrainer,
  type AvailabilitySlot,
} from "@/app/lib/availability";
import { addDaysIso, mondayOf, studioToday } from "@/app/lib/availability-time";
import type { Location } from "@/app/lib/owner/locations";
import { toDateInputValue } from "../../date-utils";
import type { ScheduleView } from "../../types";
import { ChangeRequestsPanel } from "./ChangeRequestsPanel";
import { ConsultationModal, type TrainingDraft } from "./ConsultationModal";
import { TrainerWeekDrawer } from "./TrainerWeekDrawer";
import { visibleWeekDays } from "@/app/components/availability/visible-days";

type FreeTarget = { trainer: AvailabilityScheduleTrainer; date: string; slot: AvailabilitySlot };

export function OwnerAvailabilityView({
  view,
  anchorDate,
  locationId,
  initialTrainerId,
  locations,
  revision,
  selfTrainerId,
  openSelfRequest,
  onSelectSession,
  onCreateTraining,
  onSessionsChanged,
}: {
  view: ScheduleView;
  anchorDate: Date;
  locationId: number | null;
  /** The trainer picked in the sessions filter, shown first when switching to availability. */
  initialTrainerId: number | null;
  locations: Location[];
  revision: number;
  /** The owner's own trainer profile, when the owner also trains. */
  selfTrainerId: number | null;
  /** Changes when a link (e.g. a reminder to confirm) asks to open the owner's own availability. */
  openSelfRequest: string | null;
  onSelectSession: (sessionId: number) => void;
  /** Opens the regular session form, prefilled from a trainer's free time. */
  onCreateTraining: (draft: TrainingDraft) => void;
  /** A consultation was added, so the session list behind this view is stale. */
  onSessionsChanged: () => void;
}) {
  const [localRevision, setLocalRevision] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>(() => (initialTrainerId ? [initialTrainerId] : []));
  const [freeTarget, setFreeTarget] = useState<FreeTarget | null>(null);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [editing, setEditing] = useState<{ trainerId: number; name: string } | null>(null);
  const refresh = useCallback(() => setLocalRevision((value) => value + 1), []);
  const openSelf = useCallback(() => {
    if (selfTrainerId) setEditing({ trainerId: selfTrainerId, name: "Moja dyspozycja" });
  }, [selfTrainerId]);
  const handledSelfRequest = useRef<string | null>(null);
  useEffect(() => {
    if (!openSelfRequest || !selfTrainerId || handledSelfRequest.current === openSelfRequest) return;
    handledSelfRequest.current = openSelfRequest;
    void Promise.resolve().then(openSelf);
  }, [openSelf, openSelfRequest, selfTrainerId]);
  const today = studioToday();
  const anchor = toDateInputValue(anchorDate);
  const weekStart = mondayOf(anchor);
  const allDays = useMemo(
    () => (view === "week" ? Array.from({ length: 7 }, (_, index) => addDaysIso(weekStart, index)) : [anchor]),
    [anchor, view, weekStart],
  );

  // All trainers are read once: the strip needs everyone's status, and picking trainers only filters the calendar.
  const query = useMemo(() => ({ from: allDays[0], to: allDays[allDays.length - 1], locationId: locationId ?? undefined }), [allDays, locationId]);
  const loadSchedule = useCallback((signal: AbortSignal) => getAvailabilitySchedule(query, signal), [query]);
  const schedule = useOwnerRead(`availability:${JSON.stringify(query)}`, loadSchedule, "Nie udało się pobrać dyspozycji trenerów.", `${revision}:${localRevision}`);
  const loadRequests = useCallback((signal: AbortSignal) => getAvailabilityChangeRequests({ status: "Pending" }, signal), []);
  const requests = useOwnerRead("availability-requests", loadRequests, "Nie udało się pobrać próśb o zmianę.", `${revision}:${localRevision}`);

  const allTrainers = useMemo(() => schedule.data?.trainers ?? [], [schedule.data]);
  const shownIds = useMemo(() => selectedIds.filter((id) => allTrainers.some((trainer) => trainer.trainerId === id)), [allTrainers, selectedIds]);
  const visibleTrainers = useMemo(
    () => (shownIds.length ? allTrainers.filter((trainer) => shownIds.includes(trainer.trainerId)) : allTrainers),
    [allTrainers, shownIds],
  );
  const days = useMemo(() => visibleWeekDays(allDays, visibleTrainers, view === "week"), [allDays, view, visibleTrainers]);
  const pending = useMemo(() => {
    const trainerIds = new Set(allTrainers.map((trainer) => trainer.trainerId));
    return (requests.data ?? []).filter((request) => !locationId || trainerIds.has(request.trainerId));
  }, [allTrainers, locationId, requests.data]);
  const colors = useMemo(() => Object.fromEntries(allTrainers.map((trainer) => [trainer.trainerId, trainer.outlookCategoryColor])), [allTrainers]);
  const single = shownIds.length === 1 ? allTrainers.find((trainer) => trainer.trainerId === shownIds[0]) ?? null : null;
  const selfWeekOpen = allTrainers.find((trainer) => trainer.trainerId === selfTrainerId)?.weeks
    .some((week) => week.weekStart === weekStart && !week.isLocked && week.status === "Open") ?? false;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <TrainerStrip trainers={allTrainers} selectedIds={shownIds} onChange={setSelectedIds} statusWeek={weekStart} loading={schedule.loading} />
        <div className="flex shrink-0 flex-wrap gap-2">
          {single && single.trainerId !== selfTrainerId ? (
            <Button type="button" variant="secondary" size="sm" icon={<PencilLine size={15} className="text-primary-light" />}
              onClick={() => setEditing({ trainerId: single.trainerId, name: single.name })}>
              Edytuj dyspozycję
            </Button>
          ) : null}
          {selfTrainerId ? (
            <Button type="button" variant="secondary" size="sm" icon={<UserRound size={15} className="text-primary-light" />} onClick={openSelf}>
              Moja dyspozycja{selfWeekOpen ? " · do potwierdzenia" : ""}
            </Button>
          ) : null}
          <Button type="button" variant={pending.length ? "primary" : "secondary"} size="sm" icon={<MessageSquareText size={15} />} onClick={() => setRequestsOpen(true)}>
            Prośby o zmianę{pending.length ? ` (${pending.length})` : ""}
          </Button>
        </div>
      </div>

      <OwnerReadState loading={false} error={schedule.error} retry={schedule.retry} label="Wczytywanie dyspozycji..." />
      <AvailabilityGrid
        days={days}
        trainers={visibleTrainers}
        isLoading={schedule.loading}
        today={today}
        onSelectSession={onSelectSession}
        onSelectFree={(trainer, date, slot) => setFreeTarget({ trainer, date, slot })}
      />

      {freeTarget ? (
        <ConsultationModal
          trainer={freeTarget.trainer}
          date={freeTarget.date}
          slot={freeTarget.slot}
          locations={locations}
          onClose={() => setFreeTarget(null)}
          onCreated={() => {
            setFreeTarget(null);
            showAppSuccess("Konsultacja dodana do grafiku");
            refresh();
            onSessionsChanged();
          }}
          onCreateTraining={(draft) => {
            setFreeTarget(null);
            onCreateTraining(draft);
          }}
        />
      ) : null}
      {requestsOpen ? (
        <ChangeRequestsPanel requests={pending} colors={colors} onClose={() => setRequestsOpen(false)} onDecided={refresh} />
      ) : null}
      {editing ? (
        <TrainerWeekDrawer trainerId={editing.trainerId} trainerName={editing.name}
          // The current week is already locked; their own form opens on the next week to confirm.
          initialWeek={editing.trainerId === selfTrainerId && weekStart <= mondayOf(today) ? addDaysIso(mondayOf(today), 7) : weekStart}
          isSelf={editing.trainerId === selfTrainerId} onClose={() => setEditing(null)} onChanged={refresh} />
      ) : null}
    </div>
  );
}
