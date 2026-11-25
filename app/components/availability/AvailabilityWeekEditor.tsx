"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarCheck2, Repeat } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { RetryNotice } from "@/app/components/ui/retry-notice";
import { showAppError, showAppInfo, showAppSuccess } from "@/app/components/ui/app-toast";
import { getErrorMessage, isAbortError } from "@/app/lib/backend";
import {
  cancelAvailabilityChangeRequest,
  getAvailabilityChangeRequests,
  getAvailabilityError,
  getAvailabilityErrorCode,
  getAvailabilityErrorMessage,
  getAvailabilityWeek,
  saveAvailabilityWeek,
  submitAvailabilityWeek,
  type AvailabilityChangeRequest,
  type AvailabilityWeek,
  type AvailabilityWeekDay,
} from "@/app/lib/availability";
import { formatDayLabel, formatRanges, studioToday } from "@/app/lib/availability-time";
import { dayDraft, draftRanges, isDraftComplete, sameDraft, toDayPayload, type DayDraft } from "@/app/lib/availability-days";
import { AvailabilityDayRow, CopyToNextDaysButton, WEEK_DAY_MODES } from "./AvailabilityDayRow";
import { AvailabilityChangeRequestModal } from "./AvailabilityChangeRequestModal";
import { AvailabilityWeekBanner } from "./AvailabilityWeekBanner";

type DayState = "saving" | "error";

function withoutDates<T>(current: Record<string, T>, dates: string[]) {
  if (!dates.some((date) => date in current)) return current;
  const copy = { ...current };
  for (const date of dates) delete copy[date];
  return copy;
}

