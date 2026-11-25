"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquareText, PencilLine, UserRound } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { showAppSuccess } from "@/app/components/ui/app-toast";
import { OwnerReadState } from "../../../components/OwnerReadState";
import { useOwnerRead } from "../../../components/use-owner-read";
import {
  getAvailabilityChangeRequests,
  getAvailabilitySchedule,
  type AvailabilityScheduleTrainer,
  type AvailabilitySlot,
  type AvailabilityWeekState,
} from "@/app/lib/availability";
import { addDaysIso, mondayOf, studioToday } from "@/app/lib/availability-time";
import { getOutlookColor } from "@/app/lib/calendar/outlook-colors";
import type { Location } from "@/app/lib/owner/locations";
import { toDateInputValue } from "../../date-utils";
import type { ScheduleView } from "../../types";
import { AvailabilityGrid } from "./AvailabilityGrid";
import { ChangeRequestsPanel } from "./ChangeRequestsPanel";
import { ConsultationModal } from "./ConsultationModal";
import { TrainerWeekDrawer } from "./TrainerWeekDrawer";

type FreeTarget = { trainer: AvailabilityScheduleTrainer; date: string; slot: AvailabilitySlot };

const statusLabels = {
  Open: { label: "Do potwierdzenia", className: "text-warning-light" },
  Submitted: { label: "Potwierdzony", className: "text-tertiary-light" },
  Missed: { label: "Brak potwierdzenia", className: "text-error-light" },
} as const;

export function OwnerAvailabilityView({
  view,
  anchorDate,
  locationId,
  trainerFilter,
  onTrainerFilterChange,
  locations,
  revision,
  selfTrainerId,
  openSelfRequest,
  onSelectSession,
  onSessionsChanged,
}: {
  view: ScheduleView;
  anchorDate: Date;
  locationId: number | null;
  trainerFilter: string;
  onTrainerFilterChange: (value: string) => void;
  locations: Location[];
  revision: number;
  /** The owner's own trainer profile, when the owner also trains. */
  selfTrainerId: number | null;
  /** Changes when a link (e.g. a reminder to confirm) asks to open the owner's own availability. */
  openSelfRequest: string | null;
  onSelectSession: (sessionId: number) => void;
  /** A consultation was added, so the session list behind this view is stale. */
  onSessionsChanged: () => void;
}) {
  const [localRevision, setLocalRevision] = useState(0);
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

  const query = useMemo(() => ({ from: allDays[0], to: allDays[allDays.length - 1], locationId: locationId ?? undefined }), [allDays, locationId]);
  const loadSchedule = useCallback((signal: AbortSignal) => getAvailabilitySchedule(query, signal), [query]);
  const schedule = useOwnerRead(`availability:${JSON.stringify(query)}`, loadSchedule, "Nie udało się pobrać dyspozycji trenerów.", `${revision}:${localRevision}`);
  const loadRequests = useCallback((signal: AbortSignal) => getAvailabilityChangeRequests({ status: "Pending" }, signal), []);
  const requests = useOwnerRead("availability-requests", loadRequests, "Nie udało się pobrać próśb o zmianę.", `${revision}:${localRevision}`);

  const allTrainers = useMemo(() => schedule.data?.trainers ?? [], [schedule.data]);
  const visibleTrainers = useMemo(
    () => (trainerFilter ? allTrainers.filter((trainer) => String(trainer.trainerId) === trainerFilter) : allTrainers),
    [allTrainers, trainerFilter],
  );
  // Sunday appears only when someone actually works or is available then.
  const days = useMemo(() => {
    if (view !== "week") return allDays;
    const sunday = allDays[6];
    const used = visibleTrainers.some((trainer) => trainer.days.some((day) => day.date === sunday && (day.availability.length || day.busy.length)));
    return used ? allDays : allDays.slice(0, 6);
  }, [allDays, view, visibleTrainers]);
  const pending = useMemo(() => {
    const trainerIds = new Set(allTrainers.map((trainer) => trainer.trainerId));
    return (requests.data ?? []).filter((request) => !locationId || trainerIds.has(request.trainerId));
  }, [allTrainers, locationId, requests.data]);
  const colors = useMemo(() => Object.fromEntries(allTrainers.map((trainer) => [trainer.trainerId, trainer.outlookCategoryColor])), [allTrainers]);
  const selected = trainerFilter ? allTrainers.find((trainer) => String(trainer.trainerId) === trainerFilter) ?? null : null;

  const selfWeekOpen = allTrainers.find((trainer) => trainer.trainerId === selfTrainerId)?.weeks
    .some((week) => week.weekStart === weekStart && !week.isLocked && week.status === "Open") ?? false;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div role="group" aria-label="Trenerzy i potwierdzenia tygodnia" className="flex flex-wrap gap-1.5">
          {allTrainers.map((trainer) => (
            <TrainerChip key={trainer.trainerId} trainer={trainer} weekStart={weekStart}
              active={String(trainer.trainerId) === trainerFilter}
              onClick={() => onTrainerFilterChange(String(trainer.trainerId) === trainerFilter ? "" : String(trainer.trainerId))} />
          ))}
          {schedule.loading && !allTrainers.length ? <span className="h-9 w-64 animate-pulse rounded-full bg-surface-container" aria-hidden="true" /> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {selected && selected.trainerId !== selfTrainerId ? (
            <Button type="button" variant="secondary" size="sm" icon={<PencilLine size={15} className="text-primary-light" />}
              onClick={() => setEditing({ trainerId: selected.trainerId, name: selected.name })}>
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

function TrainerChip({
  trainer,
  weekStart,
  active,
  onClick,
}: {
  trainer: AvailabilityScheduleTrainer;
  weekStart: string;
  active: boolean;
  onClick: () => void;
}) {
  const week: AvailabilityWeekState | undefined = trainer.weeks.find((item) => item.weekStart === weekStart);
  const status = week ? statusLabels[week.status] : null;
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      title={active ? "Pokaż wszystkich trenerów" : `Pokaż tylko: ${trainer.name}`}
      className={[
        "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]",
        active ? "bg-primary/20 text-on-surface ring-1 ring-primary-light/60" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
      ].join(" ")}>
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: getOutlookColor(trainer.outlookCategoryColor).bg }} />
      {trainer.name}
      {status ? <span className={`font-medium ${status.className}`}>· {status.label}</span> : null}
      {week?.hasPendingChangeRequest ? <span className="font-medium text-warning-light">· prośba</span> : null}
    </button>
  );
}
