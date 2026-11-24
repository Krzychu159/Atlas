"use client";

import { CalendarCheck2, CheckCircle2, Clock3, Lock, MessageSquareText } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { AvailabilityChangeRequest, AvailabilityWeek, AvailabilityWeekDay } from "@/app/lib/availability";
import { formatDayLabel, formatRanges, formatStudioDateTime } from "@/app/lib/availability-time";
import { draftRanges } from "@/app/lib/availability-days";

/** The requested days of a pending request, as "czw 26 lis: 8:00–12:00 (teraz: wolne)". */
function PendingRequestSummary({ week }: { week: AvailabilityWeek }) {
  const request = week.pendingChangeRequest;
  if (!request?.days.length) return null;
  const hours = (ranges: AvailabilityWeekDay["ranges"]) => (ranges.length ? formatRanges(ranges) : "wolne");
  return (
    <div className="mt-3 space-y-1 rounded-[var(--radius-lg)] bg-surface-container-low p-3 text-sm">
      {request.days.map((change) => {
        const day = week.days.find((item) => item.date === change.date);
        const label = formatDayLabel(change.date);
        const requested = draftRanges(change, day?.templateRanges ?? []);
        const current = request.currentDays.find((item) => item.date === change.date)?.ranges ?? day?.ranges ?? [];
        return (
          <p key={change.date} className="flex flex-wrap gap-x-2">
            <span className="text-on-surface-variant">{label.weekday} {label.day} {label.month}:</span>
            <span className="font-semibold tabular-nums text-on-surface">{hours(requested)}</span>
            <span className="text-on-surface-muted">(teraz: {hours(current)})</span>
          </p>
        );
      })}
      {request.reason ? <p className="pt-1 text-on-surface-muted">Powód: {request.reason}</p> : null}
    </div>
  );
}

export function AvailabilityWeekBanner({
  week,
  ownerMode,
  decision,
  canConfirm,
  onConfirm,
  onRequestChange,
  onCancelRequest,
}: {
  week: AvailabilityWeek;
  ownerMode: boolean;
  /** The owner's latest decision on a request for this week. */
  decision: AvailabilityChangeRequest | null;
  canConfirm: boolean;
  onConfirm: () => void;
  onRequestChange: () => void;
  onCancelRequest: () => void;
}) {
  const deadline = formatStudioDateTime(week.deadlineAt);
  const decidedAt = formatStudioDateTime(decision?.decidedAt);
  // An approved request also sets `changedAfterLockAt`; mention the owner's own change only when it came later.
  const changedLater = week.changedAfterLockAt && (!decision?.decidedAt || decision.status !== "Approved"
    || Date.parse(week.changedAfterLockAt) - Date.parse(decision.decidedAt) > 60_000);
  const changedByOwner = changedLater ? formatStudioDateTime(week.changedAfterLockAt) : null;
  const pending = week.hasPendingChangeRequest;

  let tone: "open" | "done" | "locked" = "locked";
  let icon = <Lock size={20} aria-hidden="true" />;
  let title = "Tydzień zablokowany";
  let text = "Zmianę godzin możesz zgłosić właścicielowi.";
  if (!week.isLocked) {
    tone = "open";
    icon = <Clock3 size={20} aria-hidden="true" />;
    title = "Potwierdź ten tydzień";
    text = deadline ? `Termin: ${deadline}. Później zmiany zgłosisz już tylko właścicielowi.` : "Po potwierdzeniu zmiany zgłosisz już tylko właścicielowi.";
  } else if (week.status === "Submitted") {
    tone = "done";
    icon = <CheckCircle2 size={20} aria-hidden="true" />;
    title = "Tydzień potwierdzony";
    const submitted = formatStudioDateTime(week.submittedAt);
    text = `${submitted ? `Potwierdzono: ${submitted}. ` : ""}Zmianę godzin możesz zgłosić właścicielowi.`;
  } else if (week.status === "Missed") {
    title = "Termin potwierdzenia minął";
    text = "Tydzień jest zablokowany z godzinami jak poniżej. Zmianę możesz zgłosić właścicielowi.";
  }
  if (pending) {
    icon = <MessageSquareText size={20} aria-hidden="true" />;
    title = "Prośba o zmianę czeka na decyzję";
    text = week.pendingChangeRequest?.days.length
      ? "Do czasu decyzji właściciela obowiązują godziny poniżej. Prosisz o:"
      : "Do czasu decyzji właściciela obowiązują godziny poniżej.";
  }
  if (ownerMode) {
    const submitted = formatStudioDateTime(week.submittedAt);
    const direct = "Twoje zmiany zapiszą się od razu, a trener je zobaczy.";
    if (!week.isLocked) {
      title = "Trener jeszcze nie potwierdził tygodnia";
      text = `${deadline ? `Termin: ${deadline}. ` : ""}Możesz zmienić godziny, trener zobaczy je w swoim formularzu.`;
    } else if (week.status === "Submitted") {
      title = "Trener potwierdził ten tydzień";
      text = `${submitted ? `Potwierdzono: ${submitted}. ` : ""}${direct}`;
    } else {
      title = "Trener nie potwierdził tygodnia na czas";
      text = `Obowiązują godziny poniżej. ${direct}`;
    }
    if (pending) {
      title = "Trener czeka na decyzję w sprawie prośby";
      text = "Rozpatrz ją w panelu próśb o zmianę. Trener prosi o:";
    }
  }

  const toneClass = {
    open: "bg-primary/10 text-primary-light",
    done: "bg-tertiary-container/40 text-tertiary-light",
    locked: "bg-surface-container text-on-surface-variant",
  }[pending ? "locked" : tone];

  return (
    <section aria-live="polite" className="card-shell flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
      <div className="flex min-w-0 gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] ${toneClass}`}>{icon}</span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-on-surface">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">{text}</p>
          {decision && decidedAt ? (
            <p className={`mt-1 text-sm leading-6 ${decision.status === "Approved" ? "text-tertiary-light" : "text-on-surface-variant"}`}>
              {decision.status === "Approved" ? "Właściciel zaakceptował Twoją prośbę o zmianę" : "Właściciel odrzucił Twoją prośbę o zmianę"} ({decidedAt}).
              {decision.decisionNote ? <span className="block text-on-surface-muted">Notatka: {decision.decisionNote}</span> : null}
            </p>
          ) : null}
          {changedByOwner ? <p className="mt-1 text-sm leading-6 text-on-surface-muted">{ownerMode ? "Zmieniono po blokadzie" : "Właściciel zmienił ten tydzień"}: {changedByOwner}.</p> : null}
          {pending ? <PendingRequestSummary week={week} /> : null}
        </div>
      </div>
      <div className={`flex shrink-0 flex-wrap gap-2 ${ownerMode ? "hidden" : ""}`}>
        {canConfirm ? (
          <Button type="button" icon={<CalendarCheck2 size={16} />} onClick={onConfirm}>
            Potwierdź tydzień
          </Button>
        ) : null}
        {pending && week.canRequestChange ? <Button type="button" variant="secondary" onClick={onRequestChange}>Zmień prośbę</Button> : null}
        {pending && week.pendingChangeRequest?.id ? <Button type="button" variant="ghost" onClick={onCancelRequest}>Wycofaj prośbę</Button> : null}
        {!pending && week.isLocked && week.canRequestChange ? (
          <Button type="button" variant="secondary" icon={<MessageSquareText size={16} className="text-primary-light" />} onClick={onRequestChange}>
            Poproś o zmianę
          </Button>
        ) : null}
      </div>
    </section>
  );
}

