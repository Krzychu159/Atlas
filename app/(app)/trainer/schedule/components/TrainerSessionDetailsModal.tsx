"use client";

import { Button } from "@/app/components/ui/button";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { getSessionStatusLabel } from "@/app/(app)/owner/schedule/session-utils";
import { userTrainingType } from "@/app/lib/user-messages";
import type { TrainerSessionDetails } from "@/app/lib/trainer/portal";

export default function TrainerSessionDetailsModal({ session, onClose }: { session: TrainerSessionDetails; onClose: () => void }) {
  const participants = session.participants;
  return (
    <ModalOverlay onClose={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Szczegóły zajęć" className="relative z-10 flex max-h-[92vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container shadow-ambient">
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <ModalHeader title={session.title || "Sesja treningowa"} description={dateLabel(session.startAt) + " – " + dateLabel(session.endAt)} onClose={onClose} />
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Trener" value={session.trainerFullName || "Brak danych"} />
            <Detail label="Lokalizacja" value={session.locationName || "Brak danych"} />
            <Detail label="Status" value={getSessionStatusLabel(session.status)} />
            <Detail label="Rodzaj zajęć" value={userTrainingType(session.actualSessionType || session.plannedSessionType, "Brak danych")} />
            <Detail label="Uczestnicy" value={numberLabel(session.participantsCount)} />
            {session.isPubliclyBookable ? <>
              <Detail label="Limit miejsc" value={numberLabel(session.publicCapacity)} />
              <Detail label="Wolne miejsca" value={numberLabel(session.publicAvailableSpots)} />
            </> : null}
            {typeof session.locationLimit === "number" && session.locationLimit > 0 ? <Detail label="Limit lokalizacji" value={numberLabel(session.locationLimit)} /> : null}
          </dl>
          {session.isLocationLimitExceeded === true ? <p className="mt-4 rounded-[var(--radius-lg)] bg-warning-container p-4 text-sm text-warning-light">Liczba uczestników przekracza limit lokalizacji.</p> : null}
          {session.note ? <div className="mt-4 whitespace-pre-wrap rounded-[var(--radius-lg)] bg-surface-container-low p-4 text-sm text-on-surface-variant">{session.note}</div> : null}
          <h2 className="mt-6 text-section-title">Uczestnicy zajęć</h2>
          {Array.isArray(participants) ? participants.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">
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
          <p className="mt-5 text-sm text-on-surface-muted">{session.canEdit === true ? "Zmiany w istniejących zajęciach ustal z właścicielem studia." : "Te zajęcia są dostępne tylko do podglądu."}</p>
        </div>
        <ModalFooter><Button variant="secondary" onClick={onClose}>Zamknij</Button></ModalFooter>
      </div>
    </ModalOverlay>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-low p-4"><dt className="text-label text-on-surface-muted">{label}</dt><dd className="mt-2 break-words text-sm font-semibold">{value}</dd></div>;
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
