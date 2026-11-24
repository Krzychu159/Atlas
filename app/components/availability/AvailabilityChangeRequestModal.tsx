"use client";

import { useState } from "react";
import { Loader2, MessageSquareText } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextArea } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { showAppSuccess } from "@/app/components/ui/app-toast";
import { getErrorMessage } from "@/app/lib/backend";
import { createAvailabilityChangeRequest, getAvailabilityErrorMessage, type AvailabilityWeek } from "@/app/lib/availability";
import { formatDayLabel, formatWeekRange, sameRanges } from "@/app/lib/availability-time";
import { dayDraft, draftRanges, isDraftComplete, toDayPayload, type DayDraft } from "@/app/lib/availability-days";
import { AvailabilityDayRow, WEEK_DAY_MODES } from "./AvailabilityDayRow";

/** In a locked week every change goes through the owner; the form starts from the hours in force. */
export function AvailabilityChangeRequestModal({
  week,
  today,
  onClose,
  onSent,
}: {
  week: AvailabilityWeek;
  today: string;
  onClose: () => void;
  onSent: () => void;
}) {
  // "Zmień prośbę" starts from the request that is waiting, so nothing has to be typed again.
  const pending = week.pendingChangeRequest;
  const [drafts, setDrafts] = useState<Record<string, DayDraft>>(() =>
    Object.fromEntries(week.days.map((day) => {
      const requested = pending?.days.find((change) => change.date === day.date);
      return [day.date, requested && day.date >= today ? { mode: requested.mode, ranges: requested.ranges } : dayDraft(day)];
    })),
  );
  const [reason, setReason] = useState(pending?.reason ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = week.days.filter((day) => {
    const draft = drafts[day.date];
    if (day.date < today || !draft) return false;
    if (draft.mode === "Custom" && !isDraftComplete(draft)) return true;
    return !sameRanges(draftRanges(draft, day.templateRanges), day.ranges);
  });
  const incomplete = changed.some((day) => !isDraftComplete(drafts[day.date]));

  async function send() {
    if (!changed.length) return setError("Zmień godziny przynajmniej w jednym dniu.");
    if (incomplete) return setError("Popraw godziny w zaznaczonych dniach.");
    setSending(true);
    setError(null);
    try {
      await createAvailabilityChangeRequest({
        weekStart: week.weekStart,
        days: changed.map((day) => ({ date: day.date, ...toDayPayload(drafts[day.date]) })),
        reason: reason.trim() || undefined,
      });
      showAppSuccess("Prośba wysłana do właściciela");
      onSent();
    } catch (err) {
      setError(getAvailabilityErrorMessage(err) ?? getErrorMessage(err, "Nie udało się wysłać prośby. Spróbuj ponownie."));
    } finally {
      setSending(false);
    }
  }

  return (
    <ModalOverlay onClose={sending ? undefined : onClose} closeDisabled={sending}>
      <div role="dialog" aria-modal="true" aria-label="Prośba o zmianę dyspozycji"
        className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container shadow-ambient">
        <div className="p-5 pb-3 md:p-6 md:pb-4">
          <ModalHeader
            eyebrow={formatWeekRange(week.weekStart)}
            title="Prośba o zmianę"
            description={week.hasPendingChangeRequest
              ? "Nowa prośba zastąpi tę, która czeka na decyzję. Zmień dni, których dotyczy."
              : "Zmień dni, których dotyczy prośba. Właściciel zobaczy zmiany i Twój powód."}
            icon={<MessageSquareText size={20} />}
            onClose={onClose}
          />
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-4 md:px-6">
          {week.days.map((day) => {
            const label = formatDayLabel(day.date);
            const past = day.date < today;
            return (
              <AvailabilityDayRow
                key={day.date}
                weekday={label.weekday}
                dateLabel={`${label.day} ${label.month}`}
                draft={drafts[day.date]}
                templateRanges={day.templateRanges}
                modes={WEEK_DAY_MODES}
                readOnly={past}
                note={past ? "Dzień minął" : undefined}
                changed={changed.includes(day)}
                onChange={(next) => { setError(null); setDrafts((current) => ({ ...current, [day.date]: next })); }}
              />
            );
          })}
          <TextArea label="Powód (opcjonalnie)" value={reason} onChange={setReason} rows={2} maxLength={500}
            placeholder="Np. wizyta u lekarza w czwartek po południu" className="block pt-2" />
        </div>
        {error ? <p role="alert" className="px-5 pb-2 text-sm text-error-light md:px-6">{error}</p> : null}
        <ModalFooter>
          <Button type="button" variant="secondary" disabled={sending} onClick={onClose}>Anuluj</Button>
          <Button type="button" disabled={sending} icon={sending ? <Loader2 size={16} className="animate-spin" /> : undefined} onClick={() => void send()}>
            {sending ? "Wysyłam…" : changed.length ? `Wyślij prośbę (${changed.length})` : "Wyślij prośbę"}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
