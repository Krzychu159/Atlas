"use client";

import SessionAccordion from "./SessionAccordion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { ApiError } from "@/app/lib/backend";
import { attendanceLabel, groupDateLabel, groupSeatsLabel, isCancelledParticipant, type GroupSessionFields } from "@/app/lib/group-sessions";
import { getTrainerGroupParticipantProfile, type TrainerGroupParticipantProfile } from "@/app/lib/trainer/portal";
import { trainerPaymentError } from "@/app/lib/trainer/payment-errors";

type Participant = { clientId: number; clientFullName: string | null; attendanceStatus: string | null };
type GroupDetails = GroupSessionFields & { id: number; note: string | null; isPubliclyBookable?: boolean; participants?: Participant[] | null };

export default function GroupSessionDetails({ session, trainerAccess = false, participantsOnly = false, showSummary = true, wrapParticipants = true }: { session: GroupDetails; trainerAccess?: boolean; participantsOnly?: boolean; showSummary?: boolean; wrapParticipants?: boolean }) {
  const [profile, setProfile] = useState<TrainerGroupParticipantProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const revision = useRef(0);
  useEffect(() => {
    if (session.isGroupSession !== true) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => { window.clearInterval(timer); revision.current += 1; };
  }, [session.isGroupSession]);
  if (session.isGroupSession !== true) return null;
  const rules = session.bookingRules;
  const cancellationUtc = rules?.cancellationClosesAtUtc;
  const cancellationTime = cancellationUtc ? Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(cancellationUtc) ? cancellationUtc : `${cancellationUtc}Z`) : NaN;
  async function openProfile(clientId: number) {
    const current = ++revision.current;
    setProfile(null); setProfileError(null); setLoading(true);
    try {
      const data = await getTrainerGroupParticipantProfile(session.id, clientId);
      if (current === revision.current) setProfile(data);
    } catch (error) {
      if (current === revision.current) setProfileError(error instanceof ApiError && error.status === 404
        ? "Ten uczestnik jest niedostępny lub nie masz dostępu do jego profilu."
        : trainerPaymentError(error, "Nie udało się otworzyć profilu uczestnika."));
    } finally { if (current === revision.current) setLoading(false); }
  }
  const participantContent = <>
    <div className="max-h-[320px] space-y-4 overflow-y-auto overscroll-contain">
    {session.participants ? [false, true].map(cancelled => {
      const participants = session.participants!.filter(participant => isCancelledParticipant(participant.attendanceStatus) === cancelled);
      return <section key={String(cancelled)}>
        <h3 className="text-section-title">{cancelled ? "Anulowani" : "Zapisani"}</h3>
        {participants.length ? <ul className="mt-3 grid gap-3 sm:grid-cols-2">{participants.map(participant => <li key={participant.clientId} className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
          <p className="break-words font-semibold">{participant.clientFullName || "Uczestnik bez nazwy"}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{attendanceLabel(participant.attendanceStatus)}</p>
          {trainerAccess ? <Button type="button" variant="secondary" className="mt-3" disabled={loading} onClick={() => void openProfile(participant.clientId)}>Zobacz uczestnika</Button> : <Link href={`/owner/clients/${participant.clientId}`} className="mt-3 inline-block text-sm font-semibold text-primary-light">Zobacz profil klienta</Link>}
        </li>)}</ul> : <p className="mt-2 text-sm text-on-surface-muted">{cancelled ? "Brak anulowanych zapisów." : "Brak zapisanych uczestników."}</p>}
      </section>;
    }) : <p className="text-sm text-on-surface-muted">Lista uczestników jest niedostępna.</p>}
    </div>
    {loading ? <p role="status" className="text-sm text-on-surface-variant">Otwieranie profilu uczestnika…</p> : null}
    {profileError ? <p role="alert" className="text-sm text-on-surface-variant">{profileError}</p> : null}
    {profile ? <section aria-label="Profil uczestnika" className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <h3 className="font-semibold">{profile.fullName || "Uczestnik bez nazwy"}</h3><p className="mt-2 text-sm text-on-surface-variant">{attendanceLabel(profile.attendanceStatus)}</p>
      <Button type="button" variant="secondary" className="mt-3" onClick={() => { revision.current += 1; setProfile(null); }}>Zamknij profil</Button>
    </section> : null}
  </>;
  return <section className="mt-5 space-y-4" aria-label="Szczegóły zajęć grupowych">
    {showSummary ? <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
      <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary-light">Grupowe</span>
      <span className="font-semibold">{groupSeatsLabel(session)}</span>
      {session.isFullyBooked === true ? <span className="text-sm text-on-surface-variant">Brak miejsc</span> : null}
      {session.isPubliclyBookable ? <span className="text-sm text-on-surface-variant">Publiczne zapisy</span> : null}
    </div> : null}
    {wrapParticipants ? <SessionAccordion title="Uczestnicy" summary={session.bookedSeats != null ? session.bookedSeats + " zapisanych" : undefined}>{participantContent}</SessionAccordion> : participantContent}
    {!participantsOnly && session.note?.trim() ? <TextSection title="Opis zajęć" text={session.note} /> : null}
    {!participantsOnly && (session.eventRules?.trim() || (session.isPubliclyBookable && rules)) ? <SessionAccordion title="Zasady uczestnictwa i rezerwacji">
      {session.eventRules?.trim() ? <p className="whitespace-pre-wrap break-words text-sm leading-6 text-on-surface-variant">{session.eventRules}</p> : null}
      {session.isPubliclyBookable && rules ? <>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-on-surface-muted">Zapisy do</dt><dd className="mt-1">{groupDateLabel(rules.registrationClosesAtUtc)}</dd><dd className="mt-1 text-on-surface-variant">{thresholdLabel(rules.registrationClosesBeforeMinutes)}</dd></div>
        <div><dt className="text-on-surface-muted">Anulowanie do</dt><dd className="mt-1">{groupDateLabel(rules.cancellationClosesAtUtc)}</dd><dd className="mt-1 text-on-surface-variant">{thresholdLabel(rules.cancellationClosesBeforeMinutes)}</dd></div>
      </dl>
      {rules.lateCancellationPolicy === "ContactStudio" ? <p className="mt-3 text-sm text-on-surface-variant">{now >= cancellationTime ? "Skontaktuj się ze studiem" : "Po terminie anulowania skontaktuj się ze studiem."}</p> : null}
      </> : null}
    </SessionAccordion> : null}
  </section>;
}

function TextSection({ title, text }: { title: string; text: string }) {
  return <SessionAccordion title={title}><p className="whitespace-pre-wrap break-words text-sm leading-6 text-on-surface-variant">{text}</p></SessionAccordion>;
}

function thresholdLabel(minutes: number) {
  if (!Number.isFinite(minutes)) return "";
  if (minutes === 0) return "Do rozpoczęcia zajęć";
  const amount = minutes % 1440 === 0 ? `${minutes / 1440} dni` : minutes % 60 === 0 ? `${minutes / 60} godz.` : `${minutes} min`;
  return `${amount} przed rozpoczęciem`;
}
