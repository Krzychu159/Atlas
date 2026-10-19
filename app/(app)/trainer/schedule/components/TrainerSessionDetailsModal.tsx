"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import SessionAccordion from "@/app/components/schedule/SessionAccordion";
import GroupSessionDetails from "@/app/components/schedule/GroupSessionDetails";
import { groupSeatsLabel, isConsultationSession, isGroupTraining } from "@/app/lib/group-sessions";
import { Button } from "@/app/components/ui/button";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { getSessionStatusLabel } from "@/app/(app)/owner/schedule/session-utils";
import { sessionTrainingType, userTrainingType } from "@/app/lib/user-messages";
import type { TrainerSessionDetails } from "@/app/lib/trainer/portal";

export type TrainerSeriesActions = {
  busy: "sync" | "delete" | null;
  onRetrySync: () => Promise<void>;
  onDeleteFuture: () => Promise<boolean>;
};

export default function TrainerSessionDetailsModal({ session, onClose, onEdit, series }: { session: TrainerSessionDetails; onClose: () => void; onEdit?: () => void; series?: TrainerSeriesActions }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const participants = session.participants;
  const consultation = isConsultationSession(session);
  return (
    <ModalOverlay onClose={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Szczegóły zajęć" className="relative z-10 flex max-h-[92vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container shadow-ambient">
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <ModalHeader title={session.title || (consultation ? "Konsultacja" : "Sesja treningowa")} description={dateLabel(session.startAt) + " – " + dateLabel(session.endAt)} onClose={onClose} />
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Trener" value={session.trainerFullName || "Brak danych"} />
            <Detail label="Lokalizacja" value={session.locationName || "Brak danych"} />
            <Detail label="Status" value={getSessionStatusLabel(session.status)} />
            <Detail label="Rodzaj zajęć" value={sessionTrainingType(session)} />
            <Detail label="Uczestnicy" value={consultation ? "Bez klienta" : isGroupTraining(session) ? groupSeatsLabel(session) : numberLabel(session.participantsCount)} />
          </dl>
          {session.isLocationLimitExceeded === true ? <p className="mt-4 rounded-[var(--radius-lg)] bg-warning-container p-4 text-sm text-warning-light">Liczba uczestników przekracza limit lokalizacji.</p> : null}
          <GroupSessionDetails key={session.id + ":" + session.updatedAt} session={session} trainerAccess showSummary={false} />
          {!isGroupTraining(session) && session.note?.trim() ? <div className="mt-4"><SessionAccordion title="Opis zajęć"><p className="whitespace-pre-wrap break-words text-sm leading-6 text-on-surface-variant">{session.note}</p></SessionAccordion></div> : null}
          {!isGroupTraining(session) && !consultation ? <div className="mt-4"><SessionAccordion title="Uczestnicy" summary={Array.isArray(participants) ? participants.length + " osób" : undefined}>
          {Array.isArray(participants) ? participants.length ? <div className="grid max-h-[320px] gap-3 overflow-y-auto overscroll-contain md:grid-cols-2">
            {participants.map((participant) => <article key={participant.id} className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
              <h3 className="break-words font-semibold">{participant.clientFullName || "Uczestnik bez nazwy"}</h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <ParticipantDetail label="Obecność" value={attendanceLabel(participant.attendanceStatus)} />
                <ParticipantDetail label="Pakiet" value={participant.packageName || (participant.clientPackageId != null || participant.packageId != null ? "Pakiet bez nazwy" : "Bez pakietu")} />
                <ParticipantDetail label="Wejście z pakietu" value={booleanLabel(participant.countsAgainstPackage)} />
                <ParticipantDetail label="Rozliczono z pakietu" value={booleanLabel(participant.isCountedFromPackage)} />
                <ParticipantDetail label="Naliczono wejść" value={numberLabel(participant.sessionsCharged)} />
                {participant.plannedBillingType ? <ParticipantDetail label="Planowany rodzaj zajęć" value={userTrainingType(participant.plannedBillingType)} /> : null}
                {participant.actualBillingType ? <ParticipantDetail label="Rozliczony rodzaj zajęć" value={userTrainingType(participant.actualBillingType)} /> : null}
              </dl>
              {participant.note ? <p className="mt-3 whitespace-pre-wrap break-words text-sm text-on-surface-variant">{participant.note}</p> : null}
            </article>)}
          </div> : <p className="mt-4 text-sm text-on-surface-variant">Brak zapisanych uczestników.</p> : <p className="mt-4 text-sm text-on-surface-variant">Lista uczestników jest niedostępna.</p>}
          </SessionAccordion></div> : null}
          {(isGroupTraining(session) && (session.availableSeats != null || session.isPubliclyBookable)) || session.locationLimit > 0 ? <div className="mt-4"><SessionAccordion title="Ustawienia dodatkowe"><dl className="grid gap-3 text-sm sm:grid-cols-2">
            {isGroupTraining(session) && session.availableSeats != null ? <ParticipantDetail label="Wolne miejsca" value={numberLabel(session.availableSeats)} /> : null}
            {session.isPubliclyBookable ? <ParticipantDetail label="Zapisy" value="Publiczne" /> : null}
            {session.locationLimit > 0 ? <ParticipantDetail label="Limit lokalizacji" value={numberLabel(session.locationLimit)} /> : null}
          </dl></SessionAccordion></div> : null}
          {series ? <div className="mt-4 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
            <h3 className="font-semibold">Seria zajęć{session.recurrenceInstanceNumber ? ` · termin ${session.recurrenceInstanceNumber}` : ""}</h3>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">Te zajęcia należą do serii zapisanej w Twoim kalendarzu Outlook.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="secondary" size="sm" disabled={series.busy !== null} onClick={() => void series.onRetrySync()}>{series.busy === "sync" ? "Zapisywanie…" : "Ponów zapis serii w Outlooku"}</Button>
              <Button type="button" variant="danger" size="sm" disabled={series.busy !== null} onClick={() => setConfirmDelete(true)}>Usuń przyszłe zajęcia z serii</Button>
            </div>
          </div> : null}
          <p className="mt-5 text-sm text-on-surface-muted">{session.canEdit === true ? "Możesz edytować te zajęcia." : "Te zajęcia są dostępne tylko do podglądu."}</p>
        </div>
        <ModalFooter>{session.canEdit === true && onEdit ? <Button onClick={onEdit}>Edytuj zajęcia</Button> : null}<Button variant="secondary" onClick={onClose}>Zamknij</Button></ModalFooter>
      </div>
      {series && confirmDelete ? <ModalOverlay onClose={series.busy ? undefined : () => setConfirmDelete(false)}>
        <div role="alertdialog" aria-modal="true" className="relative w-full max-w-[480px] overflow-hidden rounded-[var(--radius-xl)] bg-surface-container shadow-ambient">
          <div className="p-5 md:p-6">
            <ModalHeader title="Usunąć przyszłe zajęcia z tej serii?" description="Zajęcia, które już się odbyły albo są rozliczone, zostaną bez zmian. Przyszłe terminy znikną też z Twojego kalendarza Outlook." icon={<Trash2 size={19} />} iconTone="danger" onClose={() => setConfirmDelete(false)} />
          </div>
          <ModalFooter>
            <Button type="button" variant="secondary" disabled={series.busy !== null} onClick={() => setConfirmDelete(false)}>Wróć</Button>
            <Button type="button" variant="danger" icon={<Trash2 size={16} />} disabled={series.busy !== null} onClick={async () => { if (await series.onDeleteFuture()) setConfirmDelete(false); }}>{series.busy === "delete" ? "Usuwanie…" : "Usuń przyszłe zajęcia"}</Button>
          </ModalFooter>
        </div>
      </ModalOverlay> : null}
    </ModalOverlay>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-low p-3"><dt className="text-label text-on-surface-muted">{label}</dt><dd className="mt-2 break-words text-sm font-semibold">{value}</dd></div>;
}
function ParticipantDetail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-on-surface-muted">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>;
}
function numberLabel(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "Brak danych";
}
function booleanLabel(value: boolean | null | undefined) {
  return typeof value === "boolean" ? value ? "Tak" : "Nie" : "Brak danych";
}
function attendanceLabel(value: string | null | undefined) {
  const labels: Record<string, string> = { present: "Obecny", attended: "Obecny", absent: "Nieobecny", noshow: "Nieobecny", excused: "Nieobecność usprawiedliwiona", cancelled: "Anulowany udział", pending: "Niepotwierdzona", unknown: "Nieokreślona", notmarked: "Nieodnotowana" };
  return value ? labels[value.toLowerCase()] || "Nieokreślona" : "Brak danych";
}
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "medium", timeStyle: "short" }).format(date) : "Brak daty";
}