export function AvailabilityWeekEditor({
  weekStart,
  trainerId,
  hasTemplate = true,
  onOpenTemplate,
  ownerMode = false,
  isSelf = false,
  onChanged,
}: {
  weekStart: string;
  trainerId?: number;
  hasTemplate?: boolean;
  onOpenTemplate?: () => void;
  /** The owner edits a trainer's week: locked weeks change directly, without requests or confirmation. */
  ownerMode?: boolean;
  /** With `ownerMode`: the owner edits their own hours (an owner who also trains). */
  isSelf?: boolean;
  /** Called after every saved change, e.g. to refresh a schedule behind the editor. */
  onChanged?: () => void;
}) {
  const [week, setWeek] = useState<AvailabilityWeek | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, DayDraft>>({});
  const [dayStates, setDayStates] = useState<Record<string, DayState>>({});
  const [dayErrors, setDayErrors] = useState<Record<string, string>>({});
  const [decision, setDecision] = useState<AvailabilityChangeRequest | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const weekRef = useRef<AvailabilityWeek | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  const onChangedRef = useRef(onChanged);
  const today = studioToday();

  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  const applyWeek = useCallback((next: AvailabilityWeek) => {
    weekRef.current = next;
    setWeek(next);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getAvailabilityWeek(weekStart, trainerId, controller.signal)
      .then(applyWeek)
      .catch((error) => {
        if (!isAbortError(error)) setLoadError(getErrorMessage(error, "Nie udało się wczytać tygodnia. Spróbuj ponownie."));
      });
    return () => controller.abort();
  }, [weekStart, trainerId, attempt, applyWeek]);

  // After the owner decides, the trainer should see the outcome here, not only in a notification.
  const lockedWithoutRequest = Boolean(!ownerMode && week?.isLocked && !week.hasPendingChangeRequest);
  useEffect(() => {
    if (!lockedWithoutRequest) return;
    const controller = new AbortController();
    getAvailabilityChangeRequests({ trainerId }, controller.signal)
      .then((requests) => setDecision(requests.find((request) => request.weekStart === weekStart && (request.status === "Approved" || request.status === "Rejected")) ?? null))
      .catch(() => { /* The decision is extra context; the week itself is already shown. */ });
    return () => controller.abort();
  }, [lockedWithoutRequest, weekStart, trainerId]);

  const reload = useCallback(async () => {
    try {
      applyWeek(await getAvailabilityWeek(weekStart, trainerId));
      setDrafts({});
      setDayStates({});
      setDayErrors({});
    } catch (error) {
      if (!isAbortError(error)) setAttempt((value) => value + 1);
    }
  }, [weekStart, trainerId, applyWeek]);

  const save = useCallback((changes: { date: string; draft: DayDraft }[]) => {
    const dates = changes.map((change) => change.date);
    setDayStates((current) => ({ ...current, ...Object.fromEntries(dates.map((date) => [date, "saving" as const])) }));
    queueRef.current = queueRef.current.then(async () => {
      try {
        const next = await saveAvailabilityWeek(weekStart, changes.map((change) => ({ date: change.date, ...toDayPayload(change.draft) })), trainerId);
        if (!mountedRef.current) return;
        applyWeek(next);
        setDrafts((current) => {
          const copy = { ...current };
          for (const change of changes) if (copy[change.date] && sameDraft(copy[change.date], change.draft)) delete copy[change.date];
          return copy;
        });
        setDayStates((current) => withoutDates(current, dates));
        setDayErrors((current) => withoutDates(current, dates));
        onChangedRef.current?.();
      } catch (error) {
        if (!mountedRef.current || isAbortError(error)) return;
        if (getAvailabilityErrorCode(error) === "AvailabilityWeekLocked") {
          showAppInfo(getAvailabilityErrorMessage(error) ?? "Ten tydzień jest już zablokowany.");
          await reload();
          return;
        }
        // A validation error names its day: show it on that row instead of a toast.
        const details = getAvailabilityError(error);
        const day = details?.date && dates.includes(details.date) ? details.date : null;
        setDayStates((current) => ({ ...current, ...Object.fromEntries(dates.map((date) => [date, "error" as const])) }));
        if (day && details?.message) setDayErrors((current) => ({ ...current, [day]: details.message as string }));
        else showAppError(error, "Nie udało się zapisać godzin. Spróbuj ponownie.");
      }
    });
  }, [weekStart, trainerId, applyWeek, reload]);

  const commit = useCallback((date: string, draft: DayDraft) => {
    const day = weekRef.current?.days.find((item) => item.date === date);
    if (!day) return;
    // Back to what is saved: nothing to send, and an earlier failed save no longer matters.
    if (sameDraft(dayDraft(day), draft)) {
      setDrafts((current) => withoutDates(current, [date]));
      setDayStates((current) => (current[date] === "error" ? withoutDates(current, [date]) : current));
      setDayErrors((current) => withoutDates(current, [date]));
      return;
    }
    save([{ date, draft }]);
  }, [save]);

  if (loadError) return <RetryNotice text={loadError} onRetry={() => { setLoadError(null); setAttempt((value) => value + 1); }} />;
  if (!week || week.weekStart !== weekStart) return <WeekSkeleton />;

  const editable = week.canEdit && (!week.isLocked || ownerMode);
  const draftFor = (day: AvailabilityWeekDay) => drafts[day.date] ?? dayDraft(day);
  const isPast = (day: AvailabilityWeekDay) => day.date < today;
  const unsaved = Object.entries(drafts).some(([date, draft]) => dayStates[date] === "error" || !isDraftComplete(draft));
  const lastEditable = [...week.days].reverse().find((day) => !isPast(day));

  async function confirmWeek() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await queueRef.current;
      applyWeek(await submitAvailabilityWeek(weekStart, trainerId));
      setDrafts({});
      setConfirmOpen(false);
      showAppSuccess("Tydzień potwierdzony");
    } catch (error) {
      const known = getAvailabilityErrorMessage(error);
      setSubmitError(known ?? getErrorMessage(error, "Nie udało się potwierdzić tygodnia. Spróbuj ponownie."));
      if (known) void reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest() {
    const id = week?.pendingChangeRequest?.id;
    if (!id) return;
    setCancelling(true);
    try {
      await cancelAvailabilityChangeRequest(id);
      setCancelOpen(false);
      showAppSuccess("Prośba o zmianę wycofana");
      await reload();
    } catch (error) {
      showAppError(error, getAvailabilityErrorMessage(error) ?? "Nie udało się wycofać prośby. Spróbuj ponownie.");
      if (getAvailabilityErrorCode(error)) { setCancelOpen(false); void reload(); }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-4">
      <AvailabilityWeekBanner
        week={week}
        ownerMode={ownerMode}
        isSelf={isSelf}
        decision={lockedWithoutRequest ? decision : null}
        canConfirm={editable && !week.isLocked && week.canSubmit}
        onConfirm={() => {
          if (unsaved) return showAppInfo("Popraw godziny w zaznaczonych dniach, zanim potwierdzisz tydzień.");
          setSubmitError(null);
          setConfirmOpen(true);
        }}
        onRequestChange={() => setRequestOpen(true)}
        onCancelRequest={() => setCancelOpen(true)}
      />

      {!hasTemplate && editable && onOpenTemplate ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-on-surface-variant">
            Ustaw stały grafik — wtedy co tydzień wystarczy, że go potwierdzisz albo zmienisz pojedyncze dni.
          </p>
          <Button type="button" variant="secondary" size="sm" icon={<Repeat size={15} className="text-primary-light" />} onClick={onOpenTemplate}>
            Ustaw stały grafik
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        {week.days.map((day) => {
          const label = formatDayLabel(day.date);
          const draft = draftFor(day);
          const past = isPast(day);
          const readOnly = !editable || past;
          const canCopy = !readOnly && isDraftComplete(draft) && lastEditable && lastEditable.date !== day.date;
          return (
            <AvailabilityDayRow
              key={day.date}
              weekday={label.weekday}
              dateLabel={`${label.day} ${label.month}`}
              isToday={day.date === today}
              draft={draft}
              templateRanges={day.templateRanges}
              modes={WEEK_DAY_MODES}
              readOnly={readOnly}
              note={past && editable ? "Dzień minął" : undefined}
              saveState={dayStates[day.date] ?? null}
              errorMessage={dayErrors[day.date]}
              onRetry={() => save([{ date: day.date, draft }])}
              onChange={(next) => setDrafts((current) => ({ ...current, [day.date]: next }))}
              onCommit={(next) => commit(day.date, next)}
              action={canCopy ? (
                <CopyToNextDaysButton weekday={label.weekday} onCopy={() => {
                  const targets = week.days.filter((item) => item.date > day.date && !isPast(item));
                  setDrafts((current) => ({ ...current, ...Object.fromEntries(targets.map((item) => [item.date, draft])) }));
                  save(targets.map((item) => ({ date: item.date, draft })));
                  showAppInfo("Godziny skopiowane na kolejne dni tygodnia");
                }} />
              ) : null}
            />
          );
        })}
      </div>

      <div className="flex flex-col gap-2 text-xs leading-5 text-on-surface-muted sm:flex-row sm:items-center sm:justify-between">
        <p>„Jak zwykle” to godziny ze stałego grafiku. Zmiany w dniach zapisują się od razu.</p>
        {onOpenTemplate ? (
          <button type="button" onClick={onOpenTemplate} className="self-start font-semibold text-primary-light hover:underline sm:self-auto">
            Zmień stały grafik
          </button>
        ) : null}
      </div>

      {confirmOpen ? (
        <ConfirmDialog
          title="Potwierdzić tydzień?"
          description={!ownerMode
            ? "Po potwierdzeniu zmiany w tym tygodniu zgłosisz już tylko właścicielowi."
            : isSelf
              ? "W grafiku będzie widać, że te godziny są aktualne. Jako właściciel nadal możesz je zmieniać."
              : "Tydzień trenera będzie potwierdzony, a trener zmieni go już tylko przez prośbę. Ty nadal możesz go zmieniać."}
          confirmLabel="Potwierdź tydzień"
          busyLabel="Potwierdzam…"
          icon={<CalendarCheck2 size={20} />}
          busy={submitting}
          error={submitError}
          onConfirm={() => void confirmWeek()}
          onClose={() => setConfirmOpen(false)}
        >
          <ul className="space-y-1.5 rounded-[var(--radius-lg)] bg-surface-container-low p-3 text-sm">
            {week.days.map((day) => {
              const label = formatDayLabel(day.date);
              const ranges = draftRanges(draftFor(day), day.templateRanges);
              return (
                <li key={day.date} className="flex justify-between gap-3">
                  <span className="text-on-surface-variant">{label.weekday} {label.day} {label.month}</span>
                  <span className={`text-right tabular-nums ${ranges.length ? "font-semibold text-on-surface" : "text-on-surface-muted"}`}>
                    {ranges.length ? formatRanges(ranges) : "Brak dyspozycji"}
                  </span>
                </li>
              );
            })}
          </ul>
        </ConfirmDialog>
      ) : null}

      {requestOpen ? (
        <AvailabilityChangeRequestModal
          week={week}
          today={today}
          onClose={() => setRequestOpen(false)}
          onSent={() => { setRequestOpen(false); void reload(); }}
        />
      ) : null}

      {cancelOpen ? (
        <ConfirmDialog
          title="Wycofać prośbę o zmianę?"
          description="Tydzień zostanie z dotychczasowymi godzinami."
          confirmLabel="Wycofaj prośbę"
          busyLabel="Wycofuję…"
          tone="danger"
          busy={cancelling}
          onConfirm={() => void cancelRequest()}
          onClose={() => setCancelOpen(false)}
        />
      ) : null}
    </div>
  );
}

function WeekSkeleton() {
  return (
    <div role="status" aria-label="Wczytywanie tygodnia" className="space-y-4">
      <div className="card-shell h-24 animate-pulse bg-surface-container motion-reduce:animate-none" aria-hidden="true" />
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-[var(--radius-lg)] bg-surface-container-low motion-reduce:animate-none" />)}
      </div>
      <span className="sr-only">Wczytywanie tygodnia…</span>
    </div>
  );
}
