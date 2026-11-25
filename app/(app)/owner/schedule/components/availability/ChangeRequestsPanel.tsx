"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Inbox, Loader2, MessageSquareText, TriangleAlert, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextArea } from "@/app/components/ui/input";
import { ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import {
  approveAvailabilityChangeRequest,
  getAvailabilityErrorMessage,
  getAvailabilitySchedule,
  rejectAvailabilityChangeRequest,
  type AvailabilityBusy,
  type AvailabilityChangeRequest,
  type AvailabilityDayChange,
  type AvailabilityRange,
} from "@/app/lib/availability";
import { addDaysIso, formatDayLabel, formatRanges, formatStudioDateTime, formatTime, formatWeekRange, toMinutes } from "@/app/lib/availability-time";
import { getOutlookColor } from "@/app/lib/calendar/outlook-colors";

type BusyByDate = Record<string, AvailabilityBusy[]>;

function requestedLabel(change: AvailabilityDayChange) {
  if (change.mode === "Template") return "jak zwykle (stały grafik)";
  return change.mode === "Off" || !change.ranges.length ? "brak dyspozycji" : formatRanges(change.ranges);
}

/** Sessions that would no longer fit in the requested hours. Unknown for "jak zwykle", so not checked there. */
function conflicts(change: AvailabilityDayChange, busy: AvailabilityBusy[] = []) {
  if (change.mode === "Template") return [];
  const allowed: AvailabilityRange[] = change.mode === "Off" ? [] : change.ranges;
  return busy.filter((session) => {
    const start = toMinutes(session.start) ?? 0;
    const end = toMinutes(session.end) ?? start;
    return !allowed.some((range) => (toMinutes(range.start) ?? 0) <= start && (toMinutes(range.end) ?? 0) >= end);
  });
}

export function ChangeRequestsPanel({
  requests,
  colors,
  onClose,
  onDecided,
}: {
  requests: AvailabilityChangeRequest[];
  /** Outlook category colour of each trainer, by id. */
  colors: Record<number, string | null>;
  onClose: () => void;
  onDecided: () => void;
}) {
  const [busy, setBusy] = useState<Record<number, BusyByDate>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  // Sessions planned in each requested week, to warn about requests that collide with them.
  // Read once per set of requests, not on every refresh of the schedule behind the panel.
  const requestKey = requests.map((request) => request.id).join(",");
  const requestsRef = useRef(requests);
  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);
  useEffect(() => {
    const controller = new AbortController();
    for (const request of requestsRef.current) {
      if (!request.weekStart) continue;
      getAvailabilitySchedule({ from: request.weekStart, to: addDaysIso(request.weekStart, 6), trainerId: request.trainerId }, controller.signal)
        .then((schedule) => {
          const days = schedule.trainers.find((trainer) => trainer.trainerId === request.trainerId)?.days ?? [];
          setBusy((current) => ({ ...current, [request.id]: Object.fromEntries(days.map((day) => [day.date, day.busy])) }));
        })
        .catch(() => { /* Collisions are a hint; the decision still works without them. */ });
    }
    return () => controller.abort();
  }, [requestKey]);

  async function decide(request: AvailabilityChangeRequest, approve: boolean, note: string) {
    setBusyId(request.id);
    try {
      await (approve ? approveAvailabilityChangeRequest : rejectAvailabilityChangeRequest)(request.id, note);
      showAppSuccess(approve ? "Zmiana zaakceptowana. Trener dostał powiadomienie." : "Prośba odrzucona. Trener dostał powiadomienie.");
      onDecided();
    } catch (error) {
      const known = getAvailabilityErrorMessage(error);
      showAppError(error, known ?? "Nie udało się zapisać decyzji. Spróbuj ponownie.");
      if (known) onDecided();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ModalOverlay onClose={busyId ? undefined : onClose} closeDisabled={busyId !== null} className="md:justify-end">
      <div role="dialog" aria-modal="true" aria-label="Prośby o zmianę dyspozycji"
        className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container shadow-ambient md:!my-0 md:h-[calc(100dvh-2rem)]">
        <div className="p-5 pb-3 md:p-6 md:pb-4">
          <ModalHeader
            eyebrow="Dyspozycje"
            title="Prośby o zmianę"
            description="Trenerzy proszą o zmianę godzin w tygodniach, które są już zablokowane. Po akceptacji zmiana od razu trafia do grafiku."
            icon={<MessageSquareText size={20} />}
            onClose={onClose}
          />
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-5 md:px-6">
          {requests.length ? requests.map((request) => (
            <RequestCard key={request.id} request={request} color={colors[request.trainerId] ?? null} busy={busy[request.id]}
              deciding={busyId === request.id} disabled={busyId !== null} onDecide={(approve, note) => void decide(request, approve, note)} />
          )) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Inbox size={28} className="text-on-surface-muted" aria-hidden="true" />
              <p className="text-sm text-on-surface-variant">Wszystkie prośby są rozpatrzone.</p>
            </div>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

function RequestCard({
  request,
  color,
  busy,
  deciding,
  disabled,
  onDecide,
}: {
  request: AvailabilityChangeRequest;
  color: string | null;
  busy?: BusyByDate;
  deciding: boolean;
  disabled: boolean;
  onDecide: (approve: boolean, note: string) => void;
}) {
  const [note, setNote] = useState("");
  const sent = formatStudioDateTime(request.createdAt);
  const collisions = request.days.flatMap((change) => conflicts(change, busy?.[change.date]).map((session) => ({ change, session })));

  return (
    <article className="space-y-3 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: getOutlookColor(color).bg }} />
            {request.trainerName ?? "Trener"}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-muted">Tydzień {formatWeekRange(request.weekStart)}{sent ? ` · wysłano ${sent}` : ""}</p>
        </div>
      </header>

      <ul className="space-y-1.5 text-sm">
        {request.days.map((change) => {
          const label = formatDayLabel(change.date);
          const current = request.currentDays.find((day) => day.date === change.date)?.ranges ?? [];
          return (
            <li key={change.date} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
              <span className="text-on-surface-variant">{label.weekday} {label.day} {label.month}</span>
              <span className="min-w-0">
                <span className="text-on-surface-muted line-through decoration-on-surface-muted/60">{current.length ? formatRanges(current) : "brak dyspozycji"}</span>
                <span aria-hidden="true" className="mx-1.5 text-on-surface-muted">→</span>
                <span className="font-semibold tabular-nums text-on-surface">{requestedLabel(change)}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {request.reason ? <p className="text-sm leading-6 text-on-surface-variant">„{request.reason}”</p> : null}

      {collisions.length ? (
        <div className="flex gap-2 rounded-[var(--radius-lg)] bg-warning-container/30 p-3 text-xs leading-5 text-warning-light">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Po zmianie te sesje będą poza dyspozycją:</p>
            <ul>
              {collisions.map(({ change, session }) => {
                const label = formatDayLabel(change.date);
                return <li key={session.sessionId}>{label.weekday} {label.day} {label.month}, {formatTime(session.start)}–{formatTime(session.end)}{session.title ? ` · ${session.title}` : ""}</li>;
              })}
            </ul>
            <p className="mt-1 text-warning-light/80">Sesje zostaną w grafiku — przenieś je, jeśli trzeba.</p>
          </div>
        </div>
      ) : null}

      <TextArea label="Notatka dla trenera (opcjonalnie)" value={note} onChange={setNote} rows={2} maxLength={500} disabled={disabled} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={disabled} icon={<X size={15} />} onClick={() => onDecide(false, note)}>Odrzuć</Button>
        <Button type="button" size="sm" disabled={disabled} icon={deciding ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} onClick={() => onDecide(true, note)}>
          {deciding ? "Zapisuję…" : "Akceptuj"}
        </Button>
      </div>
    </article>
  );
}
